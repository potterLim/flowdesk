import type {
  Project,
  ProjectId,
  IsoDateString,
  IsoDateTimeString,
  NoteId,
  Task,
  TaskId,
  TaskStatus,
  WorkspaceFile,
  WorkspaceFileId,
  WorkspaceFileStorageMode,
  WorkspaceSnapshot,
  WorkspaceView,
} from "../domain/workspace";
import type { WorkspacePersistenceMode } from "../lib/persistence/workspaceRepository";

export type PersistenceStatus = "hydrating" | "saving" | "saved" | "error";
export type ProjectRecordExportFormat = "markdown" | "json";

export interface CreateProjectInput {
  title: string;
  description: string;
  tags: string[];
  accent: Project["accent"];
}

export type UpdateProjectInput = CreateProjectInput;

export interface CreateTaskInput {
  title: string;
  priority: Task["priority"];
  dueDate: IsoDateString | null;
  tags: string[];
}

export interface ImportWorkspaceFileInput {
  name: string;
  fileType: WorkspaceFile["fileType"];
  sizeLabel: string;
  path: WorkspaceFile["path"];
  sourcePath: WorkspaceFile["sourcePath"];
  storageMode: WorkspaceFileStorageMode;
  tags?: string[];
}

export interface WorkspaceState extends WorkspaceSnapshot {
  activeView: WorkspaceView;
  selectedProjectId: ProjectId | null;
  selectedNoteId: NoteId | null;
  exportPreview: string;
  persistenceMode: WorkspacePersistenceMode;
  persistenceStatus: PersistenceStatus;
  persistenceError: string | null;
  lastPersistedAt: IsoDateTimeString | null;
  flushWorkspacePersistence: () => void;
  hydrateWorkspace: () => void;
  repairWorkspaceStorage: () => void;
  createProject: (input: CreateProjectInput) => void;
  updateProject: (projectId: ProjectId, input: UpdateProjectInput) => void;
  deleteProject: (projectId: ProjectId) => void;
  toggleProjectPinned: (projectId: ProjectId) => void;
  archiveProject: (projectId: ProjectId) => void;
  restoreProject: (projectId: ProjectId) => void;
  selectProject: (projectId: ProjectId) => void;
  selectNote: (noteId: NoteId) => void;
  setActiveView: (view: WorkspaceView) => void;
  updateSelectedNoteTitle: (title: string) => void;
  updateSelectedNoteContent: (content: string) => void;
  createNote: () => void;
  deleteNote: (noteId: NoteId) => void;
  createTask: (input: CreateTaskInput) => void;
  updateTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
  deleteTask: (taskId: TaskId) => void;
  importFiles: (files: ImportWorkspaceFileInput[]) => void;
  deleteFile: (fileId: WorkspaceFileId) => void;
  startSession: () => void;
  updateActiveSessionNotes: (notes: string) => void;
  endActiveSession: () => void;
  prepareMarkdownExport: () => string | null;
  prepareJsonExport: () => string | null;
  recordProjectExport: (format: ProjectRecordExportFormat) => void;
  replaceWorkspace: (snapshot: WorkspaceSnapshot) => void;
  resetWorkspace: () => void;
}

export type WorkspaceStoreSet = (partial: Partial<WorkspaceState>) => void;
export type WorkspaceStoreGet = () => WorkspaceState;
