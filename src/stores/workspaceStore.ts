import { create } from "zustand";
import type {
  Note,
  Project,
  Task,
  TaskStatus,
  TimelineEvent,
  WorkSession,
  WorkspaceFile,
  WorkspaceFileStorageMode,
  WorkspaceSnapshot,
  WorkspaceView,
} from "../domain/workspace";
import { getElapsedMinutes } from "../lib/date";
import {
  getWorkspaceRepository,
  resetWorkspaceRepositoryStorage,
  type WorkspacePersistenceMode,
} from "../lib/persistence/workspaceRepository";
import {
  buildProjectRecordJson,
  buildProjectRecordMarkdown,
  getProjectRecordSnapshot,
} from "../lib/projectRecordExport";

export type PersistenceStatus = "hydrating" | "saving" | "saved" | "error";

export interface CreateProjectInput {
  title: string;
  description: string;
  tags: string[];
  accent: Project["accent"];
}

export interface UpdateProjectInput extends CreateProjectInput {}

export interface CreateTaskInput {
  title: string;
  priority: Task["priority"];
  dueDate: string | null;
  tags: string[];
}

export interface ImportWorkspaceFileInput {
  name: string;
  fileType: WorkspaceFile["fileType"];
  sizeLabel: string;
  path: string;
  sourcePath: string | null;
  storageMode: WorkspaceFileStorageMode;
  tags?: string[];
}

interface WorkspaceState extends WorkspaceSnapshot {
  activeView: WorkspaceView;
  selectedProjectId: string;
  selectedNoteId: string;
  exportPreview: string;
  persistenceMode: WorkspacePersistenceMode;
  persistenceStatus: PersistenceStatus;
  persistenceError: string | null;
  lastPersistedAt: string | null;
  hydrateWorkspace: () => void;
  repairWorkspaceStorage: () => void;
  createProject: (input: CreateProjectInput) => void;
  updateProject: (projectId: string, input: UpdateProjectInput) => void;
  deleteProject: (projectId: string) => void;
  toggleProjectPinned: (projectId: string) => void;
  archiveProject: (projectId: string) => void;
  restoreProject: (projectId: string) => void;
  selectProject: (projectId: string) => void;
  selectNote: (noteId: string) => void;
  setActiveView: (view: WorkspaceView) => void;
  updateSelectedNoteTitle: (title: string) => void;
  updateSelectedNoteContent: (content: string) => void;
  createNote: () => void;
  deleteNote: (noteId: string) => void;
  createTask: (input: CreateTaskInput) => void;
  updateTaskStatus: (taskId: string, status: TaskStatus) => void;
  deleteTask: (taskId: string) => void;
  importFiles: (files: ImportWorkspaceFileInput[]) => void;
  deleteFile: (fileId: string) => void;
  startSession: () => void;
  updateActiveSessionNotes: (notes: string) => void;
  endActiveSession: () => void;
  prepareMarkdownExport: () => string | null;
  prepareJsonExport: () => string | null;
  replaceWorkspace: (snapshot: WorkspaceSnapshot) => void;
  resetWorkspace: () => void;
}

function createInitialState(): WorkspaceSnapshot {
  return createEmptyWorkspace();
}

function createEmptyWorkspace(): WorkspaceSnapshot {
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

function getSnapshotFromState(state: WorkspaceState): WorkspaceSnapshot {
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

let persistenceQueue: Promise<void> = Promise.resolve();
let persistenceRevision = 0;

function getErrorMessage(error: unknown): string {
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

function persistCurrentState(set: (partial: Partial<WorkspaceState>) => void, get: () => WorkspaceState): void {
  const snapshot = getSnapshotFromState(get());
  const revision = ++persistenceRevision;

  set({ persistenceStatus: "saving", persistenceError: null });

  persistenceQueue = persistenceQueue
    .catch(() => undefined)
    .then(async () => {
      const repository = await getWorkspaceRepository();

      await repository.saveWorkspace(snapshot);

      if (revision === persistenceRevision) {
        set({
          persistenceMode: repository.mode,
          persistenceStatus: "saved",
          persistenceError: null,
          lastPersistedAt: new Date().toISOString(),
        });
      }
    })
    .catch((error: unknown) => {
      console.error("Failed to persist FlowDesk workspace", error);

      if (revision === persistenceRevision) {
        set({
          persistenceStatus: "error",
          persistenceError: getErrorMessage(error),
        });
      }
    });
}

function updateProjectTimestamp(projects: Project[], projectId: string, updatedAt: string): Project[] {
  return projects.map((project) =>
    project.id === projectId
      ? {
          ...project,
          updatedAt,
        }
      : project,
  );
}

function getProjectIcon(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("")
    .padEnd(2, "P")
    .slice(0, 2);
}

function isProjectEditable(state: WorkspaceState, projectId: string): boolean {
  return state.projects.some((project) => project.id === projectId && project.status === "active");
}

function createTimelineEvent(projectId: string, title: string, description: string, type: TimelineEvent["type"]): TimelineEvent {
  return {
    id: createId("event"),
    projectId,
    title,
    description,
    type,
    createdAt: new Date().toISOString(),
  };
}

const initialSnapshot = createInitialState();

function getInitialSelection(snapshot: WorkspaceSnapshot): { projectId: string; noteId: string } {
  const project = snapshot.projects.find((candidateProject) => candidateProject.status === "active") ?? snapshot.projects[0];
  const note = project ? snapshot.notes.find((candidateNote) => candidateNote.projectId === project.id) : undefined;

  return {
    projectId: project?.id ?? "",
    noteId: note?.id ?? "",
  };
}

const initialSelection = getInitialSelection(initialSnapshot);

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  ...initialSnapshot,
  activeView: "overview",
  selectedProjectId: initialSelection.projectId,
  selectedNoteId: initialSelection.noteId,
  exportPreview: "",
  persistenceMode: "browser",
  persistenceStatus: "hydrating",
  persistenceError: null,
  lastPersistedAt: null,

  hydrateWorkspace() {
    void getWorkspaceRepository()
      .then(async (repository) => {
        const storedSnapshot = await repository.loadWorkspace();
        const now = new Date().toISOString();

        if (storedSnapshot) {
          const selection = getInitialSelection(storedSnapshot);

          set({
            ...storedSnapshot,
            selectedProjectId: selection.projectId,
            selectedNoteId: selection.noteId,
            activeView: "overview",
            exportPreview: "",
            persistenceMode: repository.mode,
            persistenceStatus: "saved",
            persistenceError: null,
            lastPersistedAt: now,
          });

          return;
        }

        set({ persistenceMode: repository.mode, persistenceStatus: "saving", persistenceError: null });
        await repository.saveWorkspace(getSnapshotFromState(get()));
        set({
          persistenceStatus: "saved",
          persistenceError: null,
          lastPersistedAt: new Date().toISOString(),
        });
      })
      .catch((error: unknown) => {
        console.error("Failed to hydrate FlowDesk workspace", error);
        set({
          persistenceStatus: "error",
          persistenceError: getErrorMessage(error),
        });
      });
  },

  repairWorkspaceStorage() {
    set({ persistenceStatus: "saving", persistenceError: null });
    void resetWorkspaceRepositoryStorage()
      .then(() => get().hydrateWorkspace())
      .catch((error: unknown) => {
        console.error("Failed to rebuild FlowDesk workspace storage", error);
        set({
          persistenceStatus: "error",
          persistenceError: getErrorMessage(error),
        });
      });
  },

  createProject(input) {
    const state = get();
    const now = new Date().toISOString();
    const normalizedTitle = input.title.trim();
    const title = normalizedTitle.length > 0 ? normalizedTitle : "Untitled Project";
    const description = input.description.trim();
    const newProject: Project = {
      id: createId("project"),
      title,
      description,
      createdAt: now,
      updatedAt: now,
      tags: input.tags,
      status: "active",
      isPinned: false,
      accent: input.accent,
      icon: getProjectIcon(title),
    };

    set({
      projects: [newProject, ...state.projects],
      timelineEvents: [
        createTimelineEvent(newProject.id, "Project created", `Created ${newProject.title}.`, "project_created"),
        ...state.timelineEvents,
      ],
      selectedProjectId: newProject.id,
      selectedNoteId: "",
      activeView: "overview",
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },

  updateProject(projectId, input) {
    const state = get();
    const now = new Date().toISOString();
    const normalizedTitle = input.title.trim();
    const title = normalizedTitle.length > 0 ? normalizedTitle : "Untitled Project";

    set({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              title,
              description: input.description.trim(),
              tags: input.tags,
              accent: input.accent,
              icon: getProjectIcon(title),
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
    const nextSelectedProject =
      state.selectedProjectId === projectId
        ? nextProjects.find((project) => project.status === "active") ?? nextProjects[0]
        : nextProjects.find((project) => project.id === state.selectedProjectId) ?? nextProjects[0];
    const nextSelectedNote = nextSelectedProject
      ? state.notes.find((note) => note.projectId === nextSelectedProject.id)
      : undefined;

    set({
      projects: nextProjects,
      notes: state.notes.filter((note) => note.projectId !== projectId),
      tasks: state.tasks.filter((task) => task.projectId !== projectId),
      sessions: state.sessions.filter((session) => session.projectId !== projectId),
      references: state.references.filter((reference) => reference.projectId !== projectId),
      files: state.files.filter((file) => file.projectId !== projectId),
      timelineEvents: state.timelineEvents.filter((event) => event.projectId !== projectId),
      selectedProjectId: nextSelectedProject?.id ?? "",
      selectedNoteId: nextSelectedNote?.id ?? "",
      activeView: "overview",
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },

  toggleProjectPinned(projectId) {
    const state = get();
    const now = new Date().toISOString();

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
    const now = new Date().toISOString();
    const nextProjects = state.projects.map((project) =>
      project.id === projectId
        ? {
            ...project,
            status: "archived" as const,
            isPinned: false,
            updatedAt: now,
          }
        : project,
    );
    const nextSelectedProject =
      state.selectedProjectId === projectId
        ? nextProjects.find((project) => project.status === "active") ?? nextProjects[0]
        : nextProjects.find((project) => project.id === state.selectedProjectId) ?? nextProjects[0];
    const nextSelectedNote = nextSelectedProject
      ? state.notes.find((note) => note.projectId === nextSelectedProject.id) ?? state.notes.find((note) => note.projectId !== projectId)
      : undefined;

    set({
      projects: nextProjects,
      selectedProjectId: nextSelectedProject?.id ?? "",
      selectedNoteId: nextSelectedNote?.id ?? "",
      activeView: "overview",
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },

  restoreProject(projectId) {
    const state = get();
    const now = new Date().toISOString();

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
      selectedProjectId: projectId,
      activeView: "overview",
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },

  selectProject(projectId) {
    const firstProjectNote = get().notes.find((note) => note.projectId === projectId);

    set({
      selectedProjectId: projectId,
      selectedNoteId: firstProjectNote?.id ?? "",
      activeView: "overview",
      exportPreview: "",
    });
  },

  selectNote(noteId) {
    set({
      selectedNoteId: noteId,
      activeView: "notes",
    });
  },

  setActiveView(view) {
    set({ activeView: view });
  },

  updateSelectedNoteTitle(title) {
    const state = get();
    const updatedAt = new Date().toISOString();
    const selectedNote = state.notes.find((note) => note.id === state.selectedNoteId);

    if (!selectedNote) {
      return;
    }

    if (!isProjectEditable(state, selectedNote.projectId)) {
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
    persistCurrentState(set, get);
  },

  updateSelectedNoteContent(content) {
    const state = get();
    const updatedAt = new Date().toISOString();
    const selectedNote = state.notes.find((note) => note.id === state.selectedNoteId);

    if (!selectedNote) {
      return;
    }

    if (!isProjectEditable(state, selectedNote.projectId)) {
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
    persistCurrentState(set, get);
  },

  createNote() {
    const state = get();

    if (!state.selectedProjectId) {
      return;
    }

    if (!isProjectEditable(state, state.selectedProjectId)) {
      return;
    }

    const now = new Date().toISOString();
    const newNote: Note = {
      id: createId("note"),
      projectId: state.selectedProjectId,
      title: "Untitled note",
      folder: "Inbox",
      content: "",
      createdAt: now,
      updatedAt: now,
    };

    set({
      notes: [newNote, ...state.notes],
      selectedNoteId: newNote.id,
      activeView: "notes",
      projects: updateProjectTimestamp(state.projects, state.selectedProjectId, now),
      timelineEvents: [
        createTimelineEvent(state.selectedProjectId, "Note created", "Created a note in Inbox.", "note_created"),
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

    const now = new Date().toISOString();
    const projectNotes = state.notes.filter((candidateNote) => candidateNote.projectId === note.projectId && candidateNote.id !== noteId);
    const nextSelectedNote =
      state.selectedNoteId === noteId ? projectNotes[0] : state.notes.find((candidateNote) => candidateNote.id === state.selectedNoteId);

    set({
      notes: state.notes.filter((candidateNote) => candidateNote.id !== noteId),
      selectedNoteId: nextSelectedNote?.id ?? "",
      activeView: projectNotes.length > 0 ? "notes" : "overview",
      projects: updateProjectTimestamp(state.projects, note.projectId, now),
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },

  createTask(input) {
    const state = get();

    if (!state.selectedProjectId) {
      return;
    }

    if (!isProjectEditable(state, state.selectedProjectId)) {
      return;
    }

    const now = new Date().toISOString();
    const title = input.title.trim();
    const newTask: Task = {
      id: createId("task"),
      projectId: state.selectedProjectId,
      title: title || "Untitled task",
      status: "todo",
      priority: input.priority,
      dueDate: input.dueDate,
      tags: input.tags,
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
    const now = new Date().toISOString();
    const task = state.tasks.find((candidateTask) => candidateTask.id === taskId);

    if (!task) {
      return;
    }

    if (!isProjectEditable(state, task.projectId)) {
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

    const now = new Date().toISOString();

    set({
      tasks: state.tasks.filter((candidateTask) => candidateTask.id !== taskId),
      projects: updateProjectTimestamp(state.projects, task.projectId, now),
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },

  importFiles(files) {
    const state = get();

    if (!state.selectedProjectId || files.length === 0) {
      return;
    }

    if (!isProjectEditable(state, state.selectedProjectId)) {
      return;
    }

    const now = new Date().toISOString();
    const importedFiles: WorkspaceFile[] = files.map((file) => ({
      id: createId("file"),
      projectId: state.selectedProjectId,
      name: file.name.trim() || "Untitled file",
      fileType: file.fileType,
      sizeLabel: file.sizeLabel,
      path: file.path,
      sourcePath: file.sourcePath,
      storageMode: file.storageMode,
      tags: file.tags ?? [],
      importedAt: now,
    }));

    set({
      files: [...importedFiles, ...state.files],
      activeView: "files",
      timelineEvents: [
        createTimelineEvent(
          state.selectedProjectId,
          importedFiles.length === 1 ? "File imported" : "Files imported",
          importedFiles.length === 1
            ? `Imported ${importedFiles[0].name}.`
            : `Imported ${importedFiles.length} files.`,
          "file_imported",
        ),
        ...state.timelineEvents,
      ],
      projects: updateProjectTimestamp(state.projects, state.selectedProjectId, now),
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },

  deleteFile(fileId) {
    const state = get();
    const file = state.files.find((candidateFile) => candidateFile.id === fileId);

    if (!file || !isProjectEditable(state, file.projectId)) {
      return;
    }

    const now = new Date().toISOString();

    set({
      files: state.files.filter((candidateFile) => candidateFile.id !== fileId),
      projects: updateProjectTimestamp(state.projects, file.projectId, now),
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },

  startSession() {
    const state = get();

    if (!state.selectedProjectId) {
      return;
    }

    if (!isProjectEditable(state, state.selectedProjectId)) {
      return;
    }

    const activeSession = state.sessions.find(
      (session) => session.projectId === state.selectedProjectId && session.endedAt === null,
    );

    if (activeSession) {
      return;
    }

    const now = new Date().toISOString();
    const newSession: WorkSession = {
      id: createId("session"),
      projectId: state.selectedProjectId,
      title: "Focus session",
      notes: "",
      startedAt: now,
      endedAt: null,
      durationMinutes: null,
    };

    set({
      sessions: [newSession, ...state.sessions],
      activeView: "sessions",
      projects: updateProjectTimestamp(state.projects, state.selectedProjectId, now),
    });
    persistCurrentState(set, get);
  },

  updateActiveSessionNotes(notes) {
    const state = get();
    const activeSession = state.sessions.find(
      (session) => session.projectId === state.selectedProjectId && session.endedAt === null,
    );

    if (!activeSession || !isProjectEditable(state, activeSession.projectId)) {
      return;
    }

    const updatedAt = new Date().toISOString();

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
    persistCurrentState(set, get);
  },

  endActiveSession() {
    const state = get();
    const activeSession = state.sessions.find(
      (session) => session.projectId === state.selectedProjectId && session.endedAt === null,
    );

    if (!activeSession) {
      return;
    }

    if (!isProjectEditable(state, activeSession.projectId)) {
      return;
    }

    const endedAt = new Date().toISOString();
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

  prepareMarkdownExport() {
    const state = get();
    const project = state.projects.find((candidateProject) => candidateProject.id === state.selectedProjectId);

    if (!project) {
      return null;
    }

    const projectRecord = getProjectRecordSnapshot(getSnapshotFromState(state), project.id);

    if (!projectRecord) {
      return null;
    }

    const exportContent = buildProjectRecordMarkdown(projectRecord);

    set({
      exportPreview: exportContent,
      activeView: "exports",
      timelineEvents: [
        createTimelineEvent(project.id, "Export generated", "Prepared Markdown project record.", "export_generated"),
        ...state.timelineEvents,
      ],
    });
    persistCurrentState(set, get);

    return exportContent;
  },

  prepareJsonExport() {
    const state = get();
    const projectId = state.selectedProjectId;
    const project = state.projects.find((candidateProject) => candidateProject.id === projectId);

    if (!project) {
      return null;
    }

    const projectRecord = getProjectRecordSnapshot(getSnapshotFromState(state), projectId);

    if (!projectRecord) {
      return null;
    }

    const exportContent = buildProjectRecordJson(projectRecord);

    set({
      exportPreview: exportContent,
      activeView: "exports",
      timelineEvents: [
        createTimelineEvent(projectId, "Export generated", "Prepared JSON project record.", "export_generated"),
        ...state.timelineEvents,
      ],
    });
    persistCurrentState(set, get);

    return exportContent;
  },

  replaceWorkspace(snapshot) {
    const selection = getInitialSelection(snapshot);

    set({
      ...snapshot,
      selectedProjectId: selection.projectId,
      selectedNoteId: selection.noteId,
      activeView: "overview",
      exportPreview: "",
      persistenceError: null,
    });
    persistCurrentState(set, get);
  },

  resetWorkspace() {
    const nextSnapshot = createEmptyWorkspace();

    set({
      ...nextSnapshot,
      activeView: "overview",
      selectedProjectId: "",
      selectedNoteId: "",
      exportPreview: "",
    });
    persistCurrentState(set, get);
  },
}));
