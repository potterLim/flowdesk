import type {
  IsoDateTimeString,
  NoteId,
  Project,
  ProjectId,
  TaskId,
  TimelineEvent,
  TimelineEventId,
  WorkSessionId,
  WorkspaceFileId,
  WorkspaceSnapshot,
} from "../domain/workspace";
import {
  toIsoDateTimeString,
  toNoteId,
  toProjectId,
  toTaskId,
  toTimelineEventId,
  toWorkSessionId,
  toWorkspaceFileId,
} from "../domain/workspaceValues";
import type { WorkspaceState } from "./workspaceStoreTypes";

export interface WorkspaceSelection {
  projectId: ProjectId | null;
  noteId: NoteId | null;
}

export function createEmptyWorkspace(): WorkspaceSnapshot {
  return {
    projects: [],
    notes: [],
    tasks: [],
    sessions: [],
    references: [],
    files: [],
    timelineEvents: [],
  };
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createProjectId(): ProjectId {
  return toProjectId(createId("project"));
}

export function createNoteId(): NoteId {
  return toNoteId(createId("note"));
}

export function createTaskId(): TaskId {
  return toTaskId(createId("task"));
}

export function createWorkSessionId(): WorkSessionId {
  return toWorkSessionId(createId("session"));
}

export function createWorkspaceFileId(): WorkspaceFileId {
  return toWorkspaceFileId(createId("file"));
}

export function createTimelineEventId(): TimelineEventId {
  return toTimelineEventId(createId("event"));
}

export function getCurrentIsoDateTime(): IsoDateTimeString {
  return toIsoDateTimeString(new Date().toISOString());
}

export function getSnapshotFromState(state: WorkspaceState): WorkspaceSnapshot {
  return {
    projects: state.projects,
    notes: state.notes,
    tasks: state.tasks,
    sessions: state.sessions,
    references: state.references,
    files: state.files,
    timelineEvents: state.timelineEvents,
  };
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  if (typeof error === "object" && error !== null) {
    const serializedError = JSON.stringify(error);

    if (serializedError && serializedError !== "{}") {
      return serializedError;
    }
  }

  return "FlowDesk could not save the workspace.";
}

export function updateProjectTimestamp(
  projects: Project[],
  projectId: ProjectId,
  updatedAt: IsoDateTimeString,
): Project[] {
  return projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          updatedAt,
        }
      : project,
  );
}

export function getProjectIcon(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
    .padEnd(2, "P")
    .slice(0, 2);
}

export function isProjectEditable(state: WorkspaceState, projectId: ProjectId): boolean {
  return state.projects.some((project) => project.id === projectId && project.status === "active");
}

export function createTimelineEvent(
  projectId: ProjectId,
  title: string,
  description: string,
  type: TimelineEvent["type"],
): TimelineEvent {
  return {
    id: createTimelineEventId(),
    projectId,
    title,
    description,
    type,
    createdAt: getCurrentIsoDateTime(),
  };
}

export function getInitialSelection(snapshot: WorkspaceSnapshot): WorkspaceSelection {
  const project =
    snapshot.projects.find((candidateProject) => candidateProject.status === "active") ?? snapshot.projects[0];
  const note = project ? snapshot.notes.find((candidateNote) => candidateNote.projectId === project.id) : undefined;

  return {
    projectId: project?.id ?? null,
    noteId: note?.id ?? null,
  };
}

export function getSelectionForProject(state: WorkspaceState, projectId: ProjectId): WorkspaceSelection {
  const project = state.projects.find((candidateProject) => candidateProject.id === projectId);
  const note = project ? state.notes.find((candidateNote) => candidateNote.projectId === project.id) : undefined;

  return {
    projectId: project?.id ?? null,
    noteId: note?.id ?? null,
  };
}

export function getSelectionAfterProjectRemoval(
  state: WorkspaceState,
  removedProjectId: ProjectId,
): WorkspaceSelection {
  const remainingProjects = state.projects.filter((project) => project.id !== removedProjectId);
  const preferredProject =
    state.selectedProjectId === removedProjectId
      ? (remainingProjects.find((project) => project.status === "active") ?? remainingProjects[0])
      : (remainingProjects.find((project) => project.id === state.selectedProjectId) ??
        remainingProjects.find((project) => project.status === "active") ??
        remainingProjects[0]);
  const note = preferredProject
    ? state.notes.find((candidateNote) => candidateNote.projectId === preferredProject.id)
    : undefined;

  return {
    projectId: preferredProject?.id ?? null,
    noteId: note?.id ?? null,
  };
}

export function getSelectionAfterProjectArchive(
  state: WorkspaceState,
  archivedProjectId: ProjectId,
): WorkspaceSelection {
  const preferredProject =
    state.selectedProjectId === archivedProjectId
      ? (state.projects.find((project) => project.status === "active" && project.id !== archivedProjectId) ??
        state.projects.find((project) => project.id === archivedProjectId))
      : (state.projects.find((project) => project.id === state.selectedProjectId) ??
        state.projects.find((project) => project.status === "active" && project.id !== archivedProjectId) ??
        state.projects[0]);
  const note = preferredProject
    ? state.notes.find((candidateNote) => candidateNote.projectId === preferredProject.id)
    : undefined;

  return {
    projectId: preferredProject?.id ?? null,
    noteId: note?.id ?? null,
  };
}
