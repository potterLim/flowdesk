import type {
  IsoDateString,
  IsoDateTimeString,
  NoteId,
  ProjectId,
  ReferenceId,
  TaskId,
  TimelineEventId,
  WorkSessionId,
  WorkspaceFileId,
  WorkspaceFilePath,
} from "./workspace";

const isoDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function readRequiredWorkspaceValue(value: string, label: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    throw new Error(`FlowDesk expected a ${label}.`);
  }

  return normalizedValue;
}

export function toProjectId(value: string): ProjectId {
  return readRequiredWorkspaceValue(value, "project id") as ProjectId;
}

export function toNoteId(value: string): NoteId {
  return readRequiredWorkspaceValue(value, "note id") as NoteId;
}

export function toTaskId(value: string): TaskId {
  return readRequiredWorkspaceValue(value, "task id") as TaskId;
}

export function toWorkSessionId(value: string): WorkSessionId {
  return readRequiredWorkspaceValue(value, "work session id") as WorkSessionId;
}

export function toReferenceId(value: string): ReferenceId {
  return readRequiredWorkspaceValue(value, "reference id") as ReferenceId;
}

export function toWorkspaceFileId(value: string): WorkspaceFileId {
  return readRequiredWorkspaceValue(value, "workspace file id") as WorkspaceFileId;
}

export function toTimelineEventId(value: string): TimelineEventId {
  return readRequiredWorkspaceValue(value, "timeline event id") as TimelineEventId;
}

export function toIsoDateTimeString(value: string): IsoDateTimeString {
  const normalizedValue = readRequiredWorkspaceValue(value, "ISO date-time");

  if (!isoDateTimePattern.test(normalizedValue)) {
    throw new Error(`FlowDesk expected an ISO date-time, received "${value}".`);
  }

  const parsedDate = new Date(normalizedValue);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`FlowDesk expected an ISO date-time, received "${value}".`);
  }

  const canonicalValue = normalizedValue.includes(".") ? normalizedValue : normalizedValue.replace("Z", ".000Z");

  if (parsedDate.toISOString() !== canonicalValue) {
    throw new Error(`FlowDesk expected an ISO date-time, received "${value}".`);
  }

  return normalizedValue as IsoDateTimeString;
}

export function toIsoDateString(value: string): IsoDateString {
  const normalizedValue = readRequiredWorkspaceValue(value, "ISO date");

  if (!isoDatePattern.test(normalizedValue)) {
    throw new Error(`FlowDesk expected an ISO date, received "${value}".`);
  }

  const match = isoDatePattern.exec(normalizedValue);

  if (!match) {
    throw new Error(`FlowDesk expected an ISO date, received "${value}".`);
  }

  const year = Number(match[0].slice(0, 4));
  const month = Number(match[0].slice(5, 7));
  const day = Number(match[0].slice(8, 10));
  const parsedDate = new Date(Date.UTC(year, month - 1, day));
  const isValidDate =
    parsedDate.getUTCFullYear() === year && parsedDate.getUTCMonth() === month - 1 && parsedDate.getUTCDate() === day;

  if (!isValidDate) {
    throw new Error(`FlowDesk expected a valid ISO date, received "${value}".`);
  }

  return normalizedValue as IsoDateString;
}

export function toWorkspaceFilePath(value: string): WorkspaceFilePath {
  return readRequiredWorkspaceValue(value, "workspace file path") as WorkspaceFilePath;
}
