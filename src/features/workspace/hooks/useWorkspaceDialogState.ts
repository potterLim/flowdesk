import { useCallback, useMemo, useState } from "react";
import type { NoteId, ProjectId, TaskId } from "../../../domain/workspace";
import { getStoredThemeMode } from "../workspaceUtils";
import type { ThemeMode } from "../workspaceTypes";

export interface WorkspaceDialogState {
  isCommandPaletteOpen: boolean;
  isCreateProjectDialogOpen: boolean;
  isCreateTaskDialogOpen: boolean;
  isProjectSettingsOpen: boolean;
  isStorageRepairConfirmOpen: boolean;
  isWorkspaceSettingsOpen: boolean;
  pendingNoteDeleteId: NoteId | null;
  pendingProjectDeleteId: ProjectId | null;
  pendingTaskDeleteId: TaskId | null;
  themeMode: ThemeMode;
}

export interface WorkspaceDialogActions {
  cancelNoteDelete: () => void;
  cancelProjectDelete: () => void;
  cancelStorageRepair: () => void;
  cancelTaskDelete: () => void;
  changeTheme: (themeMode: ThemeMode) => void;
  closeCommandPalette: () => void;
  closeCreateProjectDialog: () => void;
  closeCreateTaskDialog: () => void;
  closeProjectSettings: () => void;
  closeWorkspaceSettings: () => void;
  openCommandPalette: () => void;
  openCreateProjectDialog: () => void;
  openCreateTaskDialog: () => void;
  openProjectSettings: () => void;
  openStorageRepairConfirm: () => void;
  openWorkspaceSettings: () => void;
  requestNoteDelete: (noteId: NoteId) => void;
  requestProjectDelete: (projectId: ProjectId | null) => void;
  requestStorageRepairFromSettings: () => void;
  requestTaskDelete: (taskId: TaskId) => void;
}

export function useWorkspaceDialogState(): {
  dialogActions: WorkspaceDialogActions;
  dialogState: WorkspaceDialogState;
} {
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [pendingProjectDeleteId, setPendingProjectDeleteId] = useState<ProjectId | null>(null);
  const [pendingNoteDeleteId, setPendingNoteDeleteId] = useState<NoteId | null>(null);
  const [pendingTaskDeleteId, setPendingTaskDeleteId] = useState<TaskId | null>(null);
  const [isStorageRepairConfirmOpen, setIsStorageRepairConfirmOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);

  const openCreateProjectDialog = useCallback(() => setIsCreateProjectDialogOpen(true), []);
  const closeCreateProjectDialog = useCallback(() => setIsCreateProjectDialogOpen(false), []);
  const openCreateTaskDialog = useCallback(() => setIsCreateTaskDialogOpen(true), []);
  const closeCreateTaskDialog = useCallback(() => setIsCreateTaskDialogOpen(false), []);
  const openCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const closeCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);
  const openProjectSettings = useCallback(() => setIsProjectSettingsOpen(true), []);
  const closeProjectSettings = useCallback(() => setIsProjectSettingsOpen(false), []);
  const openWorkspaceSettings = useCallback(() => setIsWorkspaceSettingsOpen(true), []);
  const closeWorkspaceSettings = useCallback(() => setIsWorkspaceSettingsOpen(false), []);
  const openStorageRepairConfirm = useCallback(() => setIsStorageRepairConfirmOpen(true), []);
  const cancelStorageRepair = useCallback(() => setIsStorageRepairConfirmOpen(false), []);
  const cancelProjectDelete = useCallback(() => setPendingProjectDeleteId(null), []);
  const cancelNoteDelete = useCallback(() => setPendingNoteDeleteId(null), []);
  const cancelTaskDelete = useCallback(() => setPendingTaskDeleteId(null), []);

  const requestProjectDelete = useCallback((projectId: ProjectId | null) => {
    if (projectId) {
      setPendingProjectDeleteId(projectId);
    }
  }, []);

  const requestStorageRepairFromSettings = useCallback(() => {
    setIsWorkspaceSettingsOpen(false);
    setIsStorageRepairConfirmOpen(true);
  }, []);

  const dialogActions = useMemo<WorkspaceDialogActions>(
    () => ({
      cancelNoteDelete,
      cancelProjectDelete,
      cancelStorageRepair,
      cancelTaskDelete,
      changeTheme: setThemeMode,
      closeCommandPalette,
      closeCreateProjectDialog,
      closeCreateTaskDialog,
      closeProjectSettings,
      closeWorkspaceSettings,
      openCommandPalette,
      openCreateProjectDialog,
      openCreateTaskDialog,
      openProjectSettings,
      openStorageRepairConfirm,
      openWorkspaceSettings,
      requestNoteDelete: setPendingNoteDeleteId,
      requestProjectDelete,
      requestStorageRepairFromSettings,
      requestTaskDelete: setPendingTaskDeleteId,
    }),
    [
      cancelNoteDelete,
      cancelProjectDelete,
      cancelStorageRepair,
      cancelTaskDelete,
      closeCommandPalette,
      closeCreateProjectDialog,
      closeCreateTaskDialog,
      closeProjectSettings,
      closeWorkspaceSettings,
      openCommandPalette,
      openCreateProjectDialog,
      openCreateTaskDialog,
      openProjectSettings,
      openStorageRepairConfirm,
      openWorkspaceSettings,
      requestProjectDelete,
      requestStorageRepairFromSettings,
    ],
  );

  const dialogState = useMemo<WorkspaceDialogState>(
    () => ({
      isCommandPaletteOpen,
      isCreateProjectDialogOpen,
      isCreateTaskDialogOpen,
      isProjectSettingsOpen,
      isStorageRepairConfirmOpen,
      isWorkspaceSettingsOpen,
      pendingNoteDeleteId,
      pendingProjectDeleteId,
      pendingTaskDeleteId,
      themeMode,
    }),
    [
      isCommandPaletteOpen,
      isCreateProjectDialogOpen,
      isCreateTaskDialogOpen,
      isProjectSettingsOpen,
      isStorageRepairConfirmOpen,
      isWorkspaceSettingsOpen,
      pendingNoteDeleteId,
      pendingProjectDeleteId,
      pendingTaskDeleteId,
      themeMode,
    ],
  );

  return { dialogActions, dialogState };
}
