import { createExportStoreActions } from "./workspaceExportStoreActions";
import { createFileStoreActions } from "./workspaceFileStoreActions";
import { createLifecycleStoreActions } from "./workspaceLifecycleStoreActions";
import { createSessionStoreActions } from "./workspaceSessionStoreActions";
import type { WorkspaceState, WorkspaceStoreGet, WorkspaceStoreSet } from "./workspaceStoreTypes";

type RecordActionKeys =
  | "importFiles"
  | "deleteFile"
  | "startSession"
  | "updateActiveSessionNotes"
  | "endActiveSession"
  | "prepareMarkdownExport"
  | "prepareJsonExport"
  | "recordProjectExport"
  | "replaceWorkspace"
  | "resetWorkspace";

export function createRecordActions(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
): Pick<WorkspaceState, RecordActionKeys> {
  return {
    ...createFileStoreActions(set, get),
    ...createSessionStoreActions(set, get),
    ...createExportStoreActions(set, get),
    ...createLifecycleStoreActions(set, get),
  };
}
