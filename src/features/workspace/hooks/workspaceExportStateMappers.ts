import type { WorkspaceBackupSaveResult } from "../../../lib/backup/workspaceBackup";
import type { DiagnosticsSaveResult } from "../../../lib/diagnostics/releaseDiagnostics";
import type { ExportFormat, ExportSaveResult } from "../../../lib/export/exportProjectRecord";
import { getErrorMessage } from "../workspaceUtils";
import type { DiagnosticsExportState, ExportSaveState, WorkspaceBackupState } from "../workspaceTypes";

export function didWriteProjectRecord(result: ExportSaveResult): boolean {
  return result.status === "saved" || result.status === "downloaded";
}

export function toExportSaveState(result: ExportSaveResult, format: ExportFormat): ExportSaveState {
  switch (result.status) {
    case "saved":
      return { status: "saved", format, path: result.path };
    case "downloaded":
      return { status: "downloaded", format, fileName: result.fileName };
    case "cancelled":
      return { status: "cancelled", format };
  }
}

export function toWorkspaceBackupSaveState(result: WorkspaceBackupSaveResult): WorkspaceBackupState {
  switch (result.status) {
    case "saved":
      return { status: "saved", path: result.path };
    case "downloaded":
      return { status: "downloaded", fileName: result.fileName };
    case "cancelled":
      return { status: "cancelled" };
  }
}

export function toDiagnosticsSaveState(result: DiagnosticsSaveResult): DiagnosticsExportState {
  switch (result.status) {
    case "saved":
      return { status: "saved", path: result.path };
    case "downloaded":
      return { status: "downloaded", fileName: result.fileName };
    case "cancelled":
      return { status: "cancelled" };
  }
}

export function toExportErrorState(format: ExportFormat, error: unknown): ExportSaveState {
  return {
    status: "error",
    format,
    message: getErrorMessage(error),
  };
}

export function toWorkspaceBackupErrorState(error: unknown): WorkspaceBackupState {
  return {
    status: "error",
    message: getErrorMessage(error),
  };
}

export function toDiagnosticsErrorState(error: unknown): DiagnosticsExportState {
  return {
    status: "error",
    message: getErrorMessage(error),
  };
}
