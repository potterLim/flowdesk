import { persistCurrentState } from "./workspaceStorePersistence";
import type { WorkspaceState, WorkspaceStoreGet, WorkspaceStoreSet } from "./workspaceStoreTypes";
import { createEmptyWorkspace, getInitialSelection } from "./workspaceStoreUtils";

type LifecycleActionKeys = "replaceWorkspace" | "resetWorkspace";

export function createLifecycleStoreActions(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
): Pick<WorkspaceState, LifecycleActionKeys> {
  return {
    replaceWorkspace(snapshot) {
      const selection = getInitialSelection(snapshot);

      set({
        ...snapshot,
        selectedProjectId: selection.projectId,
        selectedNoteId: selection.noteId,
        activeView: "overview",
        exportPreview: "",
        persistenceError: null,
      });
      persistCurrentState(set, get);
    },

    resetWorkspace() {
      const nextSnapshot = createEmptyWorkspace();

      set({
        ...nextSnapshot,
        activeView: "overview",
        selectedProjectId: null,
        selectedNoteId: null,
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },
  };
}
