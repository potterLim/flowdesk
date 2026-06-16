import type { ComponentProps } from "react";
import { useCallback } from "react";
import type { ProjectSidebar } from "../components/ProjectSidebar";
import type { WorkspaceDialogStack } from "../components/WorkspaceDialogStack";
import type { FirstRunView } from "../components/WorkspaceOnboarding";
import type { WorkspaceProjectContent } from "../components/WorkspaceProjectContent";
import type { PersistenceAlert } from "../views/PersistenceAlert";
import { useWorkspaceCommands } from "./useWorkspaceCommands";
import { useWorkspaceDialogState } from "./useWorkspaceDialogState";
import { useWorkspaceExportActions } from "./useWorkspaceExportActions";
import { useWorkspaceFileActions } from "./useWorkspaceFileActions";
import { useWorkspaceModel } from "./useWorkspaceModel";
import { useWorkspaceRequestActions } from "./useWorkspaceRequestActions";
import { useWorkspaceScreenActions } from "./useWorkspaceScreenActions";
import { useWorkspaceTheme } from "./useWorkspaceTheme";

interface WorkspaceScreenController {
  isHydrating: boolean;
  sidebarProps: ComponentProps<typeof ProjectSidebar>;
  projectContentProps: ComponentProps<typeof WorkspaceProjectContent> | null;
  firstRunProps: ComponentProps<typeof FirstRunView>;
  persistenceAlertProps: ComponentProps<typeof PersistenceAlert> | null;
  dialogStackProps: ComponentProps<typeof WorkspaceDialogStack>;
}

export function useWorkspaceScreenController(): WorkspaceScreenController {
  const { dialogActions, dialogState } = useWorkspaceDialogState();
  const {
    activeSession,
    activeView,
    archiveProject,
    canEditProject,
    createNote,
    createProject,
    createTask,
    deleteFile,
    deleteNote,
    deleteProject,
    deleteTask,
    endActiveSession,
    exportPreview,
    files,
    flushWorkspacePersistence,
    importWorkspaceFiles,
    lastPersistedAt,
    persistenceError,
    persistenceMode,
    persistenceStatus,
    prepareJsonExport,
    prepareMarkdownExport,
    projectFiles,
    projectNotes,
    projectSessions,
    projectTasks,
    projectTimelineEvents,
    projects,
    recordProjectExport,
    repairWorkspaceStorage,
    replaceWorkspace,
    restoreProject,
    selectNote,
    selectProject,
    selectedNote,
    selectedProject,
    setActiveView,
    startSession,
    toggleProjectPinned,
    updateActiveSessionNotes,
    updateProject,
    updateSelectedNoteContent,
    updateSelectedNoteTitle,
    updateTaskStatus,
    workspaceSnapshot,
  } = useWorkspaceModel();

  const selectedProjectId = selectedProject?.id ?? null;
  const showFilesView = useCallback(() => setActiveView("files"), [setActiveView]);
  const {
    fileActionError,
    handleDeleteFile,
    handleImportFiles,
    handleOpenFile,
    handleRevealFile,
    removeProjectManagedFiles,
  } = useWorkspaceFileActions({
    canEditProject,
    files,
    hasSelectedProject: Boolean(selectedProjectId),
    onDeleteFile: deleteFile,
    onImportFiles: importWorkspaceFiles,
    onShowFilesView: showFilesView,
  });
  const {
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
  } = useWorkspaceExportActions({
    selectedProjectTitle: selectedProject?.title ?? null,
    workspaceSnapshot,
    onPrepareJsonExport: prepareJsonExport,
    onPrepareMarkdownExport: prepareMarkdownExport,
    onRecordProjectExport: recordProjectExport,
    onReplaceWorkspace: replaceWorkspace,
  });
  const {
    handleArchiveSelectedProject,
    handleConfirmNoteDelete,
    handleConfirmProjectDelete,
    handleConfirmStorageRepair,
    handleConfirmTaskDelete,
    handleCreateProject,
    handleCreateTask,
    handleRestoreSelectedProject,
    handleToggleSelectedProjectPinned,
    handleUpdateProject,
  } = useWorkspaceScreenActions({
    archiveProject,
    createProject,
    createTask,
    deleteNote,
    deleteProject,
    deleteTask,
    dialogActions,
    dialogState,
    removeProjectManagedFiles,
    repairWorkspaceStorage,
    restoreProject,
    selectedProjectId,
    toggleProjectPinned,
    updateProject,
  });
  const {
    requestDeleteFile,
    requestExportDiagnostics,
    requestImportFiles,
    requestOpenFile,
    requestRevealFile,
    requestRevealSavedExport,
    requestSaveProjectRecord,
    requestSaveWorkspaceBackup,
    requestSelectWorkspaceBackup,
  } = useWorkspaceRequestActions({
    deleteFile: handleDeleteFile,
    exportDiagnostics: handleExportDiagnostics,
    importFiles: handleImportFiles,
    openFile: handleOpenFile,
    revealFile: handleRevealFile,
    revealSavedExport: handleRevealSavedExport,
    saveProjectRecord: handleSaveProjectRecord,
    saveWorkspaceBackup: handleSaveWorkspaceBackup,
    selectWorkspaceBackup: handleSelectWorkspaceBackup,
  });

  useWorkspaceTheme(dialogState.themeMode);

  const commandPaletteItems = useWorkspaceCommands({
    canEditProject,
    hasActiveSession: Boolean(activeSession),
    selectedProjectId,
    selectedProjectTitle: selectedProject?.title ?? null,
    isSelectedProjectPinned: selectedProject?.isPinned ?? false,
    onCreateNote: createNote,
    onEndSession: endActiveSession,
    onExportDiagnostics: requestExportDiagnostics,
    onImportFiles: requestImportFiles,
    onOpenCommandPalette: dialogActions.openCommandPalette,
    onOpenCreateProject: dialogActions.openCreateProjectDialog,
    onOpenCreateTask: dialogActions.openCreateTaskDialog,
    onOpenProjectSettings: dialogActions.openProjectSettings,
    onOpenWorkspaceSettings: dialogActions.openWorkspaceSettings,
    onPrepareMarkdownExport: handlePrepareMarkdownExport,
    onRestoreWorkspaceBackup: requestSelectWorkspaceBackup,
    onSaveWorkspaceBackup: requestSaveWorkspaceBackup,
    onSelectView: setActiveView,
    onStartSession: startSession,
    onToggleProjectPinned: toggleProjectPinned,
  });

  return {
    isHydrating: persistenceStatus === "hydrating",
    sidebarProps: {
      projects,
      selectedProjectId,
      onSelectProject: selectProject,
      onCreateProject: dialogActions.openCreateProjectDialog,
      onToggleProjectPinned: toggleProjectPinned,
      onArchiveProject: archiveProject,
      onRestoreProject: restoreProject,
      onOpenWorkspaceSettings: dialogActions.openWorkspaceSettings,
      persistenceMode,
      persistenceStatus,
      persistenceError,
      lastPersistedAt,
    },
    projectContentProps: selectedProject
      ? {
          project: selectedProject,
          activeSession,
          activeView,
          canEditProject,
          exportPreview,
          exportSaveState,
          fileActionError,
          persistenceError,
          persistenceStatus,
          projectFiles,
          projectNotes,
          projectSessions,
          projectTasks,
          projectTimelineEvents,
          selectedNote,
          onArchiveProject: handleArchiveSelectedProject,
          onCreateNote: createNote,
          onCreateTask: dialogActions.openCreateTaskDialog,
          onDeleteFile: requestDeleteFile,
          onDeleteNote: dialogActions.requestNoteDelete,
          onDeleteTask: dialogActions.requestTaskDelete,
          onEndSession: endActiveSession,
          onFlushWorkspacePersistence: flushWorkspacePersistence,
          onImportFiles: requestImportFiles,
          onOpenFile: requestOpenFile,
          onOpenProjectSettings: dialogActions.openProjectSettings,
          onPrepareJsonExport: handlePrepareJsonExport,
          onPrepareMarkdownExport: handlePrepareMarkdownExport,
          onRequestStorageRepair: dialogActions.openStorageRepairConfirm,
          onRestoreProject: handleRestoreSelectedProject,
          onRevealFile: requestRevealFile,
          onRevealSavedExport: requestRevealSavedExport,
          onSaveProjectRecord: requestSaveProjectRecord,
          onSelectNote: selectNote,
          onSelectView: setActiveView,
          onStartSession: startSession,
          onTogglePinned: handleToggleSelectedProjectPinned,
          onUpdateActiveSessionNotes: updateActiveSessionNotes,
          onUpdateNoteContent: updateSelectedNoteContent,
          onUpdateNoteTitle: updateSelectedNoteTitle,
          onUpdateTaskStatus: updateTaskStatus,
        }
      : null,
    firstRunProps: {
      workspaceBackupState,
      onCreateProject: handleCreateProject,
      onSelectWorkspaceBackup: requestSelectWorkspaceBackup,
    },
    persistenceAlertProps:
      persistenceStatus === "error"
        ? {
            error: persistenceError,
            onRequestRepair: dialogActions.openStorageRepairConfirm,
          }
        : null,
    dialogStackProps: {
      commandPaletteItems,
      diagnosticsExportState,
      isCommandPaletteOpen: dialogState.isCommandPaletteOpen,
      isCreateProjectDialogOpen: dialogState.isCreateProjectDialogOpen,
      isCreateTaskDialogOpen: dialogState.isCreateTaskDialogOpen,
      isProjectSettingsOpen: dialogState.isProjectSettingsOpen,
      isStorageRepairConfirmOpen: dialogState.isStorageRepairConfirmOpen,
      isWorkspaceSettingsOpen: dialogState.isWorkspaceSettingsOpen,
      lastPersistedAt,
      pendingNoteDeleteId: dialogState.pendingNoteDeleteId,
      pendingProjectDeleteId: dialogState.pendingProjectDeleteId,
      pendingTaskDeleteId: dialogState.pendingTaskDeleteId,
      pendingWorkspaceRestore,
      persistenceError,
      persistenceMode,
      persistenceStatus,
      selectedProject,
      themeMode: dialogState.themeMode,
      workspaceBackupState,
      onCancelNoteDelete: dialogActions.cancelNoteDelete,
      onCancelProjectDelete: dialogActions.cancelProjectDelete,
      onCancelStorageRepair: dialogActions.cancelStorageRepair,
      onCancelTaskDelete: dialogActions.cancelTaskDelete,
      onCancelWorkspaceRestore: handleCancelWorkspaceRestore,
      onChangeTheme: dialogActions.changeTheme,
      onCloseCommandPalette: dialogActions.closeCommandPalette,
      onCloseCreateProject: dialogActions.closeCreateProjectDialog,
      onCloseCreateTask: dialogActions.closeCreateTaskDialog,
      onCloseProjectSettings: dialogActions.closeProjectSettings,
      onCloseWorkspaceSettings: dialogActions.closeWorkspaceSettings,
      onConfirmNoteDelete: handleConfirmNoteDelete,
      onConfirmProjectDelete: handleConfirmProjectDelete,
      onConfirmStorageRepair: handleConfirmStorageRepair,
      onConfirmTaskDelete: handleConfirmTaskDelete,
      onConfirmWorkspaceRestore: handleConfirmWorkspaceRestore,
      onCreateProject: handleCreateProject,
      onCreateTask: handleCreateTask,
      onExportDiagnostics: requestExportDiagnostics,
      onRequestProjectDelete: () => dialogActions.requestProjectDelete(selectedProjectId),
      onRequestStorageRepair: dialogActions.requestStorageRepairFromSettings,
      onSaveWorkspaceBackup: requestSaveWorkspaceBackup,
      onSelectWorkspaceBackup: requestSelectWorkspaceBackup,
      onUpdateProject: handleUpdateProject,
    },
  };
}
