import type {
  Note,
  Project,
  ReferenceRecord,
  Task,
  TimelineEvent,
  WorkSession,
  WorkspaceFile,
  WorkspaceSnapshot,
} from "../../domain/workspace";

const browserStorageKey = "flowdesk.workspace.snapshot.v1";

export type WorkspacePersistenceMode = "browser" | "sqlite";

export interface WorkspaceRepository {
  readonly mode: WorkspacePersistenceMode;
  loadWorkspace: () => Promise<WorkspaceSnapshot | null>;
  saveWorkspace: (snapshot: WorkspaceSnapshot) => Promise<void>;
}

let repositoryPromise: Promise<WorkspaceRepository> | null = null;

export function getWorkspaceRepository(): Promise<WorkspaceRepository> {
  repositoryPromise ??= createWorkspaceRepository();

  return repositoryPromise;
}

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
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

    async loadWorkspace() {
      try {
        const serializedSnapshot = window.localStorage.getItem(browserStorageKey);

        if (!serializedSnapshot) {
          return null;
        }

        return JSON.parse(serializedSnapshot) as WorkspaceSnapshot;
      } catch {
        return null;
      }
    },

    async saveWorkspace(snapshot) {
      window.localStorage.setItem(browserStorageKey, JSON.stringify(snapshot));
    },
  };
}

async function createSqliteWorkspaceRepository(): Promise<WorkspaceRepository> {
  const databaseModule = await import("@tauri-apps/plugin-sql");
  const database = await databaseModule.default.load("sqlite:flowdesk.db");

  await initializeSchema(database);

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
      await database.execute("BEGIN TRANSACTION");

      try {
        await database.execute("DELETE FROM timeline_events");
        await database.execute("DELETE FROM files");
        await database.execute("DELETE FROM references_store");
        await database.execute("DELETE FROM tasks");
        await database.execute("DELETE FROM notes");
        await database.execute("DELETE FROM work_sessions");
        await database.execute("DELETE FROM projects");

        for (const project of snapshot.projects) {
          await database.execute(
            `INSERT INTO projects
              (id, title, description, created_at, updated_at, tags_json, status, is_pinned, accent, icon)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              project.id,
              project.title,
              project.description,
              project.createdAt,
              project.updatedAt,
              JSON.stringify(project.tags),
              project.status,
              project.isPinned ? 1 : 0,
              project.accent,
              project.icon,
            ],
          );
        }

        for (const session of snapshot.sessions) {
          await database.execute(
            `INSERT INTO work_sessions
              (id, project_id, title, notes, started_at, ended_at, duration_minutes)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              session.id,
              session.projectId,
              session.title,
              session.notes,
              session.startedAt,
              session.endedAt,
              session.durationMinutes,
            ],
          );
        }

        for (const note of snapshot.notes) {
          await database.execute(
            `INSERT INTO notes
              (id, project_id, title, folder, content, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [note.id, note.projectId, note.title, note.folder, note.content, note.createdAt, note.updatedAt],
          );
        }

        for (const task of snapshot.tasks) {
          await database.execute(
            `INSERT INTO tasks
              (id, project_id, title, status, priority, due_date, tags_json, linked_session_id, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              task.id,
              task.projectId,
              task.title,
              task.status,
              task.priority,
              task.dueDate,
              JSON.stringify(task.tags),
              task.linkedSessionId,
              task.createdAt,
              task.updatedAt,
            ],
          );
        }

        for (const reference of snapshot.references) {
          await database.execute(
            `INSERT INTO references_store
              (id, project_id, title, type, source, summary, tags_json, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              reference.id,
              reference.projectId,
              reference.title,
              reference.type,
              reference.source,
              reference.summary,
              JSON.stringify(reference.tags),
              reference.createdAt,
            ],
          );
        }

        for (const file of snapshot.files) {
          await database.execute(
            `INSERT INTO files
              (id, project_id, name, file_type, size_label, path, tags_json, imported_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              file.id,
              file.projectId,
              file.name,
              file.fileType,
              file.sizeLabel,
              file.path,
              JSON.stringify(file.tags),
              file.importedAt,
            ],
          );
        }

        for (const event of snapshot.timelineEvents) {
          await database.execute(
            `INSERT INTO timeline_events
              (id, project_id, type, title, description, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [event.id, event.projectId, event.type, event.title, event.description, event.createdAt],
          );
        }

        await database.execute("COMMIT");
      } catch (error) {
        await database.execute("ROLLBACK");
        throw error;
      }
    },
  };
}

async function initializeSchema(database: SqlDatabase): Promise<void> {
  await database.execute("PRAGMA foreign_keys = ON");
  await database.execute(
    `CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('active', 'archived')),
      is_pinned INTEGER NOT NULL CHECK (is_pinned IN (0, 1)),
      accent TEXT NOT NULL,
      icon TEXT NOT NULL
    )`,
  );
  await database.execute(
    `CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      folder TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`,
  );
  await database.execute(
    `CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('todo', 'in_progress', 'done', 'archived')),
      priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
      due_date TEXT,
      tags_json TEXT NOT NULL,
      linked_session_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`,
  );
  await database.execute(
    `CREATE TABLE IF NOT EXISTS work_sessions (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      notes TEXT NOT NULL,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      duration_minutes INTEGER,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`,
  );
  await database.execute(
    `CREATE TABLE IF NOT EXISTS references_store (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('paper', 'website', 'video', 'documentation', 'book')),
      source TEXT NOT NULL,
      summary TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`,
  );
  await database.execute(
    `CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'png', 'jpg', 'csv', 'txt', 'markdown')),
      size_label TEXT NOT NULL,
      path TEXT NOT NULL,
      tags_json TEXT NOT NULL,
      imported_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`,
  );
  await database.execute(
    `CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    )`,
  );
}

function parseJsonArray(value: string): string[] {
  try {
    const parsedValue = JSON.parse(value);

    return Array.isArray(parsedValue) ? parsedValue.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags: parseJsonArray(row.tags_json),
    status: row.status as Project["status"],
    isPinned: row.is_pinned === 1,
    accent: row.accent as Project["accent"],
    icon: row.icon,
  };
}

function mapNoteRow(row: NoteRow): Note {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    folder: row.folder,
    content: row.content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    status: row.status as Task["status"],
    priority: row.priority as Task["priority"],
    dueDate: row.due_date,
    tags: parseJsonArray(row.tags_json),
    linkedSessionId: row.linked_session_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSessionRow(row: SessionRow): WorkSession {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    notes: row.notes,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMinutes: row.duration_minutes,
  };
}

function mapReferenceRow(row: ReferenceRow): ReferenceRecord {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    type: row.type as ReferenceRecord["type"],
    source: row.source,
    summary: row.summary,
    tags: parseJsonArray(row.tags_json),
    createdAt: row.created_at,
  };
}

function mapFileRow(row: FileRow): WorkspaceFile {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    fileType: row.file_type as WorkspaceFile["fileType"],
    sizeLabel: row.size_label,
    path: row.path,
    tags: parseJsonArray(row.tags_json),
    importedAt: row.imported_at,
  };
}

function mapTimelineEventRow(row: TimelineEventRow): TimelineEvent {
  return {
    id: row.id,
    projectId: row.project_id,
    type: row.type as TimelineEvent["type"],
    title: row.title,
    description: row.description,
    createdAt: row.created_at,
  };
}

interface SqlDatabase {
  execute: (query: string, bindValues?: unknown[]) => Promise<unknown>;
  select: <T>(query: string, bindValues?: unknown[]) => Promise<T>;
}

interface ProjectRow {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  tags_json: string;
  status: string;
  is_pinned: number;
  accent: string;
  icon: string;
}

interface NoteRow {
  id: string;
  project_id: string;
  title: string;
  folder: string;
  content: string;
  created_at: string;
  updated_at: string;
}

interface TaskRow {
  id: string;
  project_id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  tags_json: string;
  linked_session_id: string | null;
  created_at: string;
  updated_at: string;
}

interface SessionRow {
  id: string;
  project_id: string;
  title: string;
  notes: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

interface ReferenceRow {
  id: string;
  project_id: string;
  title: string;
  type: string;
  source: string;
  summary: string;
  tags_json: string;
  created_at: string;
}

interface FileRow {
  id: string;
  project_id: string;
  name: string;
  file_type: string;
  size_label: string;
  path: string;
  tags_json: string;
  imported_at: string;
}

interface TimelineEventRow {
  id: string;
  project_id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
}
