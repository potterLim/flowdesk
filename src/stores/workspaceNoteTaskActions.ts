import type { Note, Task } from "../domain/workspace";
import { createDefaultNote, getNoteCreatedDescription, normalizeTaskInput } from "./workspaceStorePolicies";
import { persistCurrentState } from "./workspaceStorePersistence";
import type { WorkspaceState, WorkspaceStoreGet, WorkspaceStoreSet } from "./workspaceStoreTypes";
import {
  createNoteId,
  createTaskId,
  createTimelineEvent,
  getCurrentIsoDateTime,
  isProjectEditable,
  updateProjectTimestamp,
} from "./workspaceStoreUtils";

type NoteTaskActionKeys =
  | "updateSelectedNoteTitle"
  | "updateSelectedNoteContent"
  | "createNote"
  | "deleteNote"
  | "createTask"
  | "updateTaskStatus"
  | "deleteTask";

export function createNoteTaskActions(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
): Pick<WorkspaceState, NoteTaskActionKeys> {
  return {
    updateSelectedNoteTitle(title) {
      const state = get();
      const updatedAt = getCurrentIsoDateTime();
      const selectedNote = state.notes.find((note) => note.id === state.selectedNoteId);
      const isSelectedNoteInCurrentProject = selectedNote?.projectId === state.selectedProjectId;

      if (!selectedNote || !isSelectedNoteInCurrentProject || !isProjectEditable(state, selectedNote.projectId)) {
        return;
      }

      set({
        notes: state.notes.map((note) =>
          note.id === selectedNote.id
            ? {
                ...note,
                title,
                updatedAt,
              }
            : note,
        ),
        projects: updateProjectTimestamp(state.projects, selectedNote.projectId, updatedAt),
      });
      persistCurrentState(set, get, { priority: "deferred" });
    },

    updateSelectedNoteContent(content) {
      const state = get();
      const updatedAt = getCurrentIsoDateTime();
      const selectedNote = state.notes.find((note) => note.id === state.selectedNoteId);
      const isSelectedNoteInCurrentProject = selectedNote?.projectId === state.selectedProjectId;

      if (!selectedNote || !isSelectedNoteInCurrentProject || !isProjectEditable(state, selectedNote.projectId)) {
        return;
      }

      set({
        notes: state.notes.map((note) =>
          note.id === selectedNote.id
            ? {
                ...note,
                content,
                updatedAt,
              }
            : note,
        ),
        projects: updateProjectTimestamp(state.projects, selectedNote.projectId, updatedAt),
      });
      persistCurrentState(set, get, { priority: "deferred" });
    },

    createNote() {
      const state = get();

      if (!state.selectedProjectId || !isProjectEditable(state, state.selectedProjectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();
      const newNote: Note = createDefaultNote(state.selectedProjectId, now, createNoteId());

      set({
        notes: [newNote, ...state.notes],
        selectedNoteId: newNote.id,
        activeView: "notes",
        projects: updateProjectTimestamp(state.projects, state.selectedProjectId, now),
        timelineEvents: [
          createTimelineEvent(state.selectedProjectId, "Note created", getNoteCreatedDescription(), "note_created"),
          ...state.timelineEvents,
        ],
      });
      persistCurrentState(set, get);
    },

    deleteNote(noteId) {
      const state = get();
      const note = state.notes.find((candidateNote) => candidateNote.id === noteId);

      if (!note || !isProjectEditable(state, note.projectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();
      const projectNotes = state.notes.filter(
        (candidateNote) => candidateNote.projectId === note.projectId && candidateNote.id !== noteId,
      );
      const nextSelectedNote =
        state.selectedNoteId === noteId
          ? projectNotes[0]
          : projectNotes.find((candidateNote) => candidateNote.id === state.selectedNoteId);

      set({
        notes: state.notes.filter((candidateNote) => candidateNote.id !== noteId),
        selectedNoteId: nextSelectedNote?.id ?? null,
        activeView: projectNotes.length > 0 ? "notes" : "overview",
        projects: updateProjectTimestamp(state.projects, note.projectId, now),
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },

    createTask(input) {
      const state = get();

      if (!state.selectedProjectId || !isProjectEditable(state, state.selectedProjectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();
      const taskInput = normalizeTaskInput(input);
      const newTask: Task = {
        id: createTaskId(),
        projectId: state.selectedProjectId,
        title: taskInput.title,
        status: "todo",
        priority: taskInput.priority,
        dueDate: taskInput.dueDate,
        tags: taskInput.tags,
        linkedSessionId: null,
        createdAt: now,
        updatedAt: now,
      };

      set({
        tasks: [newTask, ...state.tasks],
        activeView: "tasks",
        projects: updateProjectTimestamp(state.projects, state.selectedProjectId, now),
      });
      persistCurrentState(set, get);
    },

    updateTaskStatus(taskId, status) {
      const state = get();
      const now = getCurrentIsoDateTime();
      const task = state.tasks.find((candidateTask) => candidateTask.id === taskId);

      if (!task || !isProjectEditable(state, task.projectId)) {
        return;
      }

      const timelineEvents =
        status === "done" && task.status !== "done"
          ? [
              createTimelineEvent(task.projectId, "Task completed", `Completed ${task.title}.`, "task_completed"),
              ...state.timelineEvents,
            ]
          : state.timelineEvents;

      set({
        tasks: state.tasks.map((candidateTask) =>
          candidateTask.id === taskId
            ? {
                ...candidateTask,
                status,
                updatedAt: now,
              }
            : candidateTask,
        ),
        timelineEvents,
        projects: updateProjectTimestamp(state.projects, task.projectId, now),
      });
      persistCurrentState(set, get);
    },

    deleteTask(taskId) {
      const state = get();
      const task = state.tasks.find((candidateTask) => candidateTask.id === taskId);

      if (!task || !isProjectEditable(state, task.projectId)) {
        return;
      }

      const now = getCurrentIsoDateTime();

      set({
        tasks: state.tasks.filter((candidateTask) => candidateTask.id !== taskId),
        projects: updateProjectTimestamp(state.projects, task.projectId, now),
        exportPreview: "",
      });
      persistCurrentState(set, get);
    },
  };
}
