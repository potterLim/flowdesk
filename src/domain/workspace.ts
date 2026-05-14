export type ProjectStatus = "active" | "archived";

export type ProjectAccent = "teal" | "blue" | "violet" | "amber" | "rose";

export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  status: ProjectStatus;
  isPinned: boolean;
  accent: ProjectAccent;
  icon: string;
}

export interface Note {
  id: string;
  projectId: string;
  title: string;
  folder: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export type TaskStatus = "todo" | "in_progress" | "done" | "archived";

export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  tags: string[];
  linkedSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  projectId: string;
  title: string;
  notes: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
}

export type ReferenceType = "paper" | "website" | "video" | "documentation" | "book";

export interface ReferenceRecord {
  id: string;
  projectId: string;
  title: string;
  type: ReferenceType;
  source: string;
  summary: string;
  tags: string[];
  createdAt: string;
}

export type WorkspaceFileType = "pdf" | "png" | "jpg" | "csv" | "txt" | "markdown";

export interface WorkspaceFile {
  id: string;
  projectId: string;
  name: string;
  fileType: WorkspaceFileType;
  sizeLabel: string;
  path: string;
  tags: string[];
  importedAt: string;
}

export type TimelineEventType =
  | "project_created"
  | "note_created"
  | "task_completed"
  | "session_finished"
  | "file_imported"
  | "export_generated";

export interface TimelineEvent {
  id: string;
  projectId: string;
  type: TimelineEventType;
  title: string;
  description: string;
  createdAt: string;
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

export type WorkspaceView =
  | "overview"
  | "notes"
  | "tasks"
  | "sessions"
  | "references"
  | "files"
  | "timeline"
  | "exports";
