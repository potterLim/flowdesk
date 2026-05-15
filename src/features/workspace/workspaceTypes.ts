import type { ExportFormat } from "../../lib/exportProjectRecord";

export type ThemeMode = "system" | "light" | "dark";

export type ExportSaveState =
  | { status: "saving"; format: ExportFormat }
  | { status: "saved"; format: ExportFormat; path: string }
  | { status: "downloaded"; format: ExportFormat; fileName: string }
  | { status: "cancelled"; format: ExportFormat }
  | { status: "error"; format: ExportFormat; message: string };
