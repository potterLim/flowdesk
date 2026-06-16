export type SqliteBindValue = string | number | boolean | null;

export interface SqlDatabase {
  execute: (query: string, bindValues?: SqliteBindValue[]) => Promise<unknown>;
  select: <T>(query: string, bindValues?: SqliteBindValue[]) => Promise<T>;
}

export type WorkspaceStatementKind =
  | "delete_timeline_events"
  | "delete_files"
  | "delete_references"
  | "delete_tasks"
  | "delete_notes"
  | "delete_sessions"
  | "delete_projects"
  | "insert_project"
  | "insert_session"
  | "insert_note"
  | "insert_task"
  | "insert_reference"
  | "insert_file"
  | "insert_timeline_event";

export interface SqliteStatement {
  kind: WorkspaceStatementKind;
  values?: SqliteBindValue[];
}

export interface ProjectRow {
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

export interface NoteRow {
  id: string;
  project_id: string;
  title: string;
  folder: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface TaskRow {
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

export interface SessionRow {
  id: string;
  project_id: string;
  title: string;
  notes: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

export interface ReferenceRow {
  id: string;
  project_id: string;
  title: string;
  type: string;
  source: string;
  summary: string;
  tags_json: string;
  created_at: string;
}

export interface FileRow {
  id: string;
  project_id: string;
  name: string;
  file_type: string;
  size_label: string;
  path: string;
  source_path: string | null;
  storage_mode: string;
  tags_json: string;
  imported_at: string;
}

export interface TimelineEventRow {
  id: string;
  project_id: string;
  type: string;
  title: string;
  description: string;
  created_at: string;
}
