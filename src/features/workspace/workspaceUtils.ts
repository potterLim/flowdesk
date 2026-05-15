import type { ExportFormat } from "../../lib/exportProjectRecord";
import type { ThemeMode } from "./workspaceTypes";

export function getStoredThemeMode(): ThemeMode {
  const storedThemeMode = window.localStorage.getItem("flowdesk.themeMode");

  if (storedThemeMode === "system" || storedThemeMode === "light" || storedThemeMode === "dark") {
    return storedThemeMode;
  }

  const legacyTheme = window.localStorage.getItem("flowdesk.theme");

  return legacyTheme === "light" || legacyTheme === "dark" ? legacyTheme : "system";
}

export function resolveThemeMode(themeMode: ThemeMode): "light" | "dark" {
  if (themeMode !== "system") {
    return themeMode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The operation could not be completed.";
}

export function formatExportFormat(format: ExportFormat): string {
  return format === "markdown" ? "Markdown" : "JSON";
}

export function formatAriaShortcut(shortcut: string): string {
  if (!shortcut.startsWith("Command/Ctrl+")) {
    return shortcut;
  }

  const key = shortcut.replace("Command/Ctrl+", "");

  return `Meta+${key} Control+${key}`;
}

export function isTextEntryTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable ||
    target.closest(".cm-editor") !== null
  );
}

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}
