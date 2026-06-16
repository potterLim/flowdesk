import { useCallback } from "react";
import type { NoteId, ProjectId, TaskId } from "../../../domain/workspace";
import type { CreateProjectInput, CreateTaskInput, UpdateProjectInput } from "../../../stores/workspaceStore";
import type { WorkspaceDialogActions, WorkspaceDialogState } from "./useWorkspaceDialogState";

interface UseWorkspaceScreenActionsInput {
  archiveProject: (projectId: ProjectId) => void;
  createProject: (input: CreateProjectInput) => void;
  createTask: (input: CreateTaskInput) => void;
  deleteNote: (noteId: NoteId) => void;
  deleteProject: (projectId: ProjectId) => void;
  deleteTask: (taskId: TaskId) => void;
  dialogActions: WorkspaceDialogActions;
  dialogState: WorkspaceDialogState;
  removeProjectManagedFiles: (projectId: ProjectId) => Promise<boolean>;
  repairWorkspaceStorage: () => void;
  restoreProject: (projectId: ProjectId) => void;
  selectedProjectId: ProjectId | null;
  toggleProjectPinned: (projectId: ProjectId) => void;
  updateProject: (projectId: ProjectId, input: UpdateProjectInput) => void;
}

export function useWorkspaceScreenActions({
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
}: UseWorkspaceScreenActionsInput) {
  const handleCreateProject = useCallback(
    (input: CreateProjectInput) => {
      createProject(input);
      dialogActions.closeCreateProjectDialog();
    },
    [createProject, dialogActions],
  );

  const handleCreateTask = useCallback(
    (input: CreateTaskInput) => {
      createTask(input);
      dialogActions.closeCreateTaskDialog();
    },
    [createTask, dialogActions],
  );

  const handleConfirmStorageRepair = useCallback(() => {
    dialogActions.cancelStorageRepair();
    repairWorkspaceStorage();
  }, [dialogActions, repairWorkspaceStorage]);

  const handleUpdateProject = useCallback(
    (input: UpdateProjectInput) => {
      if (!selectedProjectId) {
        return;
      }

      updateProject(selectedProjectId, input);
      dialogActions.closeProjectSettings();
    },
    [dialogActions, selectedProjectId, updateProject],
  );

  const handleConfirmProjectDelete = useCallback(async () => {
    if (!dialogState.pendingProjectDeleteId) {
      return;
    }

    if (await removeProjectManagedFiles(dialogState.pendingProjectDeleteId)) {
      deleteProject(dialogState.pendingProjectDeleteId);
    }

    dialogActions.cancelProjectDelete();
    dialogActions.closeProjectSettings();
  }, [deleteProject, dialogActions, dialogState.pendingProjectDeleteId, removeProjectManagedFiles]);

  const handleConfirmNoteDelete = useCallback(() => {
    if (!dialogState.pendingNoteDeleteId) {
      return;
    }

    deleteNote(dialogState.pendingNoteDeleteId);
    dialogActions.cancelNoteDelete();
  }, [deleteNote, dialogActions, dialogState.pendingNoteDeleteId]);

  const handleConfirmTaskDelete = useCallback(() => {
    if (!dialogState.pendingTaskDeleteId) {
      return;
    }

    deleteTask(dialogState.pendingTaskDeleteId);
    dialogActions.cancelTaskDelete();
  }, [deleteTask, dialogActions, dialogState.pendingTaskDeleteId]);

  const handleArchiveSelectedProject = useCallback(() => {
    if (selectedProjectId) {
      archiveProject(selectedProjectId);
    }
  }, [archiveProject, selectedProjectId]);

  const handleRestoreSelectedProject = useCallback(() => {
    if (selectedProjectId) {
      restoreProject(selectedProjectId);
    }
  }, [restoreProject, selectedProjectId]);

  const handleToggleSelectedProjectPinned = useCallback(() => {
    if (selectedProjectId) {
      toggleProjectPinned(selectedProjectId);
    }
  }, [selectedProjectId, toggleProjectPinned]);

  return {
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
  };
}
