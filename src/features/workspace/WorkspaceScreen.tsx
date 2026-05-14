import {
  Archive,
  BookOpen,
  Check,
  CheckSquare,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FileArchive,
  FileText,
  Folder,
  ListChecks,
  Moon,
  NotebookText,
  PanelLeft,
  Pin,
  Play,
  Plus,
  Search,
  Square,
  Sun,
  Tags,
  Timer,
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
import { useWorkspaceStore, type CreateProjectInput } from "../../stores/workspaceStore";

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
  { id: "references", label: "References", icon: BookOpen },
  { id: "files", label: "Files", icon: Folder },
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

export function WorkspaceScreen() {
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const storedTheme = window.localStorage.getItem("flowdesk.theme");

    return storedTheme === "dark" ? "dark" : "light";
  });
  const projects = useWorkspaceStore((state) => state.projects);
  const notes = useWorkspaceStore((state) => state.notes);
  const tasks = useWorkspaceStore((state) => state.tasks);
  const sessions = useWorkspaceStore((state) => state.sessions);
  const references = useWorkspaceStore((state) => state.references);
  const files = useWorkspaceStore((state) => state.files);
  const timelineEvents = useWorkspaceStore((state) => state.timelineEvents);
  const selectedProjectId = useWorkspaceStore((state) => state.selectedProjectId);
  const selectedNoteId = useWorkspaceStore((state) => state.selectedNoteId);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const exportPreview = useWorkspaceStore((state) => state.exportPreview);
  const selectProject = useWorkspaceStore((state) => state.selectProject);
  const selectNote = useWorkspaceStore((state) => state.selectNote);
  const setActiveView = useWorkspaceStore((state) => state.setActiveView);
  const updateSelectedNoteContent = useWorkspaceStore((state) => state.updateSelectedNoteContent);
  const createNote = useWorkspaceStore((state) => state.createNote);
  const createTask = useWorkspaceStore((state) => state.createTask);
  const createProject = useWorkspaceStore((state) => state.createProject);
  const toggleProjectPinned = useWorkspaceStore((state) => state.toggleProjectPinned);
  const archiveProject = useWorkspaceStore((state) => state.archiveProject);
  const updateTaskStatus = useWorkspaceStore((state) => state.updateTaskStatus);
  const startSession = useWorkspaceStore((state) => state.startSession);
  const endActiveSession = useWorkspaceStore((state) => state.endActiveSession);
  const prepareMarkdownExport = useWorkspaceStore((state) => state.prepareMarkdownExport);
  const prepareJsonExport = useWorkspaceStore((state) => state.prepareJsonExport);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const projectNotes = selectedProject ? notes.filter((note) => note.projectId === selectedProject.id) : [];
  const selectedNote = selectedProject ? notes.find((note) => note.id === selectedNoteId) ?? projectNotes[0] : undefined;
  const projectTasks = selectedProject ? tasks.filter((task) => task.projectId === selectedProject.id) : [];
  const projectSessions = selectedProject ? sessions.filter((session) => session.projectId === selectedProject.id) : [];
  const projectReferences = selectedProject ? references.filter((reference) => reference.projectId === selectedProject.id) : [];
  const projectFiles = selectedProject ? files.filter((file) => file.projectId === selectedProject.id) : [];
  const projectTimelineEvents = selectedProject ? timelineEvents.filter((event) => event.projectId === selectedProject.id) : [];
  const activeSession = projectSessions.find((session) => session.endedAt === null);
  const openCreateProjectDialog = () => setIsCreateProjectDialogOpen(true);
  const closeCreateProjectDialog = () => setIsCreateProjectDialogOpen(false);
  const handleCreateProject = (input: CreateProjectInput) => {
    createProject(input);
    closeCreateProjectDialog();
  };

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("flowdesk.theme", theme);
  }, [theme]);

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--color-app-bg)] text-[var(--color-ink)] lg:h-screen lg:min-h-[720px] lg:flex-row lg:overflow-hidden">
      <ProjectSidebar
        projects={projects}
        selectedProjectId={selectedProject?.id ?? ""}
        onSelectProject={selectProject}
        onCreateProject={openCreateProjectDialog}
        onToggleProjectPinned={toggleProjectPinned}
        onArchiveProject={archiveProject}
        theme={theme}
        onChangeTheme={setTheme}
      />
      <main className="flex min-w-0 flex-1 flex-col">
        {selectedProject ? (
          <>
            <WorkspaceHeader
              project={selectedProject}
              activeSessionLabel={activeSession ? formatDuration(getElapsedMinutes(activeSession.startedAt, null)) : null}
              onCreateNote={createNote}
              onCreateTask={createTask}
              onStartSession={startSession}
              onEndSession={endActiveSession}
              onPrepareMarkdownExport={prepareMarkdownExport}
              onArchiveProject={() => archiveProject(selectedProject.id)}
            />
            <ViewTabs activeView={activeView} onSelectView={setActiveView} />
            <section className="min-h-0 flex-1 overflow-visible px-3 pb-5 sm:px-5 lg:overflow-hidden">
              {activeView === "overview" && (
                <OverviewView
                  project={selectedProject}
                  notes={projectNotes}
                  tasks={projectTasks}
                  sessions={projectSessions}
                  references={projectReferences}
                  files={projectFiles}
                  timelineEvents={projectTimelineEvents}
                  selectedNote={selectedNote}
                  onSelectNote={selectNote}
                  onCreateNote={createNote}
                  onUpdateTaskStatus={updateTaskStatus}
                  onStartSession={startSession}
                  onEndSession={endActiveSession}
                />
              )}
              {activeView === "notes" && (
                <NotesView
                  notes={projectNotes}
                  selectedNoteId={selectedNote?.id ?? ""}
                  selectedNoteContent={selectedNote?.content ?? ""}
                  onSelectNote={selectNote}
                  onUpdateContent={updateSelectedNoteContent}
                  onCreateNote={createNote}
                />
              )}
              {activeView === "tasks" && <TasksView tasks={projectTasks} onUpdateTaskStatus={updateTaskStatus} />}
              {activeView === "sessions" && (
                <SessionsView sessions={projectSessions} onStartSession={startSession} onEndSession={endActiveSession} />
              )}
              {activeView === "references" && <ReferencesView references={projectReferences} />}
              {activeView === "files" && <FilesView files={projectFiles} />}
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
          <FirstRunView onCreateProject={openCreateProjectDialog} />
        )}
      </main>
      <CreateProjectDialog isOpen={isCreateProjectDialogOpen} onClose={closeCreateProjectDialog} onCreateProject={handleCreateProject} />
    </div>
  );
}

function FirstRunView({ onCreateProject }: { onCreateProject: () => void }) {
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-6 py-10">
      <div className="grid w-full max-w-5xl gap-8 rounded-[10px] border border-[var(--color-border)] bg-white p-8 shadow-[var(--shadow-soft)] lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[var(--color-accent)] text-white">
            <PanelLeft size={20} />
          </div>
          <h2 className="mt-6 max-w-2xl text-[32px] font-semibold leading-tight tracking-normal text-slate-950">
            Create a quiet command center for your research work.
          </h2>
          <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--color-muted)]">
            FlowDesk starts empty. Add a project when you are ready, then build notes, tasks, sessions, files, references,
            timeline records, and exports around that project.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onCreateProject}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-strong)]"
            >
              <Plus size={15} />
              Create Project
            </button>
            <span className="inline-flex h-10 items-center rounded-md border border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 text-[13px] font-semibold text-slate-600">
              Local-first by design
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-[var(--color-border)] bg-[#f8faf9] p-4">
          <p className="text-[12px] font-semibold uppercase text-[var(--color-muted)]">Workspace structure</p>
          <div className="mt-4 space-y-2">
            {[
              { icon: NotebookText, title: "Notes", detail: "Markdown records and source-linked thinking" },
              { icon: CheckSquare, title: "Tasks", detail: "Priorities, due dates, completion state" },
              { icon: Timer, title: "Sessions", detail: "Actual work blocks and activity history" },
              { icon: Download, title: "Exports", detail: "Portable records outside the app" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="flex gap-3 rounded-md border border-[var(--color-border)] bg-white p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#eef6f4] text-[var(--color-accent)]">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-slate-950">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-5 text-[var(--color-muted)]">{item.detail}</span>
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
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

  if (!isOpen) {
    return null;
  }

  const parsedTags = tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
  const canCreateProject = title.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateProject) {
      return;
    }

    onCreateProject({
      title,
      description,
      tags: parsedTags,
      accent,
    });
    setTitle("");
    setDescription("");
    setTags("");
    setAccent("teal");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[560px] rounded-[10px] border border-[var(--color-border)] bg-white shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-950">New Project</h2>
            <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">Create a clean workspace. Nothing is prefilled.</p>
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
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-700">Project name</span>
            <input
              autoFocus
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Literature review"
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-[14px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-teal-100"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-700">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What should this project help you organize?"
              rows={3}
              className="mt-1 w-full resize-none rounded-md border border-[var(--color-border)] bg-white px-3 py-2 text-[14px] leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-teal-100"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-slate-700">Tags</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="literature, imaging, experiments"
              className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-white px-3 text-[14px] text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-teal-100"
            />
          </label>
          <fieldset>
            <legend className="text-[12px] font-semibold text-slate-700">Color</legend>
            <div className="mt-2 flex gap-2">
              {(["teal", "blue", "violet", "amber", "rose"] as Project["accent"][]).map((accentOption) => (
                <button
                  key={accentOption}
                  type="button"
                  aria-label={`Use ${accentOption} project color`}
                  onClick={() => setAccent(accentOption)}
                  className={clsx(
                    "h-8 w-8 rounded-md border-2 transition",
                    accentClasses[accentOption],
                    accent === accentOption ? "border-slate-950" : "border-transparent",
                  )}
                />
              ))}
            </div>
          </fieldset>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[#f8faf9] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-[var(--color-border)] bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canCreateProject}
            className="h-9 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold text-white transition hover:bg-[var(--color-accent-strong)] disabled:bg-slate-300"
          >
            Create Project
          </button>
        </div>
      </form>
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
  theme: "light" | "dark";
  onChangeTheme: (theme: "light" | "dark") => void;
}

function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onToggleProjectPinned,
  onArchiveProject,
  theme,
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
          <div className="flex items-center gap-1">
            <IconButton label="Light theme" icon={Sun} isActive={theme === "light"} onClick={() => onChangeTheme("light")} />
            <IconButton label="Dark theme" icon={Moon} isActive={theme === "dark"} onClick={() => onChangeTheme("dark")} />
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
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[#f8faf9] px-3 py-5 text-center">
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
                  />
                ))}
              </SidebarSection>
            )}
          </>
        )}
      </div>

      <div className="border-t border-[var(--color-border)] p-3">
        <button
          type="button"
          onClick={onCreateProject}
          className="flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[var(--color-accent-strong)]"
        >
          <Plus size={15} />
          New Project
        </button>
      </div>
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
}: {
  project: Project;
  isSelected: boolean;
  onSelectProject: (projectId: string) => void;
  onToggleProjectPinned: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
}) {
  return (
    <div
      className={clsx(
        "group flex w-full items-center gap-1 rounded-md px-2 py-2 transition",
        isSelected ? "bg-[#e7f1ef] text-slate-950" : "text-slate-700 hover:bg-slate-50",
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
          <span className="mt-0.5 block truncate text-[12px] text-[var(--color-muted)]">{project.tags.join(", ")}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label={project.isPinned ? `Unpin ${project.title}` : `Pin ${project.title}`}
        title={project.isPinned ? "Unpin project" : "Pin project"}
        onClick={() => onToggleProjectPinned(project.id)}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-white hover:text-[var(--color-accent)] lg:opacity-0 lg:group-hover:opacity-100"
      >
        <Pin size={13} />
      </button>
      {project.status === "archived" ? (
        <Archive size={14} className="shrink-0 text-slate-400" />
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
  onCreateNote,
  onCreateTask,
  onStartSession,
  onEndSession,
  onPrepareMarkdownExport,
  onArchiveProject,
}: {
  project: Project;
  activeSessionLabel: string | null;
  onCreateNote: () => void;
  onCreateTask: () => void;
  onStartSession: () => void;
  onEndSession: () => void;
  onPrepareMarkdownExport: () => void;
  onArchiveProject: () => void;
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
              <p className="mt-0.5 max-w-3xl truncate text-[13px] text-[var(--color-muted)]">{project.description}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {project.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex h-6 items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-app-bg)] px-2 text-[12px] font-medium text-slate-700"
              >
                <Tags size={12} />
                {tag}
              </span>
            ))}
            <span className="text-[12px] text-[var(--color-muted)]">Updated {formatDateTime(project.updatedAt)}</span>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 xl:w-auto xl:shrink-0">
          {activeSessionLabel ? (
            <button
              type="button"
              onClick={onEndSession}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-[13px] font-semibold text-red-700 transition hover:bg-red-100"
            >
              <Square size={14} />
              End {activeSessionLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartSession}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 text-[13px] font-semibold text-teal-800 transition hover:bg-teal-100"
            >
              <Play size={14} />
              Start Session
            </button>
          )}
          <ActionButton icon={NotebookText} label="New Note" onClick={onCreateNote} />
          <ActionButton icon={ListChecks} label="New Task" onClick={onCreateTask} />
          <ActionButton icon={Download} label="Export" onClick={onPrepareMarkdownExport} />
          {project.status === "active" && <ActionButton icon={Archive} label="Archive" onClick={onArchiveProject} />}
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
            onClick={() => onSelectView(item.id)}
            className={clsx(
              "inline-flex h-8 shrink-0 items-center gap-2 rounded-md px-3 text-[13px] font-semibold transition",
              activeView === item.id
                ? "bg-[var(--color-accent)] text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
            )}
          >
            <Icon size={14} />
            {item.label}
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
  references,
  files,
  timelineEvents,
  selectedNote,
  onSelectNote,
  onCreateNote,
  onUpdateTaskStatus,
  onStartSession,
  onEndSession,
}: {
  project: Project;
  notes: ReturnType<typeof useWorkspaceStore.getState>["notes"];
  tasks: Task[];
  sessions: ReturnType<typeof useWorkspaceStore.getState>["sessions"];
  references: ReturnType<typeof useWorkspaceStore.getState>["references"];
  files: ReturnType<typeof useWorkspaceStore.getState>["files"];
  timelineEvents: TimelineEvent[];
  selectedNote: ReturnType<typeof useWorkspaceStore.getState>["notes"][number] | undefined;
  onSelectNote: (noteId: string) => void;
  onCreateNote: () => void;
  onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void;
  onStartSession: () => void;
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
          <MetricPanel label="References" value={references.length.toString()} detail="Linked sources" icon={BookOpen} />
        </div>

        <div className="grid min-h-0 grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-[var(--color-border)] bg-[#fbfcfc] lg:border-b-0 lg:border-r">
            <PanelHeader title="Project Notes" detail={`${project.title} / ${notes.length} notes`} />
            <div className="space-y-1 p-3">
              {notes.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--color-border)] bg-white px-3 py-4 text-center">
                  <p className="text-[13px] font-semibold text-slate-900">No notes yet</p>
                  <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">Capture the first durable project record.</p>
                  <button
                    type="button"
                    onClick={onCreateNote}
                    className="mt-3 inline-flex h-8 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-white"
                  >
                    <Plus size={13} />
                    New Note
                  </button>
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
                        ? "border-teal-200 bg-teal-50"
                        : "border-transparent hover:border-slate-200 hover:bg-white",
                    )}
                  >
                    <span className="block truncate text-[13px] font-semibold text-slate-900">{note.title}</span>
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
                detail="Create a note to start building the project record."
                actionLabel="New Note"
                onAction={onCreateNote}
              />
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 space-y-5 overflow-visible xl:overflow-y-auto">
        <SessionCard activeSession={activeSession} sessions={sessions} onStartSession={onStartSession} onEndSession={onEndSession} />
        <TaskStack tasks={tasks.slice(0, 4)} onUpdateTaskStatus={onUpdateTaskStatus} />
        <TimelineStack timelineEvents={timelineEvents.slice(0, 4)} />
        <FileStack files={files.slice(0, 3)} />
      </div>
    </div>
  );
}

function NotesView({
  notes,
  selectedNoteId,
  selectedNoteContent,
  onSelectNote,
  onUpdateContent,
  onCreateNote,
}: {
  notes: ReturnType<typeof useWorkspaceStore.getState>["notes"];
  selectedNoteId: string;
  selectedNoteContent: string;
  onSelectNote: (noteId: string) => void;
  onUpdateContent: (content: string) => void;
  onCreateNote: () => void;
}) {
  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] xl:h-full xl:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.8fr)]">
      <aside className="min-h-0 border-b border-[var(--color-border)] bg-[#fbfcfc] xl:border-b-0 xl:border-r">
        <PanelHeader title="Notes" detail="Folders and records" />
        <div className="space-y-1 p-3">
          {notes.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-white px-3 py-4 text-center">
              <p className="text-[13px] font-semibold text-slate-900">No notes yet</p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">Create the first durable record for this project.</p>
              <button
                type="button"
                onClick={onCreateNote}
                className="mt-3 inline-flex h-8 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[12px] font-semibold text-white"
              >
                <Plus size={13} />
                New Note
              </button>
            </div>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onSelectNote(note.id)}
                className={clsx(
                  "w-full rounded-md px-3 py-2 text-left transition",
                  note.id === selectedNoteId ? "bg-[#e7f1ef]" : "hover:bg-white",
                )}
              >
                <span className="block truncate text-[13px] font-semibold text-slate-900">{note.title}</span>
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
            <p className="truncate text-[13px] font-semibold text-slate-950">{selectedNote?.title ?? "Untitled"}</p>
            <p className="text-[12px] text-[var(--color-muted)]">CodeMirror Markdown editor</p>
          </div>
          <span className="rounded-md bg-slate-100 px-2 py-1 text-[12px] font-medium text-slate-600">Saved locally</span>
        </div>
        {selectedNote ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-[13px] font-medium text-[var(--color-muted)]">
                Loading Markdown editor
              </div>
            }
          >
            <MarkdownEditor value={selectedNoteContent} onChange={onUpdateContent} />
          </Suspense>
        ) : (
          <EmptyState title="No note selected" detail="Create a note to open the Markdown editor." />
        )}
      </section>

      <section className="grid min-h-[480px] grid-rows-[48px_minmax(0,1fr)] bg-[#fbfcfc] xl:min-h-0">
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

function TasksView({ tasks, onUpdateTaskStatus }: { tasks: Task[]; onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void }) {
  const groupedStatuses: TaskStatus[] = ["todo", "in_progress", "done", "archived"];

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-4 pt-5 md:grid-cols-2 xl:h-full xl:grid-cols-4">
      {groupedStatuses.map((status) => (
        <section key={status} className="min-h-0 rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
          <PanelHeader title={taskStatusLabels[status]} detail={`${tasks.filter((task) => task.status === status).length} tasks`} />
          <div className="space-y-3 p-3">
            {tasks
              .filter((task) => task.status === status)
              .map((task) => (
                <TaskCard key={task.id} task={task} onUpdateTaskStatus={onUpdateTaskStatus} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function SessionsView({
  sessions,
  onStartSession,
  onEndSession,
}: {
  sessions: ReturnType<typeof useWorkspaceStore.getState>["sessions"];
  onStartSession: () => void;
  onEndSession: () => void;
}) {
  const activeSession = sessions.find((session) => session.endedAt === null);

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 lg:grid-cols-[360px_minmax(0,1fr)] xl:h-full">
      <SessionCard activeSession={activeSession} sessions={sessions} onStartSession={onStartSession} onEndSession={onEndSession} />
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
        <PanelHeader title="Session History" detail="Actual work blocks over time" />
        <div className="min-h-0 divide-y divide-[var(--color-border)] overflow-y-auto">
          {sessions.map((session) => (
            <div key={session.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[14px] font-semibold text-slate-950">{session.title}</p>
                  <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[var(--color-muted)]">{session.notes}</p>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-[12px] font-semibold text-slate-600">
                  {session.durationMinutes
                    ? formatDuration(session.durationMinutes)
                    : formatDuration(getElapsedMinutes(session.startedAt, null))}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function ReferencesView({ references }: { references: ReturnType<typeof useWorkspaceStore.getState>["references"] }) {
  return (
    <div className="h-auto min-h-0 pt-5 xl:h-full">
      <section className="h-auto min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)] xl:h-full">
        <PanelHeader title="References" detail="Papers, links, documentation, books, and source summaries" />
        <div className="divide-y divide-[var(--color-border)]">
          {references.map((reference) => (
            <div key={reference.id} className="grid grid-cols-1 gap-3 px-5 py-4 md:grid-cols-[160px_minmax(0,1fr)_220px] md:gap-4">
              <span className="inline-flex h-7 w-fit items-center rounded-md border border-blue-200 bg-blue-50 px-2 text-[12px] font-semibold capitalize text-blue-700">
                {reference.type}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-slate-950">{reference.title}</p>
                <p className="mt-1 text-[13px] leading-6 text-[var(--color-muted)]">{reference.summary}</p>
              </div>
              <div className="min-w-0 text-left md:text-right">
                <p className="truncate text-[12px] font-medium text-slate-500">{reference.source}</p>
                <p className="mt-2 text-[12px] text-[var(--color-muted)]">{reference.tags.join(", ")}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function FilesView({ files }: { files: ReturnType<typeof useWorkspaceStore.getState>["files"] }) {
  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:h-full">
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
        <PanelHeader title="Project Files" detail="Imported PDFs, images, CSVs, Markdown, and text files" />
        <div className="divide-y divide-[var(--color-border)]">
          {files.map((file) => (
            <div key={file.id} className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-4 px-5 py-3 md:grid-cols-[36px_minmax(0,1fr)_120px_160px]">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <FileText size={16} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[14px] font-semibold text-slate-950">{file.name}</p>
                <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]">{file.path}</p>
              </div>
              <span className="text-[13px] font-medium uppercase text-slate-500">{file.fileType}</span>
              <span className="text-left text-[13px] text-[var(--color-muted)] md:text-right">{file.sizeLabel}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-dashed border-teal-300 bg-teal-50/60 p-5">
        <div className="flex h-full min-h-[260px] flex-col items-center justify-center rounded-md border border-dashed border-teal-300 bg-white/60 px-6 text-center">
          <FileArchive className="text-teal-700" size={28} />
          <p className="mt-3 text-[14px] font-semibold text-slate-950">Import workspace files</p>
          <p className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">
            Drop PDFs, images, CSVs, text, or Markdown files here to attach them to the selected project.
          </p>
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
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold text-white"
          >
            <Download size={15} />
            Generate Markdown
          </button>
          <button
            type="button"
            onClick={onPrepareJsonExport}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 text-[13px] font-semibold text-slate-700"
          >
            <Database size={15} />
            Generate JSON Backup
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
  onStartSession,
  onEndSession,
}: {
  activeSession: ReturnType<typeof useWorkspaceStore.getState>["sessions"][number] | undefined;
  sessions: ReturnType<typeof useWorkspaceStore.getState>["sessions"];
  onStartSession: () => void;
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
        <div className="mt-4 rounded-md border border-teal-200 bg-teal-50 p-3">
          <p className="text-[13px] font-semibold text-teal-950">{activeSession.title}</p>
          <p className="mt-2 text-[26px] font-semibold text-teal-900">
            {formatDuration(getElapsedMinutes(activeSession.startedAt, null))}
          </p>
          <p className="mt-1 text-[12px] leading-5 text-teal-800">{activeSession.notes}</p>
          <button
            type="button"
            onClick={onEndSession}
            className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-md bg-teal-800 px-3 text-[13px] font-semibold text-white"
          >
            <Square size={13} />
            End Session
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onStartSession}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold text-white"
        >
          <Play size={14} />
          Start Focus Session
        </button>
      )}
      <p className="mt-3 text-[12px] text-[var(--color-muted)]">{sessions.length} sessions recorded</p>
    </section>
  );
}

function TaskStack({ tasks, onUpdateTaskStatus }: { tasks: Task[]; onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
      <PanelHeader title="Task Stack" detail="Next commitments" />
      <div className="space-y-3 p-3">
        {tasks.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[#f8faf9] px-3 py-4 text-center text-[12px] leading-5 text-[var(--color-muted)]">
            No tasks have been created for this project.
          </p>
        ) : (
          tasks.map((task) => <TaskCard key={task.id} task={task} onUpdateTaskStatus={onUpdateTaskStatus} />)
        )}
      </div>
    </section>
  );
}

function TaskCard({ task, onUpdateTaskStatus }: { task: Task; onUpdateTaskStatus: (taskId: string, status: TaskStatus) => void }) {
  return (
    <article className="rounded-md border border-[var(--color-border)] bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[13px] font-semibold leading-5 text-slate-950">{task.title}</p>
        <span className={clsx("rounded-md border px-2 py-1 text-[11px] font-semibold capitalize", priorityClasses[task.priority])}>
          {task.priority}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-[12px] text-[var(--color-muted)]">Due {formatShortDate(task.dueDate)}</span>
        <div className="flex items-center gap-1">
          {(["todo", "in_progress", "done"] as TaskStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => onUpdateTaskStatus(task.id, status)}
              className={clsx(
                "h-7 rounded-md px-2 text-[11px] font-semibold transition",
                task.status === status ? "bg-[var(--color-accent)] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              {status === "done" ? <Check size={13} /> : taskStatusLabels[status]}
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
          <p className="rounded-md border border-dashed border-[var(--color-border)] bg-[#f8faf9] px-3 py-4 text-center text-[12px] leading-5 text-[var(--color-muted)]">
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
          <span className="mt-1 h-3 w-3 rounded-full border-2 border-white bg-[var(--color-accent)] shadow-[0_0_0_1px_#9fcac4]" />
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

function FileStack({ files }: { files: ReturnType<typeof useWorkspaceStore.getState>["files"] }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-white shadow-[var(--shadow-soft)]">
      <PanelHeader title="Files" detail="Attached evidence" />
      <div className="divide-y divide-[var(--color-border)]">
        {files.length === 0 ? (
          <p className="m-3 rounded-md border border-dashed border-[var(--color-border)] bg-[#f8faf9] px-3 py-4 text-center text-[12px] leading-5 text-[var(--color-muted)]">
            Imported files will be listed here.
          </p>
        ) : (
          files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                <FileText size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-slate-900">{file.name}</p>
                <p className="text-[12px] text-[var(--color-muted)]">{file.sizeLabel}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
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
      onClick={onClick}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-white px-3 text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function IconButton({
  icon: Icon,
  label,
  isActive,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={clsx(
        "flex h-8 w-8 items-center justify-center rounded-md border transition",
        isActive
          ? "border-[var(--color-accent)] bg-[#eef6f4] text-[var(--color-accent)]"
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
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold text-white"
        >
          <Plus size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
