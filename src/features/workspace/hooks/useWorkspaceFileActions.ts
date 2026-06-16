import { useCallback, useState } from "react";
import type { ProjectId, WorkspaceFile, WorkspaceFileId, WorkspaceFilePath } from "../../../domain/workspace";
import {
  openWorkspaceFile,
  removeManagedWorkspaceFiles,
  revealWorkspaceFile,
  selectWorkspaceFiles,
} from "../../../lib/platform/workspaceFiles";
import type { ImportWorkspaceFileInput } from "../../../stores/workspaceStore";
import { getErrorMessage } from "../workspaceUtils";

interface UseWorkspaceFileActionsInput {
  canEditProject: boolean;
  files: WorkspaceFile[];
  hasSelectedProject: boolean;
  onDeleteFile: (fileId: WorkspaceFileId) => void;
  onImportFiles: (files: ImportWorkspaceFileInput[]) => void;
  onShowFilesView: () => void;
}

export function useWorkspaceFileActions({
  canEditProject,
  files,
  hasSelectedProject,
  onDeleteFile,
  onImportFiles,
  onShowFilesView,
}: UseWorkspaceFileActionsInput) {
  const [fileActionError, setFileActionError] = useState<string | null>(null);

  const handleImportFiles = useCallback(async () => {
    if (!hasSelectedProject || !canEditProject) {
      return;
    }

    setFileActionError(null);

    try {
      const selectedFiles = await selectWorkspaceFiles();
      onImportFiles(selectedFiles);
    } catch (error: unknown) {
      setFileActionError(getErrorMessage(error));
      onShowFilesView();
    }
  }, [canEditProject, hasSelectedProject, onImportFiles, onShowFilesView]);

  const handleOpenFile = useCallback(async (path: WorkspaceFilePath) => {
    setFileActionError(null);

    try {
      await openWorkspaceFile(path);
    } catch (error: unknown) {
      setFileActionError(getErrorMessage(error));
    }
  }, []);

  const handleRevealFile = useCallback(async (path: WorkspaceFilePath) => {
    setFileActionError(null);

    try {
      await revealWorkspaceFile(path);
    } catch (error: unknown) {
      setFileActionError(getErrorMessage(error));
    }
  }, []);

  const handleDeleteFile = useCallback(
    async (fileId: WorkspaceFileId) => {
      const workspaceFile = files.find((file) => file.id === fileId);

      if (!workspaceFile) {
        return;
      }

      setFileActionError(null);

      try {
        await removeManagedWorkspaceFiles([workspaceFile]);
        onDeleteFile(fileId);
      } catch (error: unknown) {
        setFileActionError(getErrorMessage(error));
        onShowFilesView();
      }
    },
    [files, onDeleteFile, onShowFilesView],
  );

  const removeProjectManagedFiles = useCallback(
    async (projectId: ProjectId): Promise<boolean> => {
      const projectFilesToRemove = files.filter((file) => file.projectId === projectId);

      setFileActionError(null);

      try {
        await removeManagedWorkspaceFiles(projectFilesToRemove);
        return true;
      } catch (error: unknown) {
        setFileActionError(getErrorMessage(error));
        onShowFilesView();
        return false;
      }
    },
    [files, onShowFilesView],
  );

  return {
    fileActionError,
    handleDeleteFile,
    handleImportFiles,
    handleOpenFile,
    handleRevealFile,
    removeProjectManagedFiles,
  };
}
