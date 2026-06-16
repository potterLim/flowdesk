import type { WorkspaceSnapshot } from "../../domain/workspace";
import { isTauriRuntime } from "../platform/tauriRuntime";
import {
  mapFileRow,
  mapNoteRow,
  mapProjectRow,
  mapReferenceRow,
  mapSessionRow,
  mapTaskRow,
  mapTimelineEventRow,
} from "./workspaceRowMappers";
import { buildWorkspaceSaveStatements } from "./workspaceSaveStatements";
import { initializeWorkspaceSchema } from "./workspaceSchema";
import { normalizeWorkspaceSnapshot } from "./workspaceSnapshotNormalizer";
import type {
  FileRow,
  NoteRow,
  ProjectRow,
  ReferenceRow,
  SessionRow,
  SqliteStatement,
  TaskRow,
  TimelineEventRow,
} from "./workspaceRepositoryTypes";

const browserStorageKey = "flowdesk.workspace.snapshot.v1";

export type WorkspacePersistenceMode = "browser" | "sqlite";

export interface WorkspaceRepository {
  readonly mode: WorkspacePersistenceMode;
  loadWorkspace: () => Promise<WorkspaceSnapshot | null>;
  saveWorkspace: (snapshot: WorkspaceSnapshot) => Promise<void>;
}

export { initializeWorkspaceSchema } from "./workspaceSchema";
export { normalizeWorkspaceSnapshot } from "./workspaceSnapshotNormalizer";
export type { SqlDatabase } from "./workspaceRepositoryTypes";

let repositoryPromise: Promise<WorkspaceRepository> | null = null;

export function getWorkspaceRepository(): Promise<WorkspaceRepository> {
  repositoryPromise ??= createWorkspaceRepository().catch((error: unknown) => {
    repositoryPromise = null;
    throw error;
  });

  return repositoryPromise;
}

export async function resetWorkspaceRepositoryStorage(): Promise<void> {
  repositoryPromise = null;

  if (!isTauriRuntime()) {
    window.localStorage.removeItem(browserStorageKey);
    return;
  }

  const { invoke } = await import("@tauri-apps/api/core");
  const databaseUrl = await getWorkspaceDatabaseUrl();

  await invoke("reset_workspace_database", { databaseUrl });
}

async function createWorkspaceRepository(): Promise<WorkspaceRepository> {
  if (isTauriRuntime()) {
    return createSqliteWorkspaceRepository();
  }

  return createBrowserWorkspaceRepository();
}

function createBrowserWorkspaceRepository(): WorkspaceRepository {
  return {
    mode: "browser",

    loadWorkspace() {
      try {
        const serializedSnapshot = window.localStorage.getItem(browserStorageKey);

        if (!serializedSnapshot) {
          return Promise.resolve(null);
        }

        const parsedSnapshot: unknown = JSON.parse(serializedSnapshot);

        return Promise.resolve(normalizeWorkspaceSnapshot(parsedSnapshot));
      } catch {
        return Promise.resolve(null);
      }
    },

    saveWorkspace(snapshot) {
      window.localStorage.setItem(browserStorageKey, JSON.stringify(snapshot));

      return Promise.resolve();
    },
  };
}

async function createSqliteWorkspaceRepository(): Promise<WorkspaceRepository> {
  await ensureSqliteDirectory();

  const databaseModule = await import("@tauri-apps/plugin-sql");
  const databaseUrl = await getWorkspaceDatabaseUrl();
  const database = await databaseModule.default.load(databaseUrl);

  await initializeWorkspaceSchema(database);

  return {
    mode: "sqlite",

    async loadWorkspace() {
      const [projects, notes, tasks, sessions, references, files, timelineEvents] = await Promise.all([
        database.select<ProjectRow[]>("SELECT * FROM projects ORDER BY is_pinned DESC, updated_at DESC"),
        database.select<NoteRow[]>("SELECT * FROM notes ORDER BY updated_at DESC"),
        database.select<TaskRow[]>("SELECT * FROM tasks ORDER BY updated_at DESC"),
        database.select<SessionRow[]>("SELECT * FROM work_sessions ORDER BY started_at DESC"),
        database.select<ReferenceRow[]>("SELECT * FROM references_store ORDER BY created_at DESC"),
        database.select<FileRow[]>("SELECT * FROM files ORDER BY imported_at DESC"),
        database.select<TimelineEventRow[]>("SELECT * FROM timeline_events ORDER BY created_at DESC"),
      ]);

      if (projects.length === 0) {
        return null;
      }

      return {
        projects: projects.map(mapProjectRow),
        notes: notes.map(mapNoteRow),
        tasks: tasks.map(mapTaskRow),
        sessions: sessions.map(mapSessionRow),
        references: references.map(mapReferenceRow),
        files: files.map(mapFileRow),
        timelineEvents: timelineEvents.map(mapTimelineEventRow),
      };
    },

    async saveWorkspace(snapshot) {
      await executeWorkspaceSave(databaseUrl, buildWorkspaceSaveStatements(snapshot));
    },
  };
}

async function ensureSqliteDirectory(): Promise<void> {
  const [{ appConfigDir }, { mkdir }] = await Promise.all([
    import("@tauri-apps/api/path"),
    import("@tauri-apps/plugin-fs"),
  ]);

  await mkdir(await appConfigDir(), { recursive: true }).catch(() => undefined);
}

async function getWorkspaceDatabaseUrl(): Promise<string> {
  const { invoke } = await import("@tauri-apps/api/core");

  return invoke<string>("get_workspace_database_url");
}

async function executeWorkspaceSave(databaseUrl: string, statements: SqliteStatement[]): Promise<void> {
  const { invoke } = await import("@tauri-apps/api/core");

  await invoke("execute_workspace_transaction", { databaseUrl, statements });
}
