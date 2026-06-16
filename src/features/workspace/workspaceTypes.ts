import type { ExportFormat } from "../../lib/export/exportProjectRecord";
import type { FileSystemPath } from "../../lib/platform/fileSystemPath";

export type ThemeMode = "system" | "light" | "dark";

export type ExportSaveState =
  | { status: "saving"; format: ExportFormat }
  | { status: "saved"; format: ExportFormat; path: FileSystemPath }
  | { status: "downloaded"; format: ExportFormat; fileName: string }
  | { status: "cancelled"; format: ExportFormat }
  | { status: "error"; format: ExportFormat; message: string };

export type WorkspaceBackupState =
  | { status: "saving" }
  | { status: "saved"; path: FileSystemPath }
  | { status: "downloaded"; fileName: string }
  | { status: "selecting" }
  | { status: "ready"; projectCount: number }
  | { status: "restored"; projectCount: number }
  | { status: "cancelled" }
  | { status: "error"; message: string };

export type DiagnosticsExportState =
  | { status: "saving" }
  | { status: "saved"; path: FileSystemPath }
  | { status: "downloaded"; fileName: string }
  | { status: "cancelled" }
  | { status: "error"; message: string };
