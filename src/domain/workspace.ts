declare const workspaceBrand: unique symbol;

type WorkspaceBrand<Value, Name extends string> = Value & { readonly [workspaceBrand]: Name };

export type ProjectId = WorkspaceBrand<string, "ProjectId">;
export type NoteId = WorkspaceBrand<string, "NoteId">;
export type TaskId = WorkspaceBrand<string, "TaskId">;
export type WorkSessionId = WorkspaceBrand<string, "WorkSessionId">;
export type ReferenceId = WorkspaceBrand<string, "ReferenceId">;
export type WorkspaceFileId = WorkspaceBrand<string, "WorkspaceFileId">;
export type TimelineEventId = WorkspaceBrand<string, "TimelineEventId">;
export type IsoDateTimeString = WorkspaceBrand<string, "IsoDateTimeString">;
export type IsoDateString = WorkspaceBrand<string, "IsoDateString">;
export type WorkspaceFilePath = WorkspaceBrand<string, "WorkspaceFilePath">;

export type ProjectStatus = "active" | "archived";

export type ProjectAccent = "teal" | "blue" | "violet" | "amber" | "rose";

export interface Project {
  id: ProjectId;
  title: string;
  description: string;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
  tags: string[];
  status: ProjectStatus;
  isPinned: boolean;
  accent: ProjectAccent;
  icon: string;
}

export interface Note {
  id: NoteId;
  projectId: ProjectId;
  title: string;
  folder: string;
  content: string;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export type TaskStatus = "todo" | "in_progress" | "done" | "archived";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: TaskId;
  projectId: ProjectId;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: IsoDateString | null;
  tags: string[];
  linkedSessionId: WorkSessionId | null;
  createdAt: IsoDateTimeString;
  updatedAt: IsoDateTimeString;
}

export interface WorkSession {
  id: WorkSessionId;
  projectId: ProjectId;
  title: string;
  notes: string;
  startedAt: IsoDateTimeString;
  endedAt: IsoDateTimeString | null;
  durationMinutes: number | null;
}

export type ReferenceType = "paper" | "website" | "video" | "documentation" | "book";

export interface ReferenceRecord {
  id: ReferenceId;
  projectId: ProjectId;
  title: string;
  type: ReferenceType;
  source: string;
  summary: string;
  tags: string[];
  createdAt: IsoDateTimeString;
}

export type WorkspaceFileType = "pdf" | "png" | "jpg" | "csv" | "txt" | "markdown";

export type WorkspaceFileStorageMode = "managed" | "linked";

export interface WorkspaceFile {
  id: WorkspaceFileId;
  projectId: ProjectId;
  name: string;
  fileType: WorkspaceFileType;
  sizeLabel: string;
  path: WorkspaceFilePath;
  sourcePath: WorkspaceFilePath | null;
  storageMode: WorkspaceFileStorageMode;
  tags: string[];
  importedAt: IsoDateTimeString;
}

export type TimelineEventType =
  | "project_created"
  | "note_created"
  | "task_completed"
  | "session_finished"
  | "file_imported"
  | "export_generated";

export interface TimelineEvent {
  id: TimelineEventId;
  projectId: ProjectId;
  type: TimelineEventType;
  title: string;
  description: string;
  createdAt: IsoDateTimeString;
}

export interface WorkspaceSnapshot {
  projects: Project[];
  notes: Note[];
  tasks: Task[];
  sessions: WorkSession[];
  references: ReferenceRecord[];
  files: WorkspaceFile[];
  timelineEvents: TimelineEvent[];
}

export type WorkspaceView = "overview" | "notes" | "tasks" | "sessions" | "files" | "timeline" | "exports";
