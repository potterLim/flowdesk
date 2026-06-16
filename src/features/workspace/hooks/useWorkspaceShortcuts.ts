import { useCallback, useEffect } from "react";
import type { WorkspaceView } from "../../../domain/workspace";
import { viewItems } from "../workspaceConstants";
import { isTextEntryTarget } from "../workspaceUtils";
import { useNativeMenuEvents, type NativeWorkspaceMenuCommand } from "./useNativeMenuEvents";

export interface WorkspaceShortcutInput {
  canEditProject: boolean;
  hasActiveSession: boolean;
  hasSelectedProject: boolean;
  onCreateNote: () => void;
  onEndSession: () => void;
  onExportDiagnostics: () => void;
  onFocusProjectSearch: () => void;
  onImportFiles: () => void;
  onOpenCommandPalette: () => void;
  onOpenCreateProject: () => void;
  onOpenCreateTask: () => void;
  onOpenWorkspaceSettings: () => void;
  onPrepareMarkdownExport: () => void;
  onRestoreWorkspaceBackup: () => void;
  onSaveWorkspaceBackup: () => void;
  onSelectView: (view: WorkspaceView) => void;
  onStartSession: () => void;
}

export function useWorkspaceShortcuts({
  canEditProject,
  hasActiveSession,
  hasSelectedProject,
  onCreateNote,
  onEndSession,
  onExportDiagnostics,
  onFocusProjectSearch,
  onImportFiles,
  onOpenCommandPalette,
  onOpenCreateProject,
  onOpenCreateTask,
  onOpenWorkspaceSettings,
  onPrepareMarkdownExport,
  onRestoreWorkspaceBackup,
  onSaveWorkspaceBackup,
  onSelectView,
  onStartSession,
}: WorkspaceShortcutInput): void {
  const handleNativeMenuCommand = useCallback(
    (command: NativeWorkspaceMenuCommand) => {
      if (command === "new_project") {
        onOpenCreateProject();
        return;
      }

      if (command === "new_note" && hasSelectedProject && canEditProject) {
        onCreateNote();
        return;
      }

      if (command === "new_task" && hasSelectedProject && canEditProject) {
        onOpenCreateTask();
        return;
      }

      if (command === "import_files" && hasSelectedProject && canEditProject) {
        onImportFiles();
        return;
      }

      if (command === "export_markdown" && hasSelectedProject) {
        onPrepareMarkdownExport();
        return;
      }

      if (command === "save_workspace_backup") {
        onSaveWorkspaceBackup();
        return;
      }

      if (command === "restore_workspace_backup") {
        onRestoreWorkspaceBackup();
        return;
      }

      if (command === "export_diagnostics") {
        onExportDiagnostics();
        return;
      }

      if (command === "open_workspace_settings") {
        onOpenWorkspaceSettings();
        return;
      }

      if (command === "open_command_palette") {
        onOpenCommandPalette();
        return;
      }

      if (command === "search_projects") {
        onFocusProjectSearch();
      }
    },
    [
      canEditProject,
      hasSelectedProject,
      onCreateNote,
      onExportDiagnostics,
      onFocusProjectSearch,
      onImportFiles,
      onOpenCommandPalette,
      onOpenCreateProject,
      onOpenCreateTask,
      onOpenWorkspaceSettings,
      onPrepareMarkdownExport,
      onRestoreWorkspaceBackup,
      onSaveWorkspaceBackup,
    ],
  );

  useNativeMenuEvents(handleNativeMenuCommand);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasCommandModifier = event.metaKey || event.ctrlKey;

      if (!hasCommandModifier || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "p" && event.shiftKey) {
        event.preventDefault();
        onOpenCommandPalette();
        return;
      }

      if (key === ",") {
        event.preventDefault();
        onOpenWorkspaceSettings();
        return;
      }

      if (key === "k") {
        event.preventDefault();
        onFocusProjectSearch();
        return;
      }

      if (isTextEntryTarget(event.target)) {
        return;
      }

      const viewIndex = Number.parseInt(key, 10) - 1;
      const viewItem = viewItems[viewIndex];

      if (viewItem) {
        event.preventDefault();
        onSelectView(viewItem.id);
        return;
      }

      if (key === "n") {
        event.preventDefault();

        if (event.shiftKey || !hasSelectedProject || !canEditProject) {
          onOpenCreateProject();
          return;
        }

        onCreateNote();
        return;
      }

      if (key === "t" && event.shiftKey && hasSelectedProject && canEditProject) {
        event.preventDefault();
        onOpenCreateTask();
        return;
      }

      if (key === "i" && event.shiftKey && hasSelectedProject && canEditProject) {
        event.preventDefault();
        onImportFiles();
        return;
      }

      if (key === "e" && hasSelectedProject) {
        event.preventDefault();
        onPrepareMarkdownExport();
        return;
      }

      if (event.key === "Enter" && hasSelectedProject && canEditProject) {
        event.preventDefault();

        if (hasActiveSession) {
          onEndSession();
          return;
        }

        onStartSession();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canEditProject,
    hasActiveSession,
    hasSelectedProject,
    onCreateNote,
    onEndSession,
    onFocusProjectSearch,
    onImportFiles,
    onOpenCommandPalette,
    onOpenCreateProject,
    onOpenCreateTask,
    onOpenWorkspaceSettings,
    onPrepareMarkdownExport,
    onSelectView,
    onStartSession,
  ]);
}
