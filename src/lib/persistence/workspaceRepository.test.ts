import { describe, expect, it } from "vitest";
import { readWorkspaceBackup } from "../workspaceBackup";
import type { SqlDatabase } from "./workspaceRepository";
import { initializeWorkspaceSchema, normalizeWorkspaceSnapshot } from "./workspaceRepository";

class InMemorySchemaDatabase implements SqlDatabase {
  readonly executedQueries: string[] = [];
  private userVersion: number;
  private hasFilesTable: boolean;
  private readonly tableColumns = new Map<string, Set<string>>();

  constructor({
    userVersion = 0,
    fileColumns = [],
  }: {
    userVersion?: number;
    fileColumns?: string[];
  } = {}) {
    this.userVersion = userVersion;
    this.hasFilesTable = fileColumns.length > 0;
    this.tableColumns.set("files", new Set(fileColumns));
  }

  async execute(query: string): Promise<unknown> {
    this.executedQueries.push(query);

    if (query.startsWith("CREATE TABLE IF NOT EXISTS files")) {
      if (this.hasFilesTable) {
        return undefined;
      }

      this.hasFilesTable = true;
      this.tableColumns.set(
        "files",
        new Set([
          "id",
          "project_id",
          "name",
          "file_type",
          "size_label",
          "path",
          "source_path",
          "storage_mode",
          "tags_json",
          "imported_at",
        ]),
      );
      return undefined;
    }

    if (query.includes("ADD COLUMN source_path")) {
      this.tableColumns.get("files")?.add("source_path");
      return undefined;
    }

    if (query.includes("ADD COLUMN storage_mode")) {
      this.tableColumns.get("files")?.add("storage_mode");
      return undefined;
    }

    if (query.startsWith("PRAGMA user_version =")) {
      this.userVersion = Number.parseInt(query.replace("PRAGMA user_version =", "").trim(), 10);
    }

    return undefined;
  }

  async select<T>(query: string): Promise<T> {
    if (query === "PRAGMA user_version") {
      return [{ user_version: this.userVersion }] as T;
    }

    if (query === "PRAGMA table_info(files)") {
      const columns = Array.from(this.tableColumns.get("files") ?? []).map((name) => ({ name }));

      return columns as T;
    }

    return [] as T;
  }
}

class UppercaseTableInfoDatabase extends InMemorySchemaDatabase {
  async select<T>(query: string): Promise<T> {
    const rows = await super.select<unknown[]>(query);

    if (query === "PRAGMA table_info(files)") {
      return rows.map((row) =>
        typeof row === "object" && row !== null && "name" in row ? { Name: row.name } : row,
      ) as T;
    }

    return rows as T;
  }
}

describe("workspaceRepository schema migrations", () => {
  it("initializes the current SQLite schema with durable file storage fields", async () => {
    const database = new InMemorySchemaDatabase();

    await initializeWorkspaceSchema(database);

    expect(database.executedQueries).toContain("BEGIN TRANSACTION");
    expect(database.executedQueries).toContain("COMMIT");
    expect(database.executedQueries.some((query) => query.includes("source_path TEXT"))).toBe(true);
    expect(database.executedQueries.some((query) => query.includes("storage_mode TEXT NOT NULL DEFAULT 'linked'"))).toBe(true);
    expect(database.executedQueries).toContain("PRAGMA user_version = 2");
  });

  it("migrates v1 file tables without touching existing rows", async () => {
    const database = new InMemorySchemaDatabase({
      userVersion: 1,
      fileColumns: ["id", "project_id", "name", "file_type", "size_label", "path", "tags_json", "imported_at"],
    });

    await initializeWorkspaceSchema(database);

    expect(database.executedQueries).toContain("ALTER TABLE files ADD COLUMN source_path TEXT");
    expect(database.executedQueries).toContain("ALTER TABLE files ADD COLUMN storage_mode TEXT NOT NULL DEFAULT 'linked'");
    expect(database.executedQueries).toContain("PRAGMA user_version = 2");
  });

  it("recognizes SQLite table info rows returned with driver-specific casing", async () => {
    const database = new UppercaseTableInfoDatabase({
      userVersion: 1,
      fileColumns: [
        "id",
        "project_id",
        "name",
        "file_type",
        "size_label",
        "path",
        "source_path",
        "storage_mode",
        "tags_json",
        "imported_at",
      ],
    });

    await initializeWorkspaceSchema(database);

    expect(database.executedQueries).not.toContain("ALTER TABLE files ADD COLUMN source_path TEXT");
    expect(database.executedQueries).not.toContain("ALTER TABLE files ADD COLUMN storage_mode TEXT NOT NULL DEFAULT 'linked'");
    expect(database.executedQueries).toContain("PRAGMA user_version = 2");
  });

  it("rejects workspaces created by newer app versions", async () => {
    const database = new InMemorySchemaDatabase({ userVersion: 99 });

    await expect(initializeWorkspaceSchema(database)).rejects.toThrow("newer version");
    expect(database.executedQueries).not.toContain("BEGIN TRANSACTION");
  });
});

describe("workspaceRepository backup normalization", () => {
  it("normalizes pre-managed-file backups as linked files", () => {
    const snapshot = normalizeWorkspaceSnapshot({
      projects: [
        {
          id: "project-1",
          title: "Retina Organoid",
        },
      ],
      files: [
        {
          id: "file-1",
          projectId: "project-1",
          name: "paper.pdf",
          fileType: "pdf",
          sizeLabel: "1.2 MB",
          path: "/Users/example/paper.pdf",
          tags: [],
          importedAt: "2026-05-15T00:00:00.000Z",
        },
      ],
    });

    expect(snapshot?.files[0]).toMatchObject({
      sourcePath: null,
      storageMode: "linked",
    });
  });

  it("reads valid workspace backup files and rejects unrelated JSON", () => {
    const backup = readWorkspaceBackup(
      JSON.stringify({
        projects: [
          {
            id: "project-1",
            title: "Computer Vision",
          },
        ],
        notes: [],
        tasks: [],
        sessions: [],
        references: [],
        files: [],
        timelineEvents: [],
      }),
    );

    expect(backup.projects[0].title).toBe("Computer Vision");
    expect(() => readWorkspaceBackup(JSON.stringify({ projects: [] }))).toThrow("valid FlowDesk backup");
  });
});
