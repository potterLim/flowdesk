import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useWorkspaceStore } from "../../../stores/workspaceStore";
import { deriveWorkspaceModelData } from "./workspaceModelDerivations";

export function useWorkspaceModel() {
  const workspaceData = useWorkspaceStore(
    useShallow((state) => ({
      activeView: state.activeView,
      exportPreview: state.exportPreview,
      files: state.files,
      lastPersistedAt: state.lastPersistedAt,
      notes: state.notes,
      persistenceError: state.persistenceError,
      persistenceMode: state.persistenceMode,
      persistenceStatus: state.persistenceStatus,
      projects: state.projects,
      references: state.references,
      selectedNoteId: state.selectedNoteId,
      selectedProjectId: state.selectedProjectId,
      sessions: state.sessions,
      tasks: state.tasks,
      timelineEvents: state.timelineEvents,
    })),
  );
  const workspaceActions = useWorkspaceStore(
    useShallow((state) => ({
      archiveProject: state.archiveProject,
      createNote: state.createNote,
      createProject: state.createProject,
      createTask: state.createTask,
      deleteFile: state.deleteFile,
      deleteNote: state.deleteNote,
      deleteProject: state.deleteProject,
      deleteTask: state.deleteTask,
      endActiveSession: state.endActiveSession,
      flushWorkspacePersistence: state.flushWorkspacePersistence,
      importWorkspaceFiles: state.importFiles,
      prepareJsonExport: state.prepareJsonExport,
      prepareMarkdownExport: state.prepareMarkdownExport,
      recordProjectExport: state.recordProjectExport,
      repairWorkspaceStorage: state.repairWorkspaceStorage,
      replaceWorkspace: state.replaceWorkspace,
      restoreProject: state.restoreProject,
      selectNote: state.selectNote,
      selectProject: state.selectProject,
      setActiveView: state.setActiveView,
      startSession: state.startSession,
      toggleProjectPinned: state.toggleProjectPinned,
      updateActiveSessionNotes: state.updateActiveSessionNotes,
      updateProject: state.updateProject,
      updateSelectedNoteContent: state.updateSelectedNoteContent,
      updateSelectedNoteTitle: state.updateSelectedNoteTitle,
      updateTaskStatus: state.updateTaskStatus,
    })),
  );

  const derivedModel = useMemo(() => deriveWorkspaceModelData(workspaceData), [workspaceData]);

  return {
    ...derivedModel,
    ...workspaceActions,
    activeView: workspaceData.activeView,
    exportPreview: workspaceData.exportPreview,
    files: workspaceData.files,
    lastPersistedAt: workspaceData.lastPersistedAt,
    persistenceError: workspaceData.persistenceError,
    persistenceMode: workspaceData.persistenceMode,
    persistenceStatus: workspaceData.persistenceStatus,
    projects: workspaceData.projects,
    timelineEvents: workspaceData.timelineEvents,
  };
}
