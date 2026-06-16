import { useCallback } from "react";
import type { WorkspaceFileId, WorkspaceFilePath } from "../../../domain/workspace";
import type { ExportFormat } from "../../../lib/export/exportProjectRecord";

interface UseWorkspaceRequestActionsInput {
  deleteFile: (fileId: WorkspaceFileId) => Promise<void>;
  exportDiagnostics: () => Promise<void>;
  importFiles: () => Promise<void>;
  openFile: (path: WorkspaceFilePath) => Promise<void>;
  revealFile: (path: WorkspaceFilePath) => Promise<void>;
  revealSavedExport: () => Promise<void>;
  saveProjectRecord: (format: ExportFormat) => Promise<void>;
  saveWorkspaceBackup: () => Promise<void>;
  selectWorkspaceBackup: () => Promise<void>;
}

export function useWorkspaceRequestActions({
  deleteFile,
  exportDiagnostics,
  importFiles,
  openFile,
  revealFile,
  revealSavedExport,
  saveProjectRecord,
  saveWorkspaceBackup,
  selectWorkspaceBackup,
}: UseWorkspaceRequestActionsInput) {
  const requestDeleteFile = useCallback(
    (fileId: WorkspaceFileId) => {
      void deleteFile(fileId);
    },
    [deleteFile],
  );
  const requestExportDiagnostics = useCallback(() => {
    void exportDiagnostics();
  }, [exportDiagnostics]);
  const requestImportFiles = useCallback(() => {
    void importFiles();
  }, [importFiles]);
  const requestOpenFile = useCallback(
    (path: WorkspaceFilePath) => {
      void openFile(path);
    },
    [openFile],
  );
  const requestRevealFile = useCallback(
    (path: WorkspaceFilePath) => {
      void revealFile(path);
    },
    [revealFile],
  );
  const requestRevealSavedExport = useCallback(() => {
    void revealSavedExport();
  }, [revealSavedExport]);
  const requestSaveProjectRecord = useCallback(
    (format: ExportFormat) => {
      void saveProjectRecord(format);
    },
    [saveProjectRecord],
  );
  const requestSaveWorkspaceBackup = useCallback(() => {
    void saveWorkspaceBackup();
  }, [saveWorkspaceBackup]);
  const requestSelectWorkspaceBackup = useCallback(() => {
    void selectWorkspaceBackup();
  }, [selectWorkspaceBackup]);

  return {
    requestDeleteFile,
    requestExportDiagnostics,
    requestImportFiles,
    requestOpenFile,
    requestRevealFile,
    requestRevealSavedExport,
    requestSaveProjectRecord,
    requestSaveWorkspaceBackup,
    requestSelectWorkspaceBackup,
  };
}
