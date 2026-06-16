import { useCallback, useState } from "react";
import type { WorkspaceSnapshot } from "../../../domain/workspace";
import { saveWorkspaceBackup, selectWorkspaceBackup } from "../../../lib/backup/workspaceBackup";
import { saveReleaseDiagnostics } from "../../../lib/diagnostics/releaseDiagnostics";
import {
  revealSavedProjectRecord,
  saveProjectRecord,
  type ExportFormat,
} from "../../../lib/export/exportProjectRecord";
import type { DiagnosticsExportState, ExportSaveState, WorkspaceBackupState } from "../workspaceTypes";
import {
  didWriteProjectRecord,
  toDiagnosticsErrorState,
  toDiagnosticsSaveState,
  toExportErrorState,
  toExportSaveState,
  toWorkspaceBackupErrorState,
  toWorkspaceBackupSaveState,
} from "./workspaceExportStateMappers";

interface UseWorkspaceExportActionsInput {
  selectedProjectTitle: string | null;
  workspaceSnapshot: WorkspaceSnapshot;
  onPrepareJsonExport: () => string | null;
  onPrepareMarkdownExport: () => string | null;
  onRecordProjectExport: (format: ExportFormat) => void;
  onReplaceWorkspace: (snapshot: WorkspaceSnapshot) => void;
}

export function useWorkspaceExportActions({
  selectedProjectTitle,
  workspaceSnapshot,
  onPrepareJsonExport,
  onPrepareMarkdownExport,
  onRecordProjectExport,
  onReplaceWorkspace,
}: UseWorkspaceExportActionsInput) {
  const [exportSaveState, setExportSaveState] = useState<ExportSaveState | null>(null);
  const [workspaceBackupState, setWorkspaceBackupState] = useState<WorkspaceBackupState | null>(null);
  const [diagnosticsExportState, setDiagnosticsExportState] = useState<DiagnosticsExportState | null>(null);
  const [pendingWorkspaceRestore, setPendingWorkspaceRestore] = useState<WorkspaceSnapshot | null>(null);

  const handlePrepareMarkdownExport = useCallback(() => {
    setExportSaveState(null);
    onPrepareMarkdownExport();
  }, [onPrepareMarkdownExport]);

  const handlePrepareJsonExport = useCallback(() => {
    setExportSaveState(null);
    onPrepareJsonExport();
  }, [onPrepareJsonExport]);

  const handleSaveProjectRecord = useCallback(
    async (format: ExportFormat) => {
      if (!selectedProjectTitle) {
        return;
      }

      setExportSaveState({ status: "saving", format });

      const content = format === "markdown" ? onPrepareMarkdownExport() : onPrepareJsonExport();

      if (!content) {
        setExportSaveState({
          status: "error",
          format,
          message: "There is no project record to export.",
        });
        return;
      }

      try {
        const result = await saveProjectRecord({
          projectTitle: selectedProjectTitle,
          format,
          content,
        });

        if (didWriteProjectRecord(result)) {
          onRecordProjectExport(format);
        }

        setExportSaveState(toExportSaveState(result, format));
      } catch (error: unknown) {
        setExportSaveState(toExportErrorState(format, error));
      }
    },
    [onPrepareJsonExport, onPrepareMarkdownExport, onRecordProjectExport, selectedProjectTitle],
  );

  const handleRevealSavedExport = useCallback(async () => {
    if (exportSaveState?.status !== "saved") {
      return;
    }

    try {
      await revealSavedProjectRecord(exportSaveState.path);
    } catch (error: unknown) {
      setExportSaveState(toExportErrorState(exportSaveState.format, error));
    }
  }, [exportSaveState]);

  const handleSaveWorkspaceBackup = useCallback(async () => {
    setWorkspaceBackupState({ status: "saving" });

    try {
      const result = await saveWorkspaceBackup(workspaceSnapshot);

      setWorkspaceBackupState(toWorkspaceBackupSaveState(result));
    } catch (error: unknown) {
      setWorkspaceBackupState(toWorkspaceBackupErrorState(error));
    }
  }, [workspaceSnapshot]);

  const handleSelectWorkspaceBackup = useCallback(async () => {
    setWorkspaceBackupState({ status: "selecting" });

    try {
      const snapshot = await selectWorkspaceBackup();

      if (!snapshot) {
        setWorkspaceBackupState({ status: "cancelled" });
        return;
      }

      setPendingWorkspaceRestore(snapshot);
      setWorkspaceBackupState({ status: "ready", projectCount: snapshot.projects.length });
    } catch (error: unknown) {
      setWorkspaceBackupState(toWorkspaceBackupErrorState(error));
    }
  }, []);

  const handleExportDiagnostics = useCallback(async () => {
    setDiagnosticsExportState({ status: "saving" });

    try {
      const result = await saveReleaseDiagnostics();

      setDiagnosticsExportState(toDiagnosticsSaveState(result));
    } catch (error: unknown) {
      setDiagnosticsExportState(toDiagnosticsErrorState(error));
    }
  }, []);

  const handleConfirmWorkspaceRestore = useCallback(() => {
    if (!pendingWorkspaceRestore) {
      return;
    }

    onReplaceWorkspace(pendingWorkspaceRestore);
    setWorkspaceBackupState({ status: "restored", projectCount: pendingWorkspaceRestore.projects.length });
    setPendingWorkspaceRestore(null);
  }, [onReplaceWorkspace, pendingWorkspaceRestore]);

  const handleCancelWorkspaceRestore = useCallback(() => {
    setPendingWorkspaceRestore(null);
    setWorkspaceBackupState({ status: "cancelled" });
  }, []);

  return {
    diagnosticsExportState,
    exportSaveState,
    handleCancelWorkspaceRestore,
    handleConfirmWorkspaceRestore,
    handleExportDiagnostics,
    handlePrepareJsonExport,
    handlePrepareMarkdownExport,
    handleRevealSavedExport,
    handleSaveProjectRecord,
    handleSaveWorkspaceBackup,
    handleSelectWorkspaceBackup,
    pendingWorkspaceRestore,
    workspaceBackupState,
  };
}
