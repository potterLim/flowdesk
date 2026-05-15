import {
  Archive,
  ArchiveRestore,
  Check,
  CheckSquare,
  ChevronRight,
  Circle,
  Clock3,
  Database,
  Download,
  ListChecks,
  Monitor,
  Moon,
  NotebookText,
  PanelLeft,
  Pin,
  Play,
  Plus,
  Search,
  Settings2,
  Square,
  Sun,
  Tags,
  Timer,
  Trash2,
  X,
} from "lucide-react";
import { lazy, Suspense, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import type { FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Project, Task, TaskPriority, TaskStatus, TimelineEvent, WorkspaceView } from "../../domain/workspace";
import { formatDateTime, formatDuration, formatShortDate, getElapsedMinutes } from "../../lib/date";
import {
  useWorkspaceStore,
  type CreateProjectInput,
  type CreateTaskInput,
  type UpdateProjectInput,
} from "../../stores/workspaceStore";

const MarkdownEditor = lazy(() =>
  import("../../components/MarkdownEditor").then((module) => ({
    default: module.MarkdownEditor,
  })),
);

const viewItems: Array<{ id: WorkspaceView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: PanelLeft },
  { id: "notes", label: "Notes", icon: NotebookText },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "sessions", label: "Sessions", icon: Timer },
  { id: "timeline", label: "Timeline", icon: Clock3 },
  { id: "exports", label: "Exports", icon: Download },
];

const accentClasses: Record<Project["accent"], string> = {
  teal: "bg-teal-700 text-white",
  blue: "bg-blue-700 text-white",
  violet: "bg-violet-700 text-white",
  amber: "bg-amber-600 text-white",
  rose: "bg-rose-700 text-white",
};

const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  archived: "Archived",
};

const priorityClasses: Record<TaskPriority, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};

type ThemeMode = "system" | "light" | "dark";

function getStoredThemeMode(): ThemeMode {
  const storedThemeMode = window.localStorage.getItem("flowdesk.themeMode");

  if (storedThemeMode === "system" || storedThemeMode === "light" || storedThemeMode === "dark") {
    return storedThemeMode;
  }

  const legacyTheme = window.localStorage.getItem("flowdesk.theme");

  return legacyTheme === "light" || legacyTheme === "dark" ? legacyTheme : "system";
}

function resolveThemeMode(themeMode: ThemeMode): "light" | "dark" {
  if (themeMode !== "system") {
    return themeMode;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function WorkspaceScreen() {
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [pendingProjectDeleteId, setPendingProjectDeleteId] = useState<string | null>(null);
  const [pendingNoteDeleteId, setPendingNoteDeleteId] = useState<string | null>(null);
  const [pendingTaskDeleteId, setPendingTaskDeleteId] = useState<string | null>(null);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);
  const projects = useWorkspaceStore((state) => state.projects);
  const notes = useWorkspaceStore((state) => state.notes);
  const tasks = useWorkspaceStore((state) => state.tasks);
  const sessions = useWorkspaceStore((state) => state.sessions);
  const timelineEvents = useWorkspaceStore((state) => state.timelineEvents);
  const selectedProjectId = useWorkspaceStore((state) => state.selectedProjectId);
  const selectedNoteId = useWorkspaceStore((state) => state.selectedNoteId);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const exportPreview = useWorkspaceStore((state) => state.exportPreview);
  const selectProject = useWorkspaceStore((state) => state.selectProject);
  const selectNote = useWorkspaceStore((state) => state.selectNote);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const updateSelectedNoteContent = useWorkspaceStore((state) => state.updateSelectedNoteContent);
  const updateSelectedNoteTitle = useWorkspaceStore((state) => state.updateSelectedNoteTitle);
  const createNote = useWorkspaceStore((state) => state.createNote);
  const createTask = useWorkspaceStore((state) => state.createTask);
  const createProject = useWorkspaceStore((state) => state.createProject);
  const updateProject = useWorkspaceStore((state) => state.updateProject);
  const deleteProject = useWorkspaceStore((state) => state.deleteProject);
  const toggleProjectPinned = useWorkspaceStore((state) => state.toggleProjectPinned);
  const archiveProject = useWorkspaceStore((state) => state.archiveProject);
  const restoreProject = useWorkspaceStore((state) => state.restoreProject);
  const deleteNote = useWorkspaceStore((state) => state.deleteNote);
  const updateTaskStatus = useWorkspaceStore((state) => state.updateTaskStatus);
  const deleteTask = useWorkspaceStore((state) => state.deleteTask);
  const startSession = useWorkspaceStore((state) => state.startSession);
  const updateActiveSessionNotes = useWorkspaceStore((state) => state.updateActiveSessionNotes);
  const endActiveSession = useWorkspaceStore((state) => state.endActiveSession);
  const prepareMarkdownExport = useWorkspaceStore((state) => state.prepareMarkdownExport);
  const prepareJsonExport = useWorkspaceStore((state) => state.prepareJsonExport);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const projectNotes = selectedProject ? notes.filter((note) => note.projectId === selectedProject.id) : [];
  const selectedNote = selectedProject ? notes.find((note) => note.id === selectedNoteId) ?? projectNotes[0] : undefined;
  const projectTasks = selectedProject ? tasks.filter((task) => task.projectId === selectedProject.id) : [];
  const projectSessions = selectedProject ? sessions.filter((session) => session.projectId === selectedProject.id) : [];
  const projectTimelineEvents = selectedProject ? timelineEvents.filter((event) => event.projectId === selectedProject.id) : [];
  const activeSession = projectSessions.find((session) => session.endedAt === null);
  const canEditProject = selectedProject?.status === "active";
  const openCreateProjectDialog = () => setIsCreateProjectDialogOpen(true);
  const closeCreateProjectDialog = () => setIsCreateProjectDialogOpen(false);
  const openCreateTaskDialog = () => setIsCreateTaskDialogOpen(true);
  const closeCreateTaskDialog = () => setIsCreateTaskDialogOpen(false);
  const handleCreateProject = (input: CreateProjectInput) => {
    createProject(input);
    closeCreateProjectDialog();
  };
  const handleCreateTask = (input: CreateTaskInput) => {
    createTask(input);
    closeCreateTaskDialog();
  };

  const handleUpdateProject = (input: UpdateProjectInput) => {
    if (!selectedProject) {
      return;
    }

    updateProject(selectedProject.id, input);
    setIsProjectSettingsOpen(false);
  };

  const handleConfirmProjectDelete = () => {
    if (!pendingProjectDeleteId) {
      return;
    }

    deleteProject(pendingProjectDeleteId);
    setPendingProjectDeleteId(null);
    setIsProjectSettingsOpen(false);
  };

  const handleConfirmNoteDelete = () => {
    if (!pendingNoteDeleteId) {
      return;
    }

    deleteNote(pendingNoteDeleteId);
    setPendingNoteDeleteId(null);
  };

  const handleConfirmTaskDelete = () => {
    if (!pendingTaskDeleteId) {
      return;
    }

    deleteTask(pendingTaskDeleteId);
    setPendingTaskDeleteId(null);
  };

  useEffect(() => {
    const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.dataset.theme = resolveThemeMode(themeMode);
      document.documentElement.dataset.themeMode = themeMode;
      window.localStorage.setItem("flowdesk.themeMode", themeMode);
    };

    applyTheme();
    window.localStorage.removeItem("flowdesk.theme");

    if (typeof colorSchemeQuery.addEventListener === "function") {
      colorSchemeQuery.addEventListener("change", applyTheme);

      return () => colorSchemeQuery.removeEventListener("change", applyTheme);
    }

    colorSchemeQuery.addListener(applyTheme);

    return () => colorSchemeQuery.removeListener(applyTheme);
  }, [themeMode]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--color-app-bg)] text-[var(--color-ink)] lg:h-screen lg:min-h-[720px] lg:flex-row lg:overflow-hidden">
      <ProjectSidebar
        projects={projects}
        selectedProjectId={selectedProject?.id ?? ""}
        onSelectProject={selectProject}
        onCreateProject={openCreateProjectDialog}
        onToggleProjectPinned={toggleProjectPinned}
        onArchiveProject={archiveProject}
        onRestoreProject={restoreProject}
        themeMode={themeMode}
        onChangeTheme={setThemeMode}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {selectedProject ? (
          <>
            <WorkspaceHeader
              project={selectedProject}
              activeSessionLabel={activeSession ? formatDuration(getElapsedMinutes(activeSession.startedAt, null)) : null}
              canEditProject={canEditProject}
              onCreateNote={createNote}
              onCreateTask={openCreateTaskDialog}
              onStartSession={startSession}
              onEndSession={endActiveSession}
              onPrepareMarkdownExport={prepareMarkdownExport}
              onArchiveProject={() => archiveProject(selectedProject.id)}
              onRestoreProject={() => restoreProject(selectedProject.id)}
              onOpenSettings={() => setIsProjectSettingsOpen(true)}
            />
            <ViewTabs activeView={activeView} onSelectView={setActiveView} />
            <section className="min-h-0 flex-1 overflow-visible px-3 pb-5 sm:px-5 lg:overflow-hidden">
              {activeView === "overview" && (
                <OverviewView
                  project={selectedProject}
                  notes={projectNotes}
                  tasks={projectTasks}
                  sessions={projectSessions}
                  timelineEvents={projectTimelineEvents}
                  selectedNote={selectedNote}
                  canEditProject={canEditProject}
                  onSelectNote={selectNote}
                  onCreateNote={createNote}
                  onCreateTask={openCreateTaskDialog}
                  onUpdateTaskStatus={updateTaskStatus}
                  onDeleteTask={setPendingTaskDeleteId}
                  onStartSession={startSession}
                  onUpdateActiveSessionNotes={updateActiveSessionNotes}
                  onEndSession={endActiveSession}
                />
              )}
              {activeView === "notes" && (
                <NotesView
                  notes={projectNotes}
                  selectedNoteId={selectedNote?.id ?? ""}
                  selectedNoteContent={selectedNote?.content ?? ""}
                  onSelectNote={selectNote}
                  onUpdateTitle={updateSelectedNoteTitle}
                  onUpdateContent={updateSelectedNoteContent}
                  onCreateNote={createNote}
                  onDeleteNote={setPendingNoteDeleteId}
                  canEditProject={canEditProject}
                />
              )}
              {activeView === "tasks" && (
                <TasksView
                  tasks={projectTasks}
                  canEditProject={canEditProject}
                  onCreateTask={openCreateTaskDialog}
                  onUpdateTaskStatus={updateTaskStatus}
                  onDeleteTask={setPendingTaskDeleteId}
                />
              )}
              {activeView === "sessions" && (
                <SessionsView
                  sessions={projectSessions}
                  canEditProject={canEditProject}
                  onStartSession={startSession}
                  onUpdateActiveSessionNotes={updateActiveSessionNotes}
                  onEndSession={endActiveSession}
                />
              )}
              {activeView === "timeline" && <TimelineView timelineEvents={projectTimelineEvents} />}
              {activeView === "exports" && (
                <ExportsView
                  exportPreview={exportPreview}
                  onPrepareMarkdownExport={prepareMarkdownExport}
                  onPrepareJsonExport={prepareJsonExport}
                />
              )}
            </section>
          </>
        ) : (
          <FirstRunView onCreateProject={handleCreateProject} />
        )}
      </main>
      <CreateProjectDialog isOpen={isCreateProjectDialogOpen} onClose={closeCreateProjectDialog} onCreateProject={handleCreateProject} />
      <CreateTaskDialog isOpen={isCreateTaskDialogOpen} onClose={closeCreateTaskDialog} onCreateTask={handleCreateTask} />
      {selectedProject && (
        <ProjectSettingsDialog
          project={selectedProject}
          isOpen={isProjectSettingsOpen}
          onClose={() => setIsProjectSettingsOpen(false)}
          onUpdateProject={handleUpdateProject}
          onRequestDelete={() => setPendingProjectDeleteId(selectedProject.id)}
        />
      )}
      <ConfirmDialog
        isOpen={pendingProjectDeleteId !== null}
        title="Delete Project"
        detail="This permanently removes the project and every attached note, task, session, timeline event, and local record from FlowDesk."
        confirmLabel="Delete Project"
        onCancel={() => setPendingProjectDeleteId(null)}
        onConfirm={handleConfirmProjectDelete}
      />
      <ConfirmDialog
        isOpen={pendingNoteDeleteId !== null}
        title="Delete Note"
        detail="This permanently removes the selected note from the project record."
        confirmLabel="Delete Note"
        onCancel={() => setPendingNoteDeleteId(null)}
        onConfirm={handleConfirmNoteDelete}
      />
      <ConfirmDialog
        isOpen={pendingTaskDeleteId !== null}
        title="Delete Task"
        detail="This permanently removes the task from the project record."
        confirmLabel="Delete Task"
        onCancel={() => setPendingTaskDeleteId(null)}
        onConfirm={handleConfirmTaskDelete}
      />
    </div>
  );
}

function FirstRunView({ onCreateProject }: { onCreateProject: (input: CreateProjectInput) => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [accent, setAccent] = useState<Project["accent"]>("teal");
  const canCreateProject = title.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateProject) {
      return;
    }

    onCreateProject({
      title,
      description,
      tags: parseTags(tags),
      accent,
    });
    setTitle("");
    setDescription("");
    setTags("");
    setAccent("teal");
  };

  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-5 py-8 sm:px-8 lg:px-10">
      <div className="grid w-full max-w-[1080px] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)] sm:p-8"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
            <PanelLeft size={20} />
          </div>
          <h2 className="mt-6 max-w-2xl text-[32px] font-semibold leading-tight tracking-normal text-[var(--color-ink)]">
            Start with one project.
          </h2>
          <p className="mt-3 max-w-2xl text-[15px] leading-7 text-[var(--color-muted)]">
            Give the workspace a clear anchor. Notes, tasks, sessions, timeline records, and exports will stay attached to it.
          </p>

          <div className="mt-7 grid gap-4">
            <ProjectTextField
              label="Project name"
              value={title}
              onChange={setTitle}
              placeholder="Name this project"
              autoFocus
            />
            <ProjectTextArea
              label="Summary"
              value={description}
              onChange={setDescription}
              placeholder="Optional"
            />
            <ProjectTextField label="Tags" value={tags} onChange={setTags} placeholder="Optional, comma-separated" />
            <ProjectAccentPicker value={accent} onChange={setAccent} />
          </div>

          <div className="mt-7 flex items-center justify-between gap-3">
            <p className="text-[12px] leading-5 text-[var(--color-muted)]">Stored locally on this device.</p>
            <button
              type="submit"
              disabled={!canCreateProject}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-[13px] font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-[var(--color-accent-strong)] disabled:bg-slate-300"
            >
              <Plus size={15} />
              Create Project
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
          <p className="px-1 text-[12px] font-semibold uppercase text-[var(--color-muted)]">Workspace Tools</p>
          <div className="mt-4 space-y-2">
            {[
              { icon: NotebookText, title: "Notes", detail: "Markdown editor and preview" },
              { icon: CheckSquare, title: "Tasks", detail: "Priorities and due dates" },
              { icon: Timer, title: "Sessions", detail: "Focused work blocks" },
              { icon: Clock3, title: "Timeline", detail: "Project activity history" },
              { icon: Download, title: "Exports", detail: "Markdown and JSON records" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="flex gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-app-bg)] p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-selection)] text-[var(--color-accent)]">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--color-ink)]">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-5 text-[var(--color-muted)]">{item.detail}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function ProjectTextField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 text-[14px] text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]"
      />
    </label>
  );
}

function ProjectTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2 text-[14px] leading-6 text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]"
      />
    </label>
  );
}

function ProjectAccentPicker({
  value,
  onChange,
}: {
  value: Project["accent"];
  onChange: (accent: Project["accent"]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[12px] font-semibold text-slate-700">Color</legend>
      <div className="mt-2 flex gap-2">
        {(["teal", "blue", "violet", "amber", "rose"] as Project["accent"][]).map((accentOption) => (
          <button
            key={accentOption}
            type="button"
            aria-label={`Use ${accentOption} project color`}
            onClick={() => onChange(accentOption)}
            className={clsx(
              "h-8 w-8 rounded-md border-2 transition",
              accentClasses[accentOption],
              value === accentOption ? "border-[var(--color-ink)]" : "border-transparent",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}

function CreateProjectDialog({
  isOpen,
  onClose,
  onCreateProject,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (input: CreateProjectInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [accent, setAccent] = useState<Project["accent"]>("teal");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const canCreateProject = title.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateProject) {
      return;
    }

    onCreateProject({
      title,
      description,
      tags: parseTags(tags),
      accent,
    });
    setTitle("");
    setDescription("");
    setTags("");
    setAccent("teal");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        className="w-full max-w-[560px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="create-project-title" className="text-[16px] font-semibold text-[var(--color-ink)]">
              New Project
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">Name the project. Everything else can stay empty.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new project dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <ProjectTextField label="Project name" value={title} onChange={setTitle} placeholder="Name this project" autoFocus />
          <ProjectTextArea label="Summary" value={description} onChange={setDescription} placeholder="Optional" />
          <ProjectTextField label="Tags" value={tags} onChange={setTags} placeholder="Optional, comma-separated" />
          <ProjectAccentPicker value={accent} onChange={setAccent} />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-app-bg)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canCreateProject}
            className="h-9 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)] disabled:bg-slate-300"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateTaskDialog({
  isOpen,
  onClose,
  onCreateTask,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (input: CreateTaskInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const canCreateTask = title.trim().length > 0;
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateTask) {
      return;
    }

    onCreateTask({
      title,
      priority,
      dueDate: dueDate || null,
      tags: parseTags(tags),
    });
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setTags("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        className="w-full max-w-[520px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="create-task-title" className="text-[16px] font-semibold text-[var(--color-ink)]">
              New Task
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">Add one concrete next step.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new task dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <ProjectTextField label="Task title" value={title} onChange={setTitle} placeholder="Describe the next step" autoFocus />
          <fieldset>
            <legend className="text-[12px] font-semibold text-slate-700">Priority</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(["low", "medium", "high", "urgent"] as TaskPriority[]).map((priorityOption) => (
                <button
                  key={priorityOption}
                  type="button"
                  onClick={() => setPriority(priorityOption)}
                  className={clsx(
                    "h-9 rounded-md border px-3 text-[12px] font-semibold whitespace-nowrap capitalize transition",
                    priority === priorityOption
                      ? "border-[var(--color-accent)] bg-[var(--color-selection)] text-[var(--color-accent)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {priorityOption}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-700">Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 text-[14px] text-[var(--color-ink)] outline-none transition focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]"
            />
          </label>
          <ProjectTextField label="Tags" value={tags} onChange={setTags} placeholder="Optional, comma-separated" />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-app-bg)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canCreateTask}
            className="h-9 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)] disabled:bg-slate-300"
          >
            Create Task
          </button>
        </div>
      </form>
    </div>
  );
}

function ProjectSettingsDialog({
  project,
  isOpen,
  onClose,
  onUpdateProject,
  onRequestDelete,
}: {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (input: UpdateProjectInput) => void;
  onRequestDelete: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [tags, setTags] = useState(project.tags.join(", "));
  const [accent, setAccent] = useState<Project["accent"]>(project.accent);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    setTitle(project.title);
    setDescription(project.description);
    setTags(project.tags.join(", "));
    setAccent(project.accent);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, project]);

  if (!isOpen) {
    return null;
  }

  const canSaveProject = title.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSaveProject) {
      return;
    }

    onUpdateProject({
      title,
      description,
      tags: parseTags(tags),
      accent,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-title"
        className="w-full max-w-[600px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="project-settings-title" className="text-[16px] font-semibold text-[var(--color-ink)]">
              Project Settings
            </h2>
            <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">{project.status === "archived" ? "Archived project" : "Active project"}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project settings dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <ProjectTextField label="Project name" value={title} onChange={setTitle} placeholder="Name this project" autoFocus />
          <ProjectTextArea label="Summary" value={description} onChange={setDescription} placeholder="Optional" />
          <ProjectTextField label="Tags" value={tags} onChange={setTags} placeholder="Optional, comma-separated" />
          <ProjectAccentPicker value={accent} onChange={setAccent} />
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-app-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onRequestDelete}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-[13px] font-semibold whitespace-nowrap text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={14} />
            Delete Project
          </button>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSaveProject}
              className="h-9 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)] disabled:bg-slate-300"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ConfirmDialog({
  isOpen,
  title,
  detail,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  detail: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm" onMouseDown={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-[460px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.24)]"
      >
        <div className="px-5 pt-5">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-700">
            <Trash2 size={18} />
          </div>
          <h2 id="confirm-dialog-title" className="mt-4 text-[17px] font-semibold text-[var(--color-ink)]">
            {title}
          </h2>
          <p className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">{detail}</p>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-app-bg)] px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-9 rounded-md bg-red-600 px-3 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-red-700"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onToggleProjectPinned: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
  themeMode: ThemeMode;
  onChangeTheme: (themeMode: ThemeMode) => void;
}

function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onToggleProjectPinned,
  onArchiveProject,
  onRestoreProject,
  themeMode,
  onChangeTheme,
}: ProjectSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleProjects = projects.filter((project) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    return [project.title, project.description, ...project.tags].some((value) => value.toLowerCase().includes(normalizedSearchQuery));
  });
  const activeProjects = visibleProjects.filter((project) => project.status === "active");
  const archivedProjects = visibleProjects.filter((project) => project.status === "archived");

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-[var(--color-border)] bg-white lg:w-[292px] lg:border-b-0 lg:border-r">
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[19px] font-semibold tracking-normal text-slate-950">FlowDesk</h1>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--color-muted)]">Research workspace</p>
          </div>
          <div className="flex items-center gap-1" aria-label="Theme">
            <IconButton label="Use system theme" icon={Monitor} isActive={themeMode === "system"} onClick={() => onChangeTheme("system")} />
            <IconButton label="Use light theme" icon={Sun} isActive={themeMode === "light"} onClick={() => onChangeTheme("light")} />
            <IconButton label="Use dark theme" icon={Moon} isActive={themeMode === "dark"} onClick={() => onChangeTheme("dark")} />
          </div>
        </div>
        <label className="mt-4 flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 text-[13px] text-[var(--color-muted)]">
          <Search size={15} />
          <input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Search projects"
          />
        </label>
      </div>

      <div className="max-h-[480px] flex-1 overflow-y-auto px-3 py-4 lg:min-h-0 lg:max-h-none">
        {visibleProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 py-5 text-center">
            <p className="text-[13px] font-semibold text-slate-800">
              {projects.length === 0 ? "No projects yet" : "No matching projects"}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
              {projects.length === 0 ? "Create a project to begin." : "Adjust the search query."}
            </p>
          </div>
        ) : (
          <>
            {activeProjects.some((project) => project.isPinned) && (
              <SidebarSection title="Pinned">
                {activeProjects
                  .filter((project) => project.isPinned)
                  .map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isSelected={project.id === selectedProjectId}
                      onSelectProject={onSelectProject}
                      onToggleProjectPinned={onToggleProjectPinned}
                      onArchiveProject={onArchiveProject}
                      onRestoreProject={onRestoreProject}
                    />
                  ))}
              </SidebarSection>
            )}

            {activeProjects.some((project) => !project.isPinned) && (
              <SidebarSection title="Projects">
                {activeProjects
                  .filter((project) => !project.isPinned)
                  .map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isSelected={project.id === selectedProjectId}
                      onSelectProject={onSelectProject}
                      onToggleProjectPinned={onToggleProjectPinned}
                      onArchiveProject={onArchiveProject}
                      onRestoreProject={onRestoreProject}
                    />
                  ))}
              </SidebarSection>
            )}

            {archivedProjects.length > 0 && (
              <SidebarSection title="Archived">
                {archivedProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    isSelected={project.id === selectedProjectId}
                    onSelectProject={onSelectProject}
                    onToggleProjectPinned={onToggleProjectPinned}
                    onArchiveProject={onArchiveProject}
                    onRestoreProject={onRestoreProject}
                  />
                ))}
              </SidebarSection>
            )}
          </>
        )}
      </div>

      {projects.length > 0 && (
        <div className="border-t border-[var(--color-border)] p-3">
          <button
            type="button"
            onClick={onCreateProject}
            className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-[var(--color-accent-strong)]"
          >
            <Plus size={15} />
            New Project
          </button>
        </div>
      )}
    </aside>
  );
}

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-[11px] font-semibold uppercase text-slate-500">{title}</p>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ProjectRow({
  project,
  isSelected,
  onSelectProject,
  onToggleProjectPinned,
  onArchiveProject,
  onRestoreProject,
}: {
  project: Project;
  isSelected: boolean;
  onSelectProject: (projectId: string) => void;
  onToggleProjectPinned: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
}) {
  return (
    <div
      className={clsx(
        "group flex w-full items-center gap-1 rounded-md px-2 py-2 transition",
        isSelected ? "bg-blue-50 text-[var(--color-ink)]" : "text-slate-700 hover:bg-slate-50",
      )}
    >
      <button
        type="button"
        onClick={() => onSelectProject(project.id)}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
            accentClasses[project.accent],
          )}
        >
          {project.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">{project.title}</span>
            {project.isPinned && <Pin size={12} className="shrink-0 text-[var(--color-accent)]" />}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-[var(--color-muted)]">
            {project.tags.length > 0 ? project.tags.join(", ") : "No tags"}
          </span>
        </span>
      </button>
      {project.status === "active" && (
        <button
          type="button"
          aria-label={project.isPinned ? `Unpin ${project.title}` : `Pin ${project.title}`}
          title={project.isPinned ? "Unpin project" : "Pin project"}
          onClick={() => onToggleProjectPinned(project.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-white hover:text-[var(--color-accent)] lg:opacity-0 lg:group-hover:opacity-100"
        >
          <Pin size={13} />
        </button>
      )}
      {project.status === "archived" ? (
        <button
          type="button"
          aria-label={`Restore ${project.title}`}
          title="Restore project"
          onClick={() => onRestoreProject(project.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-white hover:text-[var(--color-accent)] lg:opacity-0 lg:group-hover:opacity-100"
        >
          <ArchiveRestore size={13} />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Archive ${project.title}`}
          title="Archive project"
          onClick={() => onArchiveProject(project.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-white hover:text-amber-700 lg:opacity-0 lg:group-hover:opacity-100"
        >
          <Archive size={13} />
        </button>
      )}
      <ChevronRight size={14} className="hidden shrink-0 text-slate-400 transition lg:block" />
    </div>
  );
}

function WorkspaceHeader({
  project,
  activeSessionLabel,
  canEditProject,
  onCreateNote,
  onCreateTask,
  onStartSession,
  onEndSession,
  onPrepareMarkdownExport,
  onArchiveProject,
  onRestoreProject,
  onOpenSettings,
}: {
  project: Project;
  activeSessionLabel: string | null;
  canEditProject: boolean;
  onCreateNote: () => void;
  onCreateTask: () => void;
  onStartSession: () => void;
  onEndSession: () => void;
  onPrepareMarkdownExport: () => void;
  onArchiveProject: () => void;
  onRestoreProject: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="border-b border-[var(--color-border)] bg-white px-5 py-4">
      <div className="flex flex-col items-start justify-between gap-4 xl:flex-row">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-md text-[12px] font-bold",
                accentClasses[project.accent],
              )}
            >
              {project.icon}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[22px] font-semibold tracking-normal text-slate-950">{project.title}</h2>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--color-border)] bg-slate-50 px-2 text-[12px] font-medium text-slate-700"
              >
                <Tags size={12} />
                {tag}
              </span>
            ))}
            <span className="text-[12px] text-[var(--color-muted)]">Updated {formatDateTime(project.updatedAt)}</span>
          </div>
        </div>
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 xl:w-auto xl:shrink-0">
          {canEditProject && (
            activeSessionLabel ? (
              <button
                type="button"
                aria-label="End Session"
                title="End Session"
                onClick={onEndSession}
                className="inline-flex h-9 shrink-0 items-center justify-center gap-0 rounded-md border border-red-200 bg-red-50 px-2 text-[13px] font-semibold whitespace-nowrap text-red-700 transition hover:bg-red-100 sm:gap-2 sm:px-3"
              >
                <Square size={14} />
                <span className="hidden sm:inline">End Session</span>
                <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] leading-none text-red-700 sm:ml-0">{activeSessionLabel}</span>
              </button>
            ) : (
              <button
                type="button"
                aria-label="Start Session"
                title="Start Session"
                onClick={onStartSession}
                className="inline-flex h-9 w-10 shrink-0 items-center justify-center gap-0 rounded-md border border-[var(--color-accent)] bg-blue-50 px-0 text-[13px] font-semibold whitespace-nowrap text-[var(--color-accent)] transition hover:bg-slate-50 sm:w-auto sm:gap-2 sm:px-3"
              >
                <Play size={14} />
                <span className="hidden sm:inline">Start Session</span>
              </button>
            )
          )}
          {canEditProject && <ActionButton icon={NotebookText} label="New Note" onClick={onCreateNote} />}
          {canEditProject && <ActionButton icon={ListChecks} label="New Task" onClick={onCreateTask} />}
          <ActionButton icon={Download} label="Export" onClick={onPrepareMarkdownExport} />
          {project.status === "active" ? (
            <ActionButton icon={Archive} label="Archive" onClick={onArchiveProject} />
          ) : (
            <ActionButton icon={ArchiveRestore} label="Restore" onClick={onRestoreProject} />
          )}
          <IconButton label="Project settings" icon={Settings2} size="md" onClick={onOpenSettings} />
        </div>
      </div>
    </header>
  );
}

function ViewTabs({ activeView, onSelectView }: { activeView: WorkspaceView; onSelectView: (view: WorkspaceView) => void }) {
  return (
    <nav className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-white px-3 sm:px-5">
      {viewItems.map((item) => {
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            title={item.label}
            onClick={() => onSelectView(item.id)}
            className={clsx(
              "inline-flex h-8 w-10 shrink-0 items-center justify-center gap-0 rounded-md px-0 text-[13px] font-semibold whitespace-nowrap transition sm:w-auto sm:gap-2 sm:px-3",
              activeView === item.id
                ? "bg-[var(--color-accent)] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <Icon size={14} />
            <span className="hidden sm:inline">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function OverviewView({
  project,
  notes,
  tasks,
  sessions,
  timelineEvents,
  selectedNote,
  canEditProject,
  onSelectNote,
  onCreateNote,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteTask,
  onStartSession,
  onUpdateActiveSessionNotes,
  onEndSession,
}: {
  project: Project;
  notes: ReturnType<typeof useWorkspaceStore.getState>["notes"];
  tasks: Task[];
  sessions: ReturnType<typeof useWorkspaceStore.getState>["sessions"];
  timelineEvents: TimelineEvent[];
  selectedNote: ReturnType<typeof useWorkspaceStore.getState>["notes"][number] | undefined;
  canEditProject: boolean;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onCreateTask: () => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onStartSession: () => void;
  onUpdateActiveSessionNotes: (notes: string) => void;
  onEndSession: () => void;
}) {
  const completedTaskCount = tasks.filter((task) => task.status === "done").length;
  const activeSession = sessions.find((session) => session.endedAt === null);

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 xl:h-full xl:grid-cols-[minmax(0,1fr)_330px]">
      <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-5">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricPanel label="Notes" value={notes.length.toString()} detail="Markdown records" icon={NotebookText} />
          <MetricPanel label="Tasks" value={`${completedTaskCount}/${tasks.length}`} detail="Completed" icon={CheckSquare} />
          <MetricPanel label="Sessions" value={sessions.length.toString()} detail="Tracked blocks" icon={Timer} />
          <MetricPanel label="Timeline" value={timelineEvents.length.toString()} detail="Project events" icon={Clock3} />
        </div>

        <div className="grid min-h-0 grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-app-bg)] lg:border-b-0 lg:border-r">
            <PanelHeader title="Project Notes" detail={`${project.title} / ${notes.length} notes`} />
            <div className="space-y-1 p-3">
              {notes.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--color-border)] bg-white px-3 py-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-900">No notes yet</p>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">Notes will appear here.</p>
                </div>
              ) : (
                notes.map((note) => (
                  <button
                    key={note.id}
                    type="button"
                    onClick={() => onSelectNote(note.id)}
                    className={clsx(
                      "w-full rounded-md border px-3 py-2 text-left transition",
                      selectedNote?.id === note.id
                        ? "border-[var(--color-accent)] bg-[var(--color-selection)]"
                        : "border-transparent hover:border-slate-200 hover:bg-white",
                    )}
                  >
                    <span className="block truncate text-[13px] font-semibold text-slate-900">{note.title || "Untitled note"}</span>
                    <span className="mt-1 block text-[12px] text-[var(--color-muted)]">{note.folder}</span>
                  </button>
                ))
              )}
            </div>
          </div>
          <div className="min-h-0 overflow-y-auto p-5">
            {selectedNote ? (
              <MarkdownReadingSurface content={selectedNote.content} />
            ) : (
              <EmptyState
                title="No note selected"
                detail={canEditProject ? "Create a note to start building the project record." : "Restore the project before adding new records."}
                actionLabel={canEditProject ? "New Note" : undefined}
                onAction={canEditProject ? onCreateNote : undefined}
              />
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 space-y-5 overflow-visible xl:overflow-y-auto">
        <SessionCard
          activeSession={activeSession}
          sessions={sessions}
          canEditProject={canEditProject}
          onStartSession={onStartSession}
          onUpdateActiveSessionNotes={onUpdateActiveSessionNotes}
          onEndSession={onEndSession}
        />
        <TaskStack
          tasks={tasks.slice(0, 4)}
          canEditProject={canEditProject}
          onCreateTask={onCreateTask}
          onUpdateTaskStatus={onUpdateTaskStatus}
          onDeleteTask={onDeleteTask}
        />
        <TimelineStack timelineEvents={timelineEvents.slice(0, 4)} />
      </div>
    </div>
  );
}

function NotesView({
  notes,
  selectedNoteId,
  selectedNoteContent,
  onSelectNote,
  onUpdateTitle,
  onUpdateContent,
  onCreateNote,
  onDeleteNote,
  canEditProject,
}: {
  notes: ReturnType<typeof useWorkspaceStore.getState>["notes"];
  selectedNoteId: string;
  selectedNoteContent: string;
  onSelectNote: (noteId: string) => void;
  onUpdateTitle: (title: string) => void;
  onUpdateContent: (content: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  canEditProject: boolean;
}) {
  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] xl:h-full xl:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.8fr)]">
      <aside className="min-h-0 border-b border-[var(--color-border)] bg-[var(--color-app-bg)] xl:border-b-0 xl:border-r">
        <PanelHeader title="Notes" detail="Folders and records" />
        <div className="space-y-1 p-3">
          {notes.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-white px-3 py-4 text-center">
              <p className="text-[13px] font-semibold text-slate-900">No notes yet</p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">Create the first durable record for this project.</p>
              {canEditProject && (
                <button
                  type="button"
                  onClick={onCreateNote}
                  className="mt-3 inline-flex h-8 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[12px] font-semibold whitespace-nowrap text-white"
                >
                  <Plus size={13} />
                  New Note
                </button>
              )}
            </div>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onSelectNote(note.id)}
                className={clsx(
                  "w-full rounded-md px-3 py-2 text-left transition",
                  note.id === selectedNoteId ? "bg-[var(--color-selection)]" : "hover:bg-white",
                )}
              >
                <span className="block truncate text-[13px] font-semibold text-slate-900">{note.title || "Untitled note"}</span>
                <span className="mt-1 block text-[12px] text-[var(--color-muted)]">
                  {note.folder} · {formatShortDate(note.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="grid min-h-[520px] grid-rows-[48px_minmax(0,1fr)] border-b border-[var(--color-border)] xl:min-h-0 xl:border-b-0 xl:border-r">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4">
          <div className="min-w-0">
            {selectedNote ? (
              <input
                value={selectedNote.title}
                onChange={(event) => onUpdateTitle(event.target.value)}
                readOnly={!canEditProject}
                className="h-6 w-full min-w-0 rounded-sm bg-transparent text-[13px] font-semibold text-slate-950 outline-none focus:bg-[var(--color-surface-subtle)] read-only:cursor-default"
                aria-label="Note title"
              />
            ) : (
              <p className="truncate text-[13px] font-semibold text-slate-950">No note selected</p>
            )}
            <p className="text-[12px] text-[var(--color-muted)]">
              {selectedNote ? (canEditProject ? "Markdown editor" : "Archived note") : "Choose or create a note"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[12px] font-medium whitespace-nowrap text-slate-600">
              {selectedNote ? (canEditProject ? "Saved locally" : "Read only") : "Ready"}
            </span>
            {selectedNote && canEditProject && (
              <button
                type="button"
                onClick={() => onDeleteNote(selectedNote.id)}
                aria-label="Delete note"
                title="Delete note"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-slate-500 transition hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        {selectedNote && canEditProject ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-[13px] font-medium text-[var(--color-muted)]">
                Loading Markdown editor
              </div>
            }
          >
            <MarkdownEditor value={selectedNoteContent} onChange={onUpdateContent} />
          </Suspense>
        ) : selectedNote ? (
          <div className="min-h-0 overflow-y-auto p-5">
            <MarkdownReadingSurface content={selectedNoteContent} />
          </div>
        ) : (
          <EmptyState
            title="No note selected"
            detail={canEditProject ? "Create a note to open the Markdown editor." : "Restore the project before adding new notes."}
          />
        )}
      </section>

      <section className="grid min-h-[480px] grid-rows-[48px_minmax(0,1fr)] bg-[var(--color-app-bg)] xl:min-h-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4">
          <div>
            <p className="text-[13px] font-semibold text-slate-950">Preview</p>
            <p className="text-[12px] text-[var(--color-muted)]">Rendered Markdown</p>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          {selectedNote ? (
            <MarkdownReadingSurface content={selectedNoteContent} />
          ) : (
            <EmptyState title="Preview is empty" detail="The rendered note preview appears here after a note is created." />
          )}
        </div>
      </section>
    </div>
  );
}

function TasksView({
  tasks,
  canEditProject,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteTask,
}: {
  tasks: Task[];
  canEditProject: boolean;
  onCreateTask: () => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const groupedStatuses: TaskStatus[] = ["todo", "in_progress", "done", "archived"];

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-4 pt-5 md:grid-cols-2 xl:h-full xl:grid-cols-4">
      {groupedStatuses.map((status) => (
        <section key={status} className="min-h-0 rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
          <PanelHeader title={taskStatusLabels[status]} detail={`${tasks.filter((task) => task.status === status).length} tasks`} />
          <div className="space-y-3 p-3">
            {tasks.filter((task) => task.status === status).length === 0 ? (
              <EmptyState
                title={status === "todo" ? "No tasks yet" : "Empty"}
                detail={
                  status === "todo"
                    ? canEditProject
                      ? "Add a task when the next step is clear."
                      : "Restore the project before adding tasks."
                    : "Tasks appear here as their state changes."
                }
                actionLabel={status === "todo" && canEditProject ? "New Task" : undefined}
                onAction={status === "todo" && canEditProject ? onCreateTask : undefined}
              />
            ) : (
              tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canEditProject={canEditProject}
                    onUpdateTaskStatus={onUpdateTaskStatus}
                    onDeleteTask={onDeleteTask}
                  />
                ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function SessionsView({
  sessions,
  canEditProject,
  onStartSession,
  onUpdateActiveSessionNotes,
  onEndSession,
}: {
  sessions: ReturnType<typeof useWorkspaceStore.getState>["sessions"];
  canEditProject: boolean;
  onStartSession: () => void;
  onUpdateActiveSessionNotes: (notes: string) => void;
  onEndSession: () => void;
}) {
  const activeSession = sessions.find((session) => session.endedAt === null);

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 lg:grid-cols-[360px_minmax(0,1fr)] xl:h-full">
      <SessionCard
        activeSession={activeSession}
        sessions={sessions}
        canEditProject={canEditProject}
        onStartSession={onStartSession}
        onUpdateActiveSessionNotes={onUpdateActiveSessionNotes}
        onEndSession={onEndSession}
      />
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
        <PanelHeader title="Session History" detail="Actual work blocks over time" />
        <div className="min-h-0 divide-y divide-[var(--color-border)] overflow-y-auto">
          {sessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              detail={canEditProject ? "Start a focus session when work begins." : "Restore the project before tracking sessions."}
              actionLabel={canEditProject ? "Start Session" : undefined}
              onAction={canEditProject ? onStartSession : undefined}
            />
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-semibold text-slate-950">{session.title}</p>
                    <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[var(--color-muted)]">
                      {session.notes || "No notes recorded."}
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[12px] font-semibold whitespace-nowrap text-slate-600">
                    {session.durationMinutes
                      ? formatDuration(session.durationMinutes)
                      : formatDuration(getElapsedMinutes(session.startedAt, null))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function TimelineView({ timelineEvents }: { timelineEvents: TimelineEvent[] }) {
  return (
    <div className="h-auto min-h-0 pt-5 xl:h-full">
      <section className="h-auto min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] xl:h-full">
        <PanelHeader title="Timeline" detail="A durable history of project activity" />
        <div className="min-h-0 overflow-y-auto px-6 py-4">
          <TimelineList timelineEvents={timelineEvents} />
        </div>
      </section>
    </div>
  );
}

function ExportsView({
  exportPreview,
  onPrepareMarkdownExport,
  onPrepareJsonExport,
}: {
  exportPreview: string;
  onPrepareMarkdownExport: () => void;
  onPrepareJsonExport: () => void;
}) {
  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:h-full">
      <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
        <h3 className="text-[15px] font-semibold text-slate-950">Export Records</h3>
        <p className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">
          Exports are generated from project records rather than rendered UI, so records stay stable as the app evolves.
        </p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onPrepareMarkdownExport}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white"
          >
            <Download size={15} />
            Generate Markdown
          </button>
          <button
            type="button"
            onClick={onPrepareJsonExport}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700"
          >
            <Database size={15} />
            Generate Project JSON
          </button>
        </div>
      </section>
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
        <PanelHeader title="Export Preview" detail="Portable project record" />
        <pre className="h-full overflow-auto whitespace-pre-wrap p-5 text-[13px] leading-6 text-slate-800">
          {exportPreview || "Choose an export format to prepare a portable project record."}
        </pre>
      </section>
    </div>
  );
}

function MetricPanel({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase text-[var(--color-muted)]">{label}</span>
        <Icon size={16} className="text-[var(--color-accent)]" />
      </div>
      <p className="mt-3 text-[24px] font-semibold text-slate-950">{value}</p>
      <p className="text-[12px] text-[var(--color-muted)]">{detail}</p>
    </section>
  );
}

function SessionCard({
  activeSession,
  sessions,
  canEditProject,
  onStartSession,
  onUpdateActiveSessionNotes,
  onEndSession,
}: {
  activeSession: ReturnType<typeof useWorkspaceStore.getState>["sessions"][number] | undefined;
  sessions: ReturnType<typeof useWorkspaceStore.getState>["sessions"];
  canEditProject: boolean;
  onStartSession: () => void;
  onUpdateActiveSessionNotes: (notes: string) => void;
  onEndSession: () => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-950">Focus Session</h3>
          <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">Track actual work time</p>
        </div>
        <Timer size={18} className="text-[var(--color-accent)]" />
      </div>
      {activeSession ? (
        <div className="mt-4 rounded-md border border-[var(--color-accent)] bg-[var(--color-selection)] p-3">
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">{activeSession.title}</p>
          <p className="mt-2 text-[26px] font-semibold text-[var(--color-accent)]">
            {formatDuration(getElapsedMinutes(activeSession.startedAt, null))}
          </p>
          <label className="mt-3 block">
            <span className="text-[12px] font-semibold text-[var(--color-ink)]">Session notes</span>
            <textarea
              value={activeSession.notes}
              onChange={(event) => onUpdateActiveSessionNotes(event.target.value)}
              placeholder="What changed during this block?"
              className="mt-1 min-h-[82px] w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] leading-5 text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]"
            />
          </label>
          <button
            type="button"
            onClick={onEndSession}
            className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white"
          >
            <Square size={13} />
            End Session
          </button>
        </div>
      ) : canEditProject ? (
        <button
          type="button"
          onClick={onStartSession}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white"
        >
          <Play size={14} />
          Start Focus Session
        </button>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 py-4 text-center text-[12px] leading-5 text-[var(--color-muted)]">
          Restore this project before tracking new sessions.
        </div>
      )}
      <p className="mt-3 text-[12px] text-[var(--color-muted)]">{sessions.length} sessions recorded</p>
    </section>
  );
}

function TaskStack({
  tasks,
  canEditProject,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteTask,
}: {
  tasks: Task[];
  canEditProject: boolean;
  onCreateTask: () => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
      <PanelHeader title="Task Stack" detail="Next commitments" />
      <div className="space-y-3 p-3">
        {tasks.length === 0 ? (
          canEditProject ? (
            <button
              type="button"
              onClick={onCreateTask}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-[var(--color-border)] bg-slate-50 px-3 py-4 text-center text-[12px] font-semibold whitespace-nowrap text-[var(--color-muted)] transition hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
            >
              <Plus size={13} />
              New Task
            </button>
          ) : (
            <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 py-4 text-center text-[12px] leading-5 text-[var(--color-muted)]">
              Restore this project before adding tasks.
            </p>
          )
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              canEditProject={canEditProject}
              onUpdateTaskStatus={onUpdateTaskStatus}
              onDeleteTask={onDeleteTask}
            />
          ))
        )}
      </div>
    </section>
  );
}

function TaskCard({
  task,
  canEditProject,
  onUpdateTaskStatus,
  onDeleteTask,
}: {
  task: Task;
  canEditProject: boolean;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  return (
    <article className="rounded-md border border-[var(--color-border)] bg-white p-3">
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[13px] font-semibold leading-5 text-slate-950">{task.title}</p>
        {canEditProject && (
          <button
            type="button"
            onClick={() => onDeleteTask(task.id)}
            aria-label={`Delete ${task.title}`}
            title="Delete task"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-700"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
      <div className="mt-3 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[12px] text-[var(--color-muted)]">
            {task.dueDate ? `Due ${formatShortDate(task.dueDate)}` : "No due date"}
          </span>
          <span
            className={clsx(
              "shrink-0 rounded-md border px-2 py-1 text-[11px] font-semibold whitespace-nowrap capitalize",
              priorityClasses[task.priority],
            )}
          >
            {task.priority}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(["todo", "in_progress", "done", "archived"] as TaskStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              aria-label={`Set task to ${taskStatusLabels[status]}`}
              title={taskStatusLabels[status]}
              onClick={() => onUpdateTaskStatus(task.id, status)}
              disabled={!canEditProject}
              className={clsx(
                "flex h-8 min-w-0 items-center justify-center rounded-md px-1.5 text-center text-[11px] font-semibold leading-none transition",
                task.status === status
                  ? "bg-[var(--color-accent)] text-white"
                  : canEditProject
                    ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    : "bg-slate-100 text-slate-400 opacity-70",
              )}
            >
              {status === "done" && <Check size={13} />}
              {status === "in_progress" && <Timer size={13} />}
              {status === "todo" && <Circle size={13} />}
              {status === "archived" && <Archive size={13} />}
            </button>
          ))}
        </div>
      </div>
    </article>
  );
}

function TimelineStack({ timelineEvents }: { timelineEvents: TimelineEvent[] }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
      <PanelHeader title="Recent Timeline" detail="Latest project movement" />
      <div className="p-4">
        {timelineEvents.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 py-4 text-center text-[12px] leading-5 text-[var(--color-muted)]">
            Timeline events appear as project work changes.
          </p>
        ) : (
          <TimelineList timelineEvents={timelineEvents} />
        )}
      </div>
    </section>
  );
}

function TimelineList({ timelineEvents }: { timelineEvents: TimelineEvent[] }) {
  return (
    <div className="space-y-4">
      {timelineEvents.map((event) => (
        <div key={event.id} className="grid grid-cols-[18px_minmax(0,1fr)] gap-3">
          <span className="mt-1 h-3 w-3 rounded-full border-2 border-[var(--color-surface)] bg-[var(--color-accent)] ring-1 ring-[var(--color-border)]" />
          <div>
            <p className="text-[13px] font-semibold text-slate-950">{event.title}</p>
            <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">{event.description}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-400">{formatDateTime(event.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function MarkdownReadingSurface({ content }: { content: string }) {
  return (
    <div className="flowdesk-markdown max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

function PanelHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
      <div className="min-w-0">
        <h3 className="truncate text-[14px] font-semibold text-slate-950">{title}</h3>
        <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]">{detail}</p>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, onClick }: { icon: LucideIcon; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-10 shrink-0 items-center justify-center gap-0 rounded-md border border-[var(--color-border)] bg-white px-0 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 sm:w-auto sm:gap-2 sm:px-3"
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function IconButton({
  icon: Icon,
  label,
  isActive,
  size = "sm",
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center rounded-md border transition",
        size === "md" ? "h-9 w-9 shrink-0" : "h-8 w-8",
        isActive
          ? "border-[var(--color-accent)] bg-blue-50 text-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
      )}
    >
      <Icon size={14} />
    </button>
  );
}

function EmptyState({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
      <NotebookText size={26} className="text-slate-400" />
      <p className="mt-3 text-[14px] font-semibold text-slate-950">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-6 text-[var(--color-muted)]">{detail}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white"
        >
          <Plus size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
