import type {
  ProjectAccent,
  ProjectStatus,
  ReferenceType,
  TaskPriority,
  TaskStatus,
  TimelineEventType,
  WorkspaceFileStorageMode,
  WorkspaceFileType,
} from "./workspace";

const projectStatuses = ["active", "archived"] as const satisfies readonly ProjectStatus[];
const projectAccents = ["teal", "blue", "violet", "amber", "rose"] as const satisfies readonly ProjectAccent[];
const taskStatuses = ["todo", "in_progress", "done", "archived"] as const satisfies readonly TaskStatus[];
const taskPriorities = ["low", "medium", "high", "urgent"] as const satisfies readonly TaskPriority[];
const referenceTypes = [
  "paper",
  "website",
  "video",
  "documentation",
  "book",
] as const satisfies readonly ReferenceType[];
const workspaceFileTypes = [
  "pdf",
  "png",
  "jpg",
  "csv",
  "txt",
  "markdown",
] as const satisfies readonly WorkspaceFileType[];
const workspaceFileStorageModes = ["managed", "linked"] as const satisfies readonly WorkspaceFileStorageMode[];
const timelineEventTypes = [
  "project_created",
  "note_created",
  "task_completed",
  "session_finished",
  "file_imported",
  "export_generated",
] as const satisfies readonly TimelineEventType[];

function readEnumValue<Value extends string>(value: string, allowedValues: readonly Value[], label: string): Value {
  const normalizedValue = value.trim();

  if (isEnumValue(normalizedValue, allowedValues)) {
    return normalizedValue;
  }

  throw new Error(`FlowDesk expected a valid ${label}, received "${value}".`);
}

function readEnumValueOrDefault<Value extends string>(
  value: string,
  allowedValues: readonly Value[],
  fallbackValue: Value,
): Value {
  const normalizedValue = value.trim();

  return isEnumValue(normalizedValue, allowedValues) ? normalizedValue : fallbackValue;
}

function isEnumValue<Value extends string>(value: string, allowedValues: readonly Value[]): value is Value {
  return allowedValues.some((allowedValue) => allowedValue === value);
}

export function toProjectStatus(value: string): ProjectStatus {
  return readEnumValue(value, projectStatuses, "project status");
}

export function readProjectStatus(value: string): ProjectStatus {
  return readEnumValueOrDefault(value, projectStatuses, "active");
}

export function toProjectAccent(value: string): ProjectAccent {
  return readEnumValue(value, projectAccents, "project accent");
}

export function readProjectAccent(value: string): ProjectAccent {
  return readEnumValueOrDefault(value, projectAccents, "teal");
}

export function toTaskStatus(value: string): TaskStatus {
  return readEnumValue(value, taskStatuses, "task status");
}

export function readTaskStatus(value: string): TaskStatus {
  return readEnumValueOrDefault(value, taskStatuses, "todo");
}

export function toTaskPriority(value: string): TaskPriority {
  return readEnumValue(value, taskPriorities, "task priority");
}

export function readTaskPriority(value: string): TaskPriority {
  return readEnumValueOrDefault(value, taskPriorities, "medium");
}

export function toReferenceType(value: string): ReferenceType {
  return readEnumValue(value, referenceTypes, "reference type");
}

export function readReferenceType(value: string): ReferenceType {
  return readEnumValueOrDefault(value, referenceTypes, "paper");
}

export function toWorkspaceFileType(value: string): WorkspaceFileType {
  return readEnumValue(value, workspaceFileTypes, "workspace file type");
}

export function readWorkspaceFileType(value: string): WorkspaceFileType {
  return readEnumValueOrDefault(value, workspaceFileTypes, "pdf");
}

export function toWorkspaceFileStorageMode(value: string): WorkspaceFileStorageMode {
  return readEnumValue(value, workspaceFileStorageModes, "workspace file storage mode");
}

export function readWorkspaceFileStorageMode(value: string): WorkspaceFileStorageMode {
  return readEnumValueOrDefault(value, workspaceFileStorageModes, "linked");
}

export function toTimelineEventType(value: string): TimelineEventType {
  return readEnumValue(value, timelineEventTypes, "timeline event type");
}

export function readTimelineEventType(value: string): TimelineEventType {
  return readEnumValueOrDefault(value, timelineEventTypes, "project_created");
}
