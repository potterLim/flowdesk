import type {
  Note,
  Project,
  ReferenceRecord,
  Task,
  TimelineEvent,
  WorkSession,
  WorkspaceFile,
} from "../../domain/workspace";
import {
  toProjectAccent,
  toProjectStatus,
  toReferenceType,
  toTaskPriority,
  toTaskStatus,
  toTimelineEventType,
  toWorkspaceFileStorageMode,
  toWorkspaceFileType,
} from "../../domain/workspaceValidation";
import {
  toIsoDateString,
  toIsoDateTimeString,
  toNoteId,
  toProjectId,
  toReferenceId,
  toTaskId,
  toTimelineEventId,
  toWorkSessionId,
  toWorkspaceFileId,
  toWorkspaceFilePath,
} from "../../domain/workspaceValues";
import type {
  FileRow,
  NoteRow,
  ProjectRow,
  ReferenceRow,
  SessionRow,
  TaskRow,
  TimelineEventRow,
} from "./workspaceRepositoryTypes";

export function mapProjectRow(row: ProjectRow): Project {
  return {
    id: toProjectId(row.id),
    title: row.title,
    description: row.description,
    createdAt: toIsoDateTimeString(row.created_at),
    updatedAt: toIsoDateTimeString(row.updated_at),
    tags: parseJsonArray(row.tags_json),
    status: toProjectStatus(row.status),
    isPinned: row.is_pinned === 1,
    accent: toProjectAccent(row.accent),
    icon: row.icon,
  };
}

export function mapNoteRow(row: NoteRow): Note {
  return {
    id: toNoteId(row.id),
    projectId: toProjectId(row.project_id),
    title: row.title,
    folder: row.folder,
    content: row.content,
    createdAt: toIsoDateTimeString(row.created_at),
    updatedAt: toIsoDateTimeString(row.updated_at),
  };
}

export function mapTaskRow(row: TaskRow): Task {
  return {
    id: toTaskId(row.id),
    projectId: toProjectId(row.project_id),
    title: row.title,
    status: toTaskStatus(row.status),
    priority: toTaskPriority(row.priority),
    dueDate: row.due_date ? toIsoDateString(row.due_date) : null,
    tags: parseJsonArray(row.tags_json),
    linkedSessionId: row.linked_session_id ? toWorkSessionId(row.linked_session_id) : null,
    createdAt: toIsoDateTimeString(row.created_at),
    updatedAt: toIsoDateTimeString(row.updated_at),
  };
}

export function mapSessionRow(row: SessionRow): WorkSession {
  return {
    id: toWorkSessionId(row.id),
    projectId: toProjectId(row.project_id),
    title: row.title,
    notes: row.notes,
    startedAt: toIsoDateTimeString(row.started_at),
    endedAt: row.ended_at ? toIsoDateTimeString(row.ended_at) : null,
    durationMinutes: row.duration_minutes,
  };
}

export function mapReferenceRow(row: ReferenceRow): ReferenceRecord {
  return {
    id: toReferenceId(row.id),
    projectId: toProjectId(row.project_id),
    title: row.title,
    type: toReferenceType(row.type),
    source: row.source,
    summary: row.summary,
    tags: parseJsonArray(row.tags_json),
    createdAt: toIsoDateTimeString(row.created_at),
  };
}

export function mapFileRow(row: FileRow): WorkspaceFile {
  return {
    id: toWorkspaceFileId(row.id),
    projectId: toProjectId(row.project_id),
    name: row.name,
    fileType: toWorkspaceFileType(row.file_type),
    sizeLabel: row.size_label,
    path: toWorkspaceFilePath(row.path),
    sourcePath: row.source_path ? toWorkspaceFilePath(row.source_path) : null,
    storageMode: toWorkspaceFileStorageMode(row.storage_mode),
    tags: parseJsonArray(row.tags_json),
    importedAt: toIsoDateTimeString(row.imported_at),
  };
}

export function mapTimelineEventRow(row: TimelineEventRow): TimelineEvent {
  return {
    id: toTimelineEventId(row.id),
    projectId: toProjectId(row.project_id),
    type: toTimelineEventType(row.type),
    title: row.title,
    description: row.description,
    createdAt: toIsoDateTimeString(row.created_at),
  };
}

function parseJsonArray(value: string): string[] {
  try {
    const parsedValue: unknown = JSON.parse(value);

    return Array.isArray(parsedValue) ? parsedValue.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}
