import type { ExportFormat } from "../../lib/exportProjectRecord";

export type ThemeMode = "system" | "light" | "dark";

export type ExportSaveState =
  | { status: "saving"; format: ExportFormat }
  | { status: "saved"; format: ExportFormat; path: string }
  | { status: "downloaded"; format: ExportFormat; fileName: string }
  | { status: "cancelled"; format: ExportFormat }
  | { status: "error"; format: ExportFormat; message: string };

export type WorkspaceBackupState =
  | { status: "saving" }
  | { status: "saved"; path: string }
  | { status: "downloaded"; fileName: string }
  | { status: "selecting" }
  | { status: "ready"; projectCount: number }
  | { status: "restored"; projectCount: number }
  | { status: "cancelled" }
  | { status: "error"; message: string };
