import { create } from "zustand";
import type { WorkspaceSnapshot } from "../domain/workspace";
import { createNoteTaskActions } from "./workspaceNoteTaskActions";
import { createPersistenceActions } from "./workspaceStorePersistence";
import { createProjectActions } from "./workspaceProjectActions";
import { createRecordActions } from "./workspaceRecordActions";
import type { WorkspaceState } from "./workspaceStoreTypes";
import { createEmptyWorkspace, getInitialSelection } from "./workspaceStoreUtils";

export type {
  CreateProjectInput,
  CreateTaskInput,
  ImportWorkspaceFileInput,
  PersistenceStatus,
  ProjectRecordExportFormat,
  UpdateProjectInput,
} from "./workspaceStoreTypes";

function createInitialState(): WorkspaceSnapshot {
  return createEmptyWorkspace();
}

const initialSnapshot = createInitialState();
const initialSelection = getInitialSelection(initialSnapshot);

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialSnapshot,
  activeView: "overview",
  selectedProjectId: initialSelection.projectId,
  selectedNoteId: initialSelection.noteId,
  exportPreview: "",
  persistenceMode: "browser",
  persistenceStatus: "hydrating",
  persistenceError: null,
  lastPersistedAt: null,
  ...createPersistenceActions(set, get),
  ...createProjectActions(set, get),
  ...createNoteTaskActions(set, get),
  ...createRecordActions(set, get),
}));
