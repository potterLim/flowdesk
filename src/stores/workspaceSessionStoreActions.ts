import type { WorkSession } from "../domain/workspace";
import { getElapsedMinutes } from "../lib/date";
import { createDefaultSession } from "./workspaceStorePolicies";
import { persistCurrentState } from "./workspaceStorePersistence";
import type { WorkspaceState, WorkspaceStoreGet, WorkspaceStoreSet } from "./workspaceStoreTypes";
import {
  createTimelineEvent,
  createWorkSessionId,
  getCurrentIsoDateTime,
  isProjectEditable,
  updateProjectTimestamp,
} from "./workspaceStoreUtils";

type SessionActionKeys = "startSession" | "updateActiveSessionNotes" | "endActiveSession";

export function createSessionStoreActions(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
): Pick<WorkspaceState, SessionActionKeys> {
  return {
    startSession() {
      const state = get();
      const projectId = state.selectedProjectId;

      if (!projectId || !isProjectEditable(state, projectId)) {
        return;
      }

      const activeSession = findActiveProjectSession(state, projectId);

      if (activeSession) {
        return;
      }

      const now = getCurrentIsoDateTime();
      const newSession: WorkSession = createDefaultSession(projectId, now, createWorkSessionId());

      set({
        sessions: [newSession, ...state.sessions],
        activeView: "sessions",
        projects: updateProjectTimestamp(state.projects, projectId, now),
      });
      persistCurrentState(set, get);
    },

    updateActiveSessionNotes(notes) {
      const state = get();
      const activeSession = findActiveProjectSession(state, state.selectedProjectId);

      if (!activeSession || !isProjectEditable(state, activeSession.projectId)) {
        return;
      }

      const updatedAt = getCurrentIsoDateTime();

      set({
        sessions: state.sessions.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                notes,
              }
            : session,
        ),
        projects: updateProjectTimestamp(state.projects, activeSession.projectId, updatedAt),
      });
      persistCurrentState(set, get, { priority: "deferred" });
    },

    endActiveSession() {
      const state = get();
      const activeSession = findActiveProjectSession(state, state.selectedProjectId);

      if (!activeSession || !isProjectEditable(state, activeSession.projectId)) {
        return;
      }

      const endedAt = getCurrentIsoDateTime();
      const durationMinutes = getElapsedMinutes(activeSession.startedAt, endedAt);

      set({
        sessions: state.sessions.map((session) =>
          session.id === activeSession.id
            ? {
                ...session,
                endedAt,
                durationMinutes,
              }
            : session,
        ),
        timelineEvents: [
          createTimelineEvent(
            activeSession.projectId,
            "Session finished",
            `Finished ${activeSession.title} in ${durationMinutes} minutes.`,
            "session_finished",
          ),
          ...state.timelineEvents,
        ],
        projects: updateProjectTimestamp(state.projects, activeSession.projectId, endedAt),
      });
      persistCurrentState(set, get);
    },
  };
}

function findActiveProjectSession(
  state: WorkspaceState,
  projectId: WorkspaceState["selectedProjectId"],
): WorkSession | undefined {
  if (!projectId) {
    return undefined;
  }

  return state.sessions.find((session) => session.projectId === projectId && session.endedAt === null);
}
