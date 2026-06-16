import type {
  Note,
  Project,
  ReferenceRecord,
  Task,
  TimelineEvent,
  WorkSession,
  WorkspaceFile,
  WorkspaceSnapshot,
  IsoDateTimeString,
} from "../../domain/workspace";
import {
  readProjectAccent,
  readProjectStatus,
  readReferenceType,
  readTaskPriority,
  readTaskStatus,
  readTimelineEventType,
  readWorkspaceFileStorageMode,
  readWorkspaceFileType,
} from "../../domain/workspaceValidation";
import {
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
import {
  isRecord,
  readArray,
  readIsoDateTimeString,
  readNullableIsoDateString,
  readNullableIsoDateTimeString,
  readNullableNumber,
  readNullableWorkSessionId,
  readNullableWorkspaceFilePath,
  readString,
  readStringArray,
} from "./workspaceSnapshotReaders";

export function normalizeWorkspaceSnapshot(value: unknown): WorkspaceSnapshot | null {
  if (!isRecord(value)) {
    return null;
  }

  const fallbackTimestamp = toIsoDateTimeString(new Date().toISOString());
  const projects = readArray(value.projects)
    .map((project) => normalizeProject(project, fallbackTimestamp))
    .filter((project): project is Project => Boolean(project));

  if (projects.length === 0) {
    return null;
  }

  const projectIds = new Set(projects.map((project) => project.id));

  return {
    projects,
    notes: readArray(value.notes)
      .map((note) => normalizeNote(note, fallbackTimestamp))
      .filter((note): note is Note => Boolean(note && projectIds.has(note.projectId))),
    tasks: readArray(value.tasks)
      .map((task) => normalizeTask(task, fallbackTimestamp))
      .filter((task): task is Task => Boolean(task && projectIds.has(task.projectId))),
    sessions: readArray(value.sessions)
      .map((session) => normalizeSession(session, fallbackTimestamp))
      .filter((session): session is WorkSession => Boolean(session && projectIds.has(session.projectId))),
    references: readArray(value.references)
      .map((reference) => normalizeReference(reference, fallbackTimestamp))
      .filter((reference): reference is ReferenceRecord => Boolean(reference && projectIds.has(reference.projectId))),
    files: readArray(value.files)
      .map((file) => normalizeFile(file, fallbackTimestamp))
      .filter((file): file is WorkspaceFile => Boolean(file && projectIds.has(file.projectId))),
    timelineEvents: readArray(value.timelineEvents)
      .map((event) => normalizeTimelineEvent(event, fallbackTimestamp))
      .filter((event): event is TimelineEvent => Boolean(event && projectIds.has(event.projectId))),
  };
}

function normalizeProject(value: unknown, fallbackTimestamp: IsoDateTimeString): Project | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const title = readString(value.title).trim();

  if (!id || !title) {
    return null;
  }

  return {
    id: toProjectId(id),
    title,
    description: readString(value.description),
    createdAt: readIsoDateTimeString(value.createdAt, fallbackTimestamp),
    updatedAt: readIsoDateTimeString(value.updatedAt, fallbackTimestamp),
    tags: readStringArray(value.tags),
    status: readProjectStatus(readString(value.status)),
    isPinned: value.isPinned === true,
    accent: readProjectAccent(readString(value.accent)),
    icon: readString(value.icon, title.slice(0, 2).toUpperCase()),
  };
}

function normalizeNote(value: unknown, fallbackTimestamp: IsoDateTimeString): Note | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);

  if (!id || !projectId) {
    return null;
  }

  return {
    id: toNoteId(id),
    projectId: toProjectId(projectId),
    title: readString(value.title, "Untitled note"),
    folder: readString(value.folder, "Inbox"),
    content: readString(value.content),
    createdAt: readIsoDateTimeString(value.createdAt, fallbackTimestamp),
    updatedAt: readIsoDateTimeString(value.updatedAt, fallbackTimestamp),
  };
}

function normalizeTask(value: unknown, fallbackTimestamp: IsoDateTimeString): Task | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);
  if (!id || !projectId) {
    return null;
  }

  return {
    id: toTaskId(id),
    projectId: toProjectId(projectId),
    title: readString(value.title, "Untitled task"),
    status: readTaskStatus(readString(value.status)),
    priority: readTaskPriority(readString(value.priority)),
    dueDate: readNullableIsoDateString(value.dueDate),
    tags: readStringArray(value.tags),
    linkedSessionId: readNullableWorkSessionId(value.linkedSessionId),
    createdAt: readIsoDateTimeString(value.createdAt, fallbackTimestamp),
    updatedAt: readIsoDateTimeString(value.updatedAt, fallbackTimestamp),
  };
}

function normalizeSession(value: unknown, fallbackTimestamp: IsoDateTimeString): WorkSession | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);

  if (!id || !projectId) {
    return null;
  }

  return {
    id: toWorkSessionId(id),
    projectId: toProjectId(projectId),
    title: readString(value.title, "Focus session"),
    notes: readString(value.notes),
    startedAt: readIsoDateTimeString(value.startedAt, fallbackTimestamp),
    endedAt: readNullableIsoDateTimeString(value.endedAt),
    durationMinutes: readNullableNumber(value.durationMinutes),
  };
}

function normalizeReference(value: unknown, fallbackTimestamp: IsoDateTimeString): ReferenceRecord | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);
  if (!id || !projectId) {
    return null;
  }

  return {
    id: toReferenceId(id),
    projectId: toProjectId(projectId),
    title: readString(value.title, "Untitled reference"),
    type: readReferenceType(readString(value.type)),
    source: readString(value.source),
    summary: readString(value.summary),
    tags: readStringArray(value.tags),
    createdAt: readIsoDateTimeString(value.createdAt, fallbackTimestamp),
  };
}

function normalizeFile(value: unknown, fallbackTimestamp: IsoDateTimeString): WorkspaceFile | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);
  const path = readString(value.path);
  if (!id || !projectId) {
    return null;
  }

  if (!path) {
    return null;
  }

  return {
    id: toWorkspaceFileId(id),
    projectId: toProjectId(projectId),
    name: readString(value.name, "Untitled file"),
    fileType: readWorkspaceFileType(readString(value.fileType)),
    sizeLabel: readString(value.sizeLabel),
    path: toWorkspaceFilePath(path),
    sourcePath: readNullableWorkspaceFilePath(value.sourcePath),
    storageMode: readWorkspaceFileStorageMode(readString(value.storageMode)),
    tags: readStringArray(value.tags),
    importedAt: readIsoDateTimeString(value.importedAt, fallbackTimestamp),
  };
}

function normalizeTimelineEvent(value: unknown, fallbackTimestamp: IsoDateTimeString): TimelineEvent | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const projectId = readString(value.projectId);
  if (!id || !projectId) {
    return null;
  }

  return {
    id: toTimelineEventId(id),
    projectId: toProjectId(projectId),
    type: readTimelineEventType(readString(value.type)),
    title: readString(value.title, "Workspace event"),
    description: readString(value.description),
    createdAt: readIsoDateTimeString(value.createdAt, fallbackTimestamp),
  };
}
