import type { Project } from "../domain/workspace";
import { normalizeProjectInput } from "./workspaceStorePolicies";
import { persistCurrentState } from "./workspaceStorePersistence";
import type { WorkspaceState, WorkspaceStoreGet, WorkspaceStoreSet } from "./workspaceStoreTypes";
import {
  createProjectId,
  createTimelineEvent,
  getCurrentIsoDateTime,
  getSelectionAfterProjectArchive,
  getSelectionAfterProjectRemoval,
  getSelectionForProject,
  isProjectEditable,
} from "./workspaceStoreUtils";

type ProjectActionKeys =
  | "createProject"
  | "updateProject"
  | "deleteProject"
  | "toggleProjectPinned"
  | "archiveProject"
  | "restoreProject"
  | "selectProject"
  | "selectNote"
  | "setActiveView";

export function createProjectActions(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
): Pick<WorkspaceState, ProjectActionKeys> {
  return {
    createProject(input) {
      const state = get();
      const now = getCurrentIsoDateTime();
      const projectInput = normalizeProjectInput(input);
      const newProject: Project = {
        id: createProjectId(),
        title: projectInput.title,
        description: projectInput.description,
        createdAt: now,
        updatedAt: now,
        tags: projectInput.tags,
        status: "active",
        isPinned: false,
        accent: projectInput.accent,
        icon: projectInput.icon,
      };

      set({
        projects: [newProject, ...state.projects],
        timelineEvents: [
          createTimelineEvent(newProject.id, "Project created", `Created ${newProject.title}.`, "project_created"),
          ...state.timelineEvents,
        ],
        selectedProjectId: newProject.id,
        selectedNoteId: null,
        activeView: "overview",
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },

    updateProject(projectId, input) {
      const state = get();

      if (!isProjectEditable(state, projectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();
      const projectInput = normalizeProjectInput(input);

      set({
        projects: state.projects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                title: projectInput.title,
                description: projectInput.description,
                tags: projectInput.tags,
                accent: projectInput.accent,
                icon: projectInput.icon,
                updatedAt: now,
              }
            : project,
        ),
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },

    deleteProject(projectId) {
      const state = get();
      const nextProjects = state.projects.filter((project) => project.id !== projectId);
      const nextSelection = getSelectionAfterProjectRemoval(state, projectId);

      set({
        projects: nextProjects,
        notes: state.notes.filter((note) => note.projectId !== projectId),
        tasks: state.tasks.filter((task) => task.projectId !== projectId),
        sessions: state.sessions.filter((session) => session.projectId !== projectId),
        references: state.references.filter((reference) => reference.projectId !== projectId),
        files: state.files.filter((file) => file.projectId !== projectId),
        timelineEvents: state.timelineEvents.filter((event) => event.projectId !== projectId),
        selectedProjectId: nextSelection.projectId,
        selectedNoteId: nextSelection.noteId,
        activeView: "overview",
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },

    toggleProjectPinned(projectId) {
      const state = get();

      if (!isProjectEditable(state, projectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();

      set({
        projects: state.projects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                isPinned: !project.isPinned,
                updatedAt: now,
              }
            : project,
        ),
      });
      persistCurrentState(set, get);
    },

    archiveProject(projectId) {
      const state = get();

      if (!isProjectEditable(state, projectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();
      const nextProjects: Project[] = state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              status: "archived",
              isPinned: false,
              updatedAt: now,
            }
          : project,
      );
      const nextSelection = getSelectionAfterProjectArchive(state, projectId);

      set({
        projects: nextProjects,
        selectedProjectId: nextSelection.projectId,
        selectedNoteId: nextSelection.noteId,
        activeView: "overview",
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },

    restoreProject(projectId) {
      const state = get();
      const project = state.projects.find((candidateProject) => candidateProject.id === projectId);

      if (project?.status !== "archived") {
        return;
      }

      const now = getCurrentIsoDateTime();
      const nextSelection = getSelectionForProject(state, projectId);

      set({
        projects: state.projects.map((project) =>
          project.id === projectId
            ? {
                ...project,
                status: "active",
                updatedAt: now,
              }
            : project,
        ),
        selectedProjectId: nextSelection.projectId,
        selectedNoteId: nextSelection.noteId,
        activeView: "overview",
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },

    selectProject(projectId) {
      const state = get();
      const selection = getSelectionForProject(state, projectId);

      if (!selection.projectId) {
        return;
      }

      set({
        selectedProjectId: selection.projectId,
        selectedNoteId: selection.noteId,
        activeView: "overview",
        exportPreview: "",
      });
    },

    selectNote(noteId) {
      const state = get();
      const note = state.notes.find((candidateNote) => candidateNote.id === noteId);

      if (note?.projectId !== state.selectedProjectId) {
        return;
      }

      set({
        selectedNoteId: noteId,
        activeView: "notes",
      });
    },

    setActiveView(view) {
      set({ activeView: view });
    },
  };
}
