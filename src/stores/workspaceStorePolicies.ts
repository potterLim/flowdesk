import type {
  IsoDateTimeString,
  Note,
  Project,
  ProjectId,
  Task,
  WorkSession,
  WorkspaceFile,
} from "../domain/workspace";
import type { CreateProjectInput, CreateTaskInput, ImportWorkspaceFileInput } from "./workspaceStoreTypes";
import { getProjectIcon } from "./workspaceStoreUtils";

const defaultProjectTitle = "Untitled Project";
const defaultNoteTitle = "Untitled note";
const defaultTaskTitle = "Untitled task";
const defaultFileName = "Untitled file";
const defaultSessionTitle = "Focus session";
const defaultNoteFolder = "Inbox";
const defaultFileSizeLabel = "Unknown size";

export interface NormalizedProjectInput {
  title: Project["title"];
  description: Project["description"];
  tags: Project["tags"];
  accent: Project["accent"];
  icon: Project["icon"];
}

export interface NormalizedTaskInput {
  title: Task["title"];
  priority: Task["priority"];
  dueDate: Task["dueDate"];
  tags: Task["tags"];
}

export function normalizeProjectInput(input: CreateProjectInput): NormalizedProjectInput {
  const title = readDisplayText(input.title, defaultProjectTitle);

  return {
    title,
    description: input.description.trim(),
    tags: [...input.tags],
    accent: input.accent,
    icon: getProjectIcon(title),
  };
}

export function normalizeTaskInput(input: CreateTaskInput): NormalizedTaskInput {
  return {
    title: readDisplayText(input.title, defaultTaskTitle),
    priority: input.priority,
    dueDate: input.dueDate,
    tags: [...input.tags],
  };
}

export function createDefaultNote(projectId: ProjectId, now: IsoDateTimeString, id: Note["id"]): Note {
  return {
    id,
    projectId,
    title: defaultNoteTitle,
    folder: defaultNoteFolder,
    content: "",
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultSession(projectId: ProjectId, now: IsoDateTimeString, id: WorkSession["id"]): WorkSession {
  return {
    id,
    projectId,
    title: defaultSessionTitle,
    notes: "",
    startedAt: now,
    endedAt: null,
    durationMinutes: null,
  };
}

export function createImportedWorkspaceFile(
  projectId: ProjectId,
  now: IsoDateTimeString,
  id: WorkspaceFile["id"],
  file: ImportWorkspaceFileInput,
): WorkspaceFile {
  return {
    id,
    projectId,
    name: readDisplayText(file.name, defaultFileName),
    fileType: file.fileType,
    sizeLabel: readDisplayText(file.sizeLabel, defaultFileSizeLabel),
    path: file.path,
    sourcePath: file.sourcePath,
    storageMode: file.storageMode,
    tags: [...(file.tags ?? [])],
    importedAt: now,
  };
}

export function getNoteCreatedDescription(): string {
  return `Created a note in ${defaultNoteFolder}.`;
}

function readDisplayText(value: string, fallback: string): string {
  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : fallback;
}
