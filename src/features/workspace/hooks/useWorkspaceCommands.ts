import { useCallback, useMemo } from "react";
import type { CommandPaletteItem } from "../components/CommandPalette";
import { buildWorkspaceCommandItems, type WorkspaceCommandItemInput } from "./workspaceCommandItems";
import { useWorkspaceShortcuts, type WorkspaceShortcutInput } from "./useWorkspaceShortcuts";

type UseWorkspaceCommandsInput = Omit<WorkspaceCommandItemInput, "onFocusProjectSearch"> &
  Omit<WorkspaceShortcutInput, "hasActiveSession" | "hasSelectedProject" | "onFocusProjectSearch">;

export function useWorkspaceCommands(input: UseWorkspaceCommandsInput): CommandPaletteItem[] {
  const {
    canEditProject,
    hasActiveSession,
    selectedProjectId,
    selectedProjectTitle,
    isSelectedProjectPinned,
    onCreateNote,
    onEndSession,
    onExportDiagnostics,
    onImportFiles,
    onOpenCommandPalette,
    onOpenCreateProject,
    onOpenCreateTask,
    onOpenProjectSettings,
    onOpenWorkspaceSettings,
    onPrepareMarkdownExport,
    onRestoreWorkspaceBackup,
    onSaveWorkspaceBackup,
    onSelectView,
    onStartSession,
    onToggleProjectPinned,
  } = input;
  const focusProjectSearch = useCallback(() => {
    document.getElementById("flowdesk-project-search")?.focus();
  }, []);

  useWorkspaceShortcuts({
    canEditProject,
    hasActiveSession,
    hasSelectedProject: Boolean(selectedProjectId),
    onCreateNote,
    onEndSession,
    onExportDiagnostics,
    onFocusProjectSearch: focusProjectSearch,
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
  });

  return useMemo(
    () =>
      buildWorkspaceCommandItems({
        canEditProject,
        hasActiveSession,
        selectedProjectId,
        selectedProjectTitle,
        isSelectedProjectPinned,
        onCreateNote,
        onEndSession,
        onExportDiagnostics,
        onFocusProjectSearch: focusProjectSearch,
        onImportFiles,
        onOpenCreateProject,
        onOpenCreateTask,
        onOpenProjectSettings,
        onOpenWorkspaceSettings,
        onPrepareMarkdownExport,
        onRestoreWorkspaceBackup,
        onSaveWorkspaceBackup,
        onSelectView,
        onStartSession,
        onToggleProjectPinned,
      }),
    [
      canEditProject,
      focusProjectSearch,
      hasActiveSession,
      isSelectedProjectPinned,
      onCreateNote,
      onEndSession,
      onExportDiagnostics,
      onImportFiles,
      onOpenCreateProject,
      onOpenCreateTask,
      onOpenProjectSettings,
      onOpenWorkspaceSettings,
      onPrepareMarkdownExport,
      onRestoreWorkspaceBackup,
      onSaveWorkspaceBackup,
      onSelectView,
      onStartSession,
      onToggleProjectPinned,
      selectedProjectId,
      selectedProjectTitle,
    ],
  );
}
