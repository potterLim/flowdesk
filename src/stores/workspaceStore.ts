import { create } from "zustand";
import type {
  Note,
  Project,
  Task,
  TaskStatus,
  TimelineEvent,
  WorkSession,
  WorkspaceSnapshot,
  WorkspaceView,
} from "../domain/workspace";
import { getElapsedMinutes } from "../lib/date";
import { getWorkspaceRepository, type WorkspacePersistenceMode } from "../lib/persistence/workspaceRepository";

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

interface WorkspaceState extends WorkspaceSnapshot {
  activeView: WorkspaceView;
  selectedProjectId: string;
  selectedNoteId: string;
  exportPreview: string;
  persistenceMode: WorkspacePersistenceMode;
  hydrateWorkspace: () => void;
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
  startSession: () => void;
  updateActiveSessionNotes: (notes: string) => void;
  endActiveSession: () => void;
  prepareMarkdownExport: () => void;
  prepareJsonExport: () => void;
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

function persistCurrentState(get: () => WorkspaceState): void {
  const snapshot = getSnapshotFromState(get());

  void getWorkspaceRepository()
    .then((repository) => repository.saveWorkspace(snapshot))
    .catch((error: unknown) => {
      console.error("Failed to persist FlowDesk workspace", error);
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

function buildProjectMarkdown(project: Project, notes: Note[], tasks: Task[], sessions: WorkSession[]): string {
  const taskLines = tasks.map((task) => `- [${task.status === "done" ? "x" : " "}] ${task.title} (${task.priority})`);
  const sessionLines = sessions.map((session) => {
    const duration = session.durationMinutes ?? getElapsedMinutes(session.startedAt, session.endedAt);
    return `- ${session.title}: ${duration} minutes`;
  });
  const noteSections = notes.map((note) => `## ${note.title}\n\n${note.content}`);

  return [
    `# ${project.title}`,
    project.description,
    "",
    `Tags: ${project.tags.join(", ")}`,
    "",
    "## Tasks",
    taskLines.join("\n") || "No tasks recorded.",
    "",
    "## Sessions",
    sessionLines.join("\n") || "No sessions recorded.",
    "",
    "# Notes",
    noteSections.join("\n\n---\n\n"),
  ].join("\n");
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

  hydrateWorkspace() {
    void getWorkspaceRepository()
      .then(async (repository) => {
        const storedSnapshot = await repository.loadWorkspace();

        if (storedSnapshot) {
          const selection = getInitialSelection(storedSnapshot);

          set({
            ...storedSnapshot,
            selectedProjectId: selection.projectId,
            selectedNoteId: selection.noteId,
            activeView: "overview",
            exportPreview: "",
            persistenceMode: repository.mode,
          });

          return;
        }

        set({ persistenceMode: repository.mode });
        await repository.saveWorkspace(getSnapshotFromState(get()));
      })
      .catch((error: unknown) => {
        console.error("Failed to hydrate FlowDesk workspace", error);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
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
    persistCurrentState(get);
  },

  prepareMarkdownExport() {
    const state = get();
    const project = state.projects.find((candidateProject) => candidateProject.id === state.selectedProjectId);

    if (!project) {
      return;
    }

    const projectNotes = state.notes.filter((note) => note.projectId === project.id);
    const projectTasks = state.tasks.filter((task) => task.projectId === project.id);
    const projectSessions = state.sessions.filter((session) => session.projectId === project.id);

    set({
      exportPreview: buildProjectMarkdown(project, projectNotes, projectTasks, projectSessions),
      activeView: "exports",
      timelineEvents: [
        createTimelineEvent(project.id, "Export generated", "Prepared Markdown project record.", "export_generated"),
        ...state.timelineEvents,
      ],
    });
    persistCurrentState(get);
  },

  prepareJsonExport() {
    const state = get();
    const projectId = state.selectedProjectId;
    const projectSnapshot = {
      project: state.projects.find((project) => project.id === projectId),
      notes: state.notes.filter((note) => note.projectId === projectId),
      tasks: state.tasks.filter((task) => task.projectId === projectId),
      sessions: state.sessions.filter((session) => session.projectId === projectId),
      timelineEvents: state.timelineEvents.filter((event) => event.projectId === projectId),
    };

    set({
      exportPreview: JSON.stringify(projectSnapshot, null, 2),
      activeView: "exports",
      timelineEvents: [
        createTimelineEvent(projectId, "Export generated", "Prepared JSON project record.", "export_generated"),
        ...state.timelineEvents,
      ],
    });
    persistCurrentState(get);
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
    persistCurrentState(get);
  },
}));
