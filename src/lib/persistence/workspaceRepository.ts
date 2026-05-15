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
import { isTauriRuntime } from "../tauriRuntime";

const browserStorageKey = "flowdesk.workspace.snapshot.v1";
const workspaceSchemaVersion = 1;

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

        return normalizeWorkspaceSnapshot(JSON.parse(serializedSnapshot));
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
  await database.execute("PRAGMA journal_mode = WAL");
  await database.execute("PRAGMA synchronous = NORMAL");
  const versionRows = await database.select<SchemaVersionRow[]>("PRAGMA user_version");
  const currentVersion = versionRows[0]?.user_version ?? 0;

  if (currentVersion > workspaceSchemaVersion) {
    throw new Error("This FlowDesk workspace was created by a newer version of the app.");
  }

  await database.execute("BEGIN TRANSACTION");

  try {
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
    await database.execute(`PRAGMA user_version = ${workspaceSchemaVersion}`);
    await database.execute("COMMIT");
  } catch (error) {
    await database.execute("ROLLBACK");
    throw error;
  }
}

function normalizeWorkspaceSnapshot(value: unknown): WorkspaceSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const projects = readArray(value.projects)
    .map(normalizeProject)
    .filter((project): project is Project => Boolean(project));

  if (projects.length === 0) {
    return null;
  }

  const projectIds = new Set(projects.map((project) => project.id));

  return {
    projects,
    notes: readArray(value.notes)
      .map(normalizeNote)
      .filter((note): note is Note => Boolean(note && projectIds.has(note.projectId))),
    tasks: readArray(value.tasks)
      .map(normalizeTask)
      .filter((task): task is Task => Boolean(task && projectIds.has(task.projectId))),
    sessions: readArray(value.sessions)
      .map(normalizeSession)
      .filter((session): session is WorkSession => Boolean(session && projectIds.has(session.projectId))),
    references: readArray(value.references)
      .map(normalizeReference)
      .filter((reference): reference is ReferenceRecord => Boolean(reference && projectIds.has(reference.projectId))),
    files: readArray(value.files)
      .map(normalizeFile)
      .filter((file): file is WorkspaceFile => Boolean(file && projectIds.has(file.projectId))),
    timelineEvents: readArray(value.timelineEvents)
      .map(normalizeTimelineEvent)
      .filter((event): event is TimelineEvent => Boolean(event && projectIds.has(event.projectId))),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readNullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function readNullableNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function normalizeProject(value: unknown): Project | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const title = readString(value.title).trim();

  if (!id || !title) {
    return null;
  }

  const accent = readString(value.accent);
  const status = readString(value.status);

  return {
    id,
    title,
    description: readString(value.description),
    createdAt: readString(value.createdAt, new Date().toISOString()),
    updatedAt: readString(value.updatedAt, new Date().toISOString()),
    tags: readStringArray(value.tags),
    status: status === "archived" ? "archived" : "active",
    isPinned: value.isPinned === true,
    accent: accent === "blue" || accent === "violet" || accent === "amber" || accent === "rose" ? accent : "teal",
    icon: readString(value.icon, title.slice(0, 2).toUpperCase()),
  };
}

function normalizeNote(value: unknown): Note | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);

  if (!id || !projectId) {
    return null;
  }

  return {
    id,
    projectId,
    title: readString(value.title, "Untitled note"),
    folder: readString(value.folder, "Inbox"),
    content: readString(value.content),
    createdAt: readString(value.createdAt, new Date().toISOString()),
    updatedAt: readString(value.updatedAt, new Date().toISOString()),
  };
}

function normalizeTask(value: unknown): Task | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);
  const status = readString(value.status);
  const priority = readString(value.priority);

  if (!id || !projectId) {
    return null;
  }

  return {
    id,
    projectId,
    title: readString(value.title, "Untitled task"),
    status: status === "in_progress" || status === "done" || status === "archived" ? status : "todo",
    priority: priority === "low" || priority === "high" || priority === "urgent" ? priority : "medium",
    dueDate: readNullableString(value.dueDate),
    tags: readStringArray(value.tags),
    linkedSessionId: readNullableString(value.linkedSessionId),
    createdAt: readString(value.createdAt, new Date().toISOString()),
    updatedAt: readString(value.updatedAt, new Date().toISOString()),
  };
}

function normalizeSession(value: unknown): WorkSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);

  if (!id || !projectId) {
    return null;
  }

  return {
    id,
    projectId,
    title: readString(value.title, "Focus session"),
    notes: readString(value.notes),
    startedAt: readString(value.startedAt, new Date().toISOString()),
    endedAt: readNullableString(value.endedAt),
    durationMinutes: readNullableNumber(value.durationMinutes),
  };
}

function normalizeReference(value: unknown): ReferenceRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);
  const type = readString(value.type);

  if (!id || !projectId) {
    return null;
  }

  return {
    id,
    projectId,
    title: readString(value.title, "Untitled reference"),
    type:
      type === "website" || type === "video" || type === "documentation" || type === "book"
        ? type
        : "paper",
    source: readString(value.source),
    summary: readString(value.summary),
    tags: readStringArray(value.tags),
    createdAt: readString(value.createdAt, new Date().toISOString()),
  };
}

function normalizeFile(value: unknown): WorkspaceFile | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);
  const fileType = readString(value.fileType);

  if (!id || !projectId) {
    return null;
  }

  return {
    id,
    projectId,
    name: readString(value.name, "Untitled file"),
    fileType:
      fileType === "png" || fileType === "jpg" || fileType === "csv" || fileType === "txt" || fileType === "markdown"
        ? fileType
        : "pdf",
    sizeLabel: readString(value.sizeLabel),
    path: readString(value.path),
    tags: readStringArray(value.tags),
    importedAt: readString(value.importedAt, new Date().toISOString()),
  };
}

function normalizeTimelineEvent(value: unknown): TimelineEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);
  const type = readString(value.type);

  if (!id || !projectId) {
    return null;
  }

  return {
    id,
    projectId,
    type:
      type === "note_created" ||
      type === "task_completed" ||
      type === "session_finished" ||
      type === "file_imported" ||
      type === "export_generated"
        ? type
        : "project_created",
    title: readString(value.title, "Workspace event"),
    description: readString(value.description),
    createdAt: readString(value.createdAt, new Date().toISOString()),
  };
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

interface SchemaVersionRow {
  user_version: number;
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
