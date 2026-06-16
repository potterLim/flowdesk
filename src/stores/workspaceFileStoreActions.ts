import type { WorkspaceFile } from "../domain/workspace";
import { createImportedWorkspaceFile } from "./workspaceStorePolicies";
import { persistCurrentState } from "./workspaceStorePersistence";
import type { WorkspaceState, WorkspaceStoreGet, WorkspaceStoreSet } from "./workspaceStoreTypes";
import {
  createTimelineEvent,
  createWorkspaceFileId,
  getCurrentIsoDateTime,
  isProjectEditable,
  updateProjectTimestamp,
} from "./workspaceStoreUtils";

type FileActionKeys = "importFiles" | "deleteFile";

export function createFileStoreActions(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
): Pick<WorkspaceState, FileActionKeys> {
  return {
    importFiles(files) {
      const state = get();
      const projectId = state.selectedProjectId;

      if (!projectId || files.length === 0 || !isProjectEditable(state, projectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();
      const importedFiles: WorkspaceFile[] = files.map((file) =>
        createImportedWorkspaceFile(projectId, now, createWorkspaceFileId(), file),
      );
      const importedFileDescription =
        importedFiles.length === 1 && importedFiles[0]
          ? `Imported ${importedFiles[0].name}.`
          : `Imported ${importedFiles.length} files.`;

      set({
        files: [...importedFiles, ...state.files],
        activeView: "files",
        timelineEvents: [
          createTimelineEvent(
            projectId,
            importedFiles.length === 1 ? "File imported" : "Files imported",
            importedFileDescription,
            "file_imported",
          ),
          ...state.timelineEvents,
        ],
        projects: updateProjectTimestamp(state.projects, projectId, now),
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },

    deleteFile(fileId) {
      const state = get();
      const file = state.files.find((candidateFile) => candidateFile.id === fileId);

      if (!file || !isProjectEditable(state, file.projectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();

      set({
        files: state.files.filter((candidateFile) => candidateFile.id !== fileId),
        projects: updateProjectTimestamp(state.projects, file.projectId, now),
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },
  };
}
