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
  FileText,
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
  Upload,
  X,
} from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { clsx } from "clsx";
import type { FormEvent, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { Project, Task, TaskPriority, TaskStatus, TimelineEvent, WorkspaceFile, WorkspaceView } from "../../domain/workspace";
import { formatDateTime, formatDuration, formatShortDate, getElapsedMinutes } from "../../lib/date";
import {
  revealSavedProjectRecord,
  saveProjectRecord,
  type ExportFormat,
} from "../../lib/exportProjectRecord";
import type { WorkspacePersistenceMode } from "../../lib/persistence/workspaceRepository";
import { openWorkspaceFile, revealWorkspaceFile, selectWorkspaceFiles } from "../../lib/workspaceFiles";
import {
  useWorkspaceStore,
  type CreateProjectInput,
  type CreateTaskInput,
  type PersistenceStatus,
  type UpdateProjectInput,
} from "../../stores/workspaceStore";
import { CommandPalette, type CommandPaletteItem } from "./components/CommandPalette";
import { ActionButton, EmptyState, IconButton, PanelHeader } from "./components/WorkspacePrimitives";
import { useDialogControls } from "./hooks/useDialogControls";
import { useNativeMenuEvents, type NativeWorkspaceMenuCommand } from "./hooks/useNativeMenuEvents";
import { useWorkspaceTheme } from "./hooks/useWorkspaceTheme";
import { FilesView } from "./views/FilesView";
import { accentClasses, priorityClasses, taskStatusLabels, viewItems } from "./workspaceConstants";
import {
  formatAriaShortcut,
  formatExportFormat,
  getErrorMessage,
  getStoredThemeMode,
  isTextEntryTarget,
  parseTags,
} from "./workspaceUtils";
import type { ExportSaveState, ThemeMode } from "./workspaceTypes";

const MarkdownEditor = lazy(() =>
  import("../../components/MarkdownEditor").then((module) => ({
    default: module.MarkdownEditor,
  })),
);

export function WorkspaceScreen() {
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [pendingProjectDeleteId, setPendingProjectDeleteId] = useState<string | null>(null);
  const [pendingNoteDeleteId, setPendingNoteDeleteId] = useState<string | null>(null);
  const [pendingTaskDeleteId, setPendingTaskDeleteId] = useState<string | null>(null);
  const [exportSaveState, setExportSaveState] = useState<ExportSaveState | null>(null);
  const [fileActionError, setFileActionError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);
  const projects = useWorkspaceStore((state) => state.projects);
  const notes = useWorkspaceStore((state) => state.notes);
  const tasks = useWorkspaceStore((state) => state.tasks);
  const sessions = useWorkspaceStore((state) => state.sessions);
  const files = useWorkspaceStore((state) => state.files);
  const timelineEvents = useWorkspaceStore((state) => state.timelineEvents);
  const selectedProjectId = useWorkspaceStore((state) => state.selectedProjectId);
  const selectedNoteId = useWorkspaceStore((state) => state.selectedNoteId);
  const activeView = useWorkspaceStore((state) => state.activeView);
  const exportPreview = useWorkspaceStore((state) => state.exportPreview);
  const persistenceMode = useWorkspaceStore((state) => state.persistenceMode);
  const persistenceStatus = useWorkspaceStore((state) => state.persistenceStatus);
  const persistenceError = useWorkspaceStore((state) => state.persistenceError);
  const lastPersistedAt = useWorkspaceStore((state) => state.lastPersistedAt);
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
  const importWorkspaceFiles = useWorkspaceStore((state) => state.importFiles);
  const deleteFile = useWorkspaceStore((state) => state.deleteFile);
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
  const projectFiles = selectedProject ? files.filter((file) => file.projectId === selectedProject.id) : [];
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

  const handleImportFiles = async () => {
    if (!selectedProject || !canEditProject) {
      return;
    }

    setFileActionError(null);

    try {
      const selectedFiles = await selectWorkspaceFiles();
      importWorkspaceFiles(selectedFiles);
    } catch (error: unknown) {
      setFileActionError(getErrorMessage(error));
      setActiveView("files");
    }
  };

  const handleOpenFile = async (path: string) => {
    setFileActionError(null);

    try {
      await openWorkspaceFile(path);
    } catch (error: unknown) {
      setFileActionError(getErrorMessage(error));
    }
  };

  const handleRevealFile = async (path: string) => {
    setFileActionError(null);

    try {
      await revealWorkspaceFile(path);
    } catch (error: unknown) {
      setFileActionError(getErrorMessage(error));
    }
  };

  const handlePrepareMarkdownExport = () => {
    setExportSaveState(null);
    prepareMarkdownExport();
  };

  const handlePrepareJsonExport = () => {
    setExportSaveState(null);
    prepareJsonExport();
  };

  const handleSaveProjectRecord = async (format: ExportFormat) => {
    if (!selectedProject) {
      return;
    }

    setExportSaveState({ status: "saving", format });

    const content = format === "markdown" ? prepareMarkdownExport() : prepareJsonExport();

    if (!content) {
      setExportSaveState({
        status: "error",
        format,
        message: "There is no project record to export.",
      });
      return;
    }

    try {
      const result = await saveProjectRecord({
        projectTitle: selectedProject.title,
        format,
        content,
      });

      if (result.status === "saved") {
        setExportSaveState({ status: "saved", format, path: result.path });
        return;
      }

      if (result.status === "downloaded") {
        setExportSaveState({ status: "downloaded", format, fileName: result.fileName });
        return;
      }

      setExportSaveState({ status: "cancelled", format });
    } catch (error: unknown) {
      setExportSaveState({
        status: "error",
        format,
        message: getErrorMessage(error),
      });
    }
  };

  const handleRevealSavedExport = async () => {
    if (exportSaveState?.status !== "saved") {
      return;
    }

    try {
      await revealSavedProjectRecord(exportSaveState.path);
    } catch (error: unknown) {
      setExportSaveState({
        status: "error",
        format: exportSaveState.format,
        message: getErrorMessage(error),
      });
    }
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

  useWorkspaceTheme(themeMode);

  const handleNativeMenuCommand = useCallback(
    (command: NativeWorkspaceMenuCommand) => {
      if (command === "new_project") {
        setIsCreateProjectDialogOpen(true);
        return;
      }

      if (command === "new_note" && selectedProject && canEditProject) {
        createNote();
        return;
      }

      if (command === "new_task" && selectedProject && canEditProject) {
        openCreateTaskDialog();
        return;
      }

      if (command === "import_files" && selectedProject && canEditProject) {
        void handleImportFiles();
        return;
      }

      if (command === "export_markdown" && selectedProject) {
        void handlePrepareMarkdownExport();
        return;
      }

      if (command === "open_command_palette") {
        setIsCommandPaletteOpen(true);
        return;
      }

      if (command === "search_projects") {
        document.getElementById("flowdesk-project-search")?.focus();
      }
    },
    [canEditProject, createNote, handleImportFiles, handlePrepareMarkdownExport, openCreateTaskDialog, selectedProject],
  );

  useNativeMenuEvents(handleNativeMenuCommand);

  const commandPaletteItems = useMemo<CommandPaletteItem[]>(
    () => [
      {
        id: "new-project",
        label: "New Project",
        detail: "Create a new workspace project",
        shortcut: "Command/Ctrl+Shift+N",
        icon: Plus,
        onSelect: openCreateProjectDialog,
      },
      {
        id: "new-note",
        label: "New Note",
        detail: selectedProject ? selectedProject.title : "Select a project first",
        shortcut: "Command/Ctrl+N",
        icon: NotebookText,
        isDisabled: !selectedProject || !canEditProject,
        onSelect: createNote,
      },
      {
        id: "new-task",
        label: "New Task",
        detail: selectedProject ? selectedProject.title : "Select a project first",
        shortcut: "Command/Ctrl+Shift+T",
        icon: ListChecks,
        isDisabled: !selectedProject || !canEditProject,
        onSelect: openCreateTaskDialog,
      },
      {
        id: "import-files",
        label: "Import Files",
        detail: selectedProject ? selectedProject.title : "Select a project first",
        shortcut: "Command/Ctrl+Shift+I",
        icon: Upload,
        isDisabled: !selectedProject || !canEditProject,
        onSelect: handleImportFiles,
      },
      {
        id: "toggle-session",
        label: activeSession ? "End Session" : "Start Session",
        detail: selectedProject ? "Track actual work time" : "Select a project first",
        shortcut: "Command/Ctrl+Enter",
        icon: activeSession ? Square : Play,
        isDisabled: !selectedProject || !canEditProject,
        onSelect: activeSession ? endActiveSession : startSession,
      },
      {
        id: "export-markdown",
        label: "Export Markdown",
        detail: selectedProject ? "Prepare a portable project record" : "Select a project first",
        shortcut: "Command/Ctrl+E",
        icon: Download,
        isDisabled: !selectedProject,
        onSelect: handlePrepareMarkdownExport,
      },
      {
        id: "project-settings",
        label: "Project Settings",
        detail: selectedProject ? selectedProject.title : "Select a project first",
        icon: Settings2,
        isDisabled: !selectedProject,
        onSelect: () => setIsProjectSettingsOpen(true),
      },
      {
        id: "search-projects",
        label: "Search Projects",
        detail: "Focus the project list search",
        shortcut: "Command/Ctrl+K",
        icon: Search,
        onSelect: () => document.getElementById("flowdesk-project-search")?.focus(),
      },
      ...viewItems.map((item, index) => ({
        id: `view-${item.id}`,
        label: item.label,
        detail: selectedProject ? `Open ${item.label} view` : "Select a project first",
        shortcut: `Command/Ctrl+${index + 1}`,
        icon: item.icon,
        isDisabled: !selectedProject,
        onSelect: () => setActiveView(item.id),
      })),
    ],
    [
      activeSession,
      canEditProject,
      createNote,
      endActiveSession,
      handleImportFiles,
      handlePrepareMarkdownExport,
      openCreateProjectDialog,
      openCreateTaskDialog,
      selectedProject,
      setActiveView,
      startSession,
    ],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const hasCommandModifier = event.metaKey || event.ctrlKey;

      if (!hasCommandModifier || event.altKey) {
        return;
      }

      const key = event.key.toLowerCase();

      if (key === "p" && event.shiftKey) {
        event.preventDefault();
        setIsCommandPaletteOpen(true);
        return;
      }

      if (key === "k") {
        event.preventDefault();
        document.getElementById("flowdesk-project-search")?.focus();
        return;
      }

      if (isTextEntryTarget(event.target)) {
        return;
      }

      const viewIndex = Number.parseInt(key, 10) - 1;

      if (viewIndex >= 0 && viewIndex < viewItems.length) {
        event.preventDefault();
        setActiveView(viewItems[viewIndex].id);
        return;
      }

      if (key === "n") {
        event.preventDefault();

        if (event.shiftKey || !selectedProject || !canEditProject) {
          setIsCreateProjectDialogOpen(true);
          return;
        }

        createNote();
        return;
      }

      if (key === "t" && event.shiftKey && selectedProject && canEditProject) {
        event.preventDefault();
        openCreateTaskDialog();
        return;
      }

      if (key === "i" && event.shiftKey && selectedProject && canEditProject) {
        event.preventDefault();
        void handleImportFiles();
        return;
      }

      if (key === "e" && selectedProject) {
        event.preventDefault();
        handlePrepareMarkdownExport();
        return;
      }

      if (event.key === "Enter" && selectedProject && canEditProject) {
        event.preventDefault();

        if (activeSession) {
          endActiveSession();
          return;
        }

        startSession();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeSession,
    canEditProject,
    createNote,
    endActiveSession,
    handleImportFiles,
    handlePrepareMarkdownExport,
    openCreateTaskDialog,
    selectedProject,
    setActiveView,
    startSession,
  ]);

  if (persistenceStatus === "hydrating") {
    return <WorkspaceBootView themeMode={themeMode} onChangeTheme={setThemeMode} />;
  }

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
        persistenceMode={persistenceMode}
        persistenceStatus={persistenceStatus}
        persistenceError={persistenceError}
        lastPersistedAt={lastPersistedAt}
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
              onPrepareMarkdownExport={handlePrepareMarkdownExport}
              onArchiveProject={() => archiveProject(selectedProject.id)}
              onRestoreProject={() => restoreProject(selectedProject.id)}
              onOpenSettings={() => setIsProjectSettingsOpen(true)}
            />
            <ViewTabs activeView={activeView} onSelectView={setActiveView} />
            <section className="min-h-0 flex-1 overflow-visible px-3 pb-5 sm:px-5 lg:overflow-hidden">
              {persistenceStatus === "error" && <PersistenceAlert error={persistenceError} />}
              {activeView === "overview" && (
                <OverviewView
                  project={selectedProject}
                  notes={projectNotes}
                  tasks={projectTasks}
                  sessions={projectSessions}
                  files={projectFiles}
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
              {activeView === "files" && (
                <FilesView
                  files={projectFiles}
                  canEditProject={canEditProject}
                  fileActionError={fileActionError}
                  onImportFiles={handleImportFiles}
                  onOpenFile={handleOpenFile}
                  onRevealFile={handleRevealFile}
                  onDeleteFile={deleteFile}
                />
              )}
              {activeView === "timeline" && <TimelineView timelineEvents={projectTimelineEvents} />}
              {activeView === "exports" && (
                <ExportsView
                  exportPreview={exportPreview}
                  exportSaveState={exportSaveState}
                  onPrepareMarkdownExport={handlePrepareMarkdownExport}
                  onPrepareJsonExport={handlePrepareJsonExport}
                  onSaveProjectRecord={handleSaveProjectRecord}
                  onRevealSavedExport={handleRevealSavedExport}
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
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        commands={commandPaletteItems}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}

function WorkspaceBootView({
  themeMode,
  onChangeTheme,
}: {
  themeMode: ThemeMode;
  onChangeTheme: (themeMode: ThemeMode) => void;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-app-bg)] px-6 text-[var(--color-ink)]">
      <section
        className="w-full max-w-[420px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]"
        aria-live="polite"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
              <PanelLeft size={18} />
            </span>
            <div>
              <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">FlowDesk</h1>
              <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">Opening local workspace</p>
            </div>
          </div>
          <div className="flex items-center gap-1" aria-label="Theme">
            <IconButton label="Use system theme" icon={Monitor} isActive={themeMode === "system"} onClick={() => onChangeTheme("system")} />
            <IconButton label="Use light theme" icon={Sun} isActive={themeMode === "light"} onClick={() => onChangeTheme("light")} />
            <IconButton label="Use dark theme" icon={Moon} isActive={themeMode === "dark"} onClick={() => onChangeTheme("dark")} />
          </div>
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-subtle)]">
          <div className="h-full w-1/2 rounded-full bg-[var(--color-accent)] motion-safe:animate-pulse" />
        </div>
      </section>
    </main>
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
            aria-pressed={value === accentOption}
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
  const dialogRef = useDialogControls<HTMLFormElement>(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle("");
    setDescription("");
    setTags("");
    setAccent("teal");
  }, [isOpen]);

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
        ref={dialogRef}
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
  const dialogRef = useDialogControls<HTMLFormElement>(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle("");
    setPriority("medium");
    setDueDate("");
    setTags("");
  }, [isOpen]);

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
        ref={dialogRef}
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
                  aria-pressed={priority === priorityOption}
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
  const dialogRef = useDialogControls<HTMLFormElement>(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(project.title);
    setDescription(project.description);
    setTags(project.tags.join(", "));
    setAccent(project.accent);
  }, [isOpen, project]);

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
        ref={dialogRef}
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
  const dialogRef = useDialogControls<HTMLDivElement>(isOpen, onCancel);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const focusFrame = window.requestAnimationFrame(() => cancelButtonRef.current?.focus());

    return () => window.cancelAnimationFrame(focusFrame);
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/30 px-4 backdrop-blur-sm" onMouseDown={onCancel}>
      <div
        ref={dialogRef}
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
            ref={cancelButtonRef}
            type="button"
            autoFocus
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
  persistenceMode: WorkspacePersistenceMode;
  persistenceStatus: PersistenceStatus;
  persistenceError: string | null;
  lastPersistedAt: string | null;
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
  persistenceMode,
  persistenceStatus,
  persistenceError,
  lastPersistedAt,
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
    <aside className="flex w-full shrink-0 flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:w-[292px] lg:border-b-0 lg:border-r">
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
            id="flowdesk-project-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search projects"
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

      <div className="border-t border-[var(--color-border)] p-3">
        <PersistenceStatusBadge
          mode={persistenceMode}
          status={persistenceStatus}
          error={persistenceError}
          lastPersistedAt={lastPersistedAt}
        />
        {projects.length > 0 && (
          <button
            type="button"
            onClick={onCreateProject}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-[var(--color-accent-strong)]"
          >
            <Plus size={15} />
            New Project
          </button>
        )}
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

function PersistenceStatusBadge({
  mode,
  status,
  error,
  lastPersistedAt,
}: {
  mode: WorkspacePersistenceMode;
  status: PersistenceStatus;
  error: string | null;
  lastPersistedAt: string | null;
}) {
  const label =
    status === "hydrating"
      ? "Opening workspace"
      : status === "saving"
        ? "Saving locally"
        : status === "error"
          ? "Storage issue"
          : mode === "sqlite"
            ? "SQLite saved"
            : "Browser saved";
  const detail =
    status === "saving"
      ? "Writing workspace records"
      : status === "error"
        ? (error ?? "FlowDesk could not save changes.")
        : lastPersistedAt
          ? `Updated ${formatDateTime(lastPersistedAt)}`
          : "Local records are current";
  const dotClass =
    status === "error"
      ? "bg-red-500"
      : status === "saving" || status === "hydrating"
        ? "bg-[var(--color-accent)] motion-safe:animate-pulse"
        : "bg-emerald-500";

  return (
    <div
      className={clsx(
        "rounded-md border px-3 py-2",
        status === "error"
          ? "border-red-200 bg-red-50"
          : "border-[var(--color-border)] bg-[var(--color-app-bg)]",
      )}
      aria-live={status === "error" || status === "saving" ? "polite" : "off"}
    >
      <div className="flex items-center gap-2">
        <span className={clsx("h-2 w-2 shrink-0 rounded-full", dotClass)} />
        <span className="truncate text-[12px] font-semibold text-[var(--color-ink)]">{label}</span>
      </div>
      <p className="mt-1 truncate text-[11px] text-[var(--color-muted)]">{detail}</p>
    </div>
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
        isSelected ? "bg-[var(--color-selection)] text-[var(--color-ink)]" : "text-slate-700 hover:bg-[var(--color-surface-subtle)]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelectProject(project.id)}
        aria-current={isSelected ? "page" : undefined}
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)] lg:opacity-0 lg:group-hover:opacity-100"
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
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)] lg:opacity-0 lg:group-hover:opacity-100"
        >
          <ArchiveRestore size={13} />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Archive ${project.title}`}
          title="Archive project"
          onClick={() => onArchiveProject(project.id)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 opacity-100 transition hover:bg-[var(--color-surface)] hover:text-amber-700 lg:opacity-0 lg:group-hover:opacity-100"
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
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
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
                aria-keyshortcuts="Meta+Enter Control+Enter"
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
                aria-keyshortcuts="Meta+Enter Control+Enter"
                title="Start Session"
                onClick={onStartSession}
                className="inline-flex h-9 w-10 shrink-0 items-center justify-center gap-0 rounded-md border border-[var(--color-accent)] bg-[var(--color-selection)] px-0 text-[13px] font-semibold whitespace-nowrap text-[var(--color-accent)] transition hover:bg-[var(--color-surface-subtle)] sm:w-auto sm:gap-2 sm:px-3"
              >
                <Play size={14} />
                <span className="hidden sm:inline">Start Session</span>
              </button>
            )
          )}
          {canEditProject && <ActionButton icon={NotebookText} label="New Note" shortcut="Command/Ctrl+N" onClick={onCreateNote} />}
          {canEditProject && <ActionButton icon={ListChecks} label="New Task" onClick={onCreateTask} />}
          <ActionButton icon={Download} label="Export" shortcut="Command/Ctrl+E" onClick={onPrepareMarkdownExport} />
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
    <nav
      aria-label="Workspace views"
      className="flex h-12 shrink-0 items-center gap-1 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 sm:px-5"
    >
      {viewItems.map((item, index) => {
        const Icon = item.icon;
        const shortcut = `Command/Ctrl+${index + 1}`;

        return (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-current={activeView === item.id ? "page" : undefined}
            aria-keyshortcuts={formatAriaShortcut(shortcut)}
            title={`${item.label} (${shortcut})`}
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
  files,
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
  files: WorkspaceFile[];
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
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <MetricPanel label="Notes" value={notes.length.toString()} detail="Markdown records" icon={NotebookText} />
          <MetricPanel label="Tasks" value={`${completedTaskCount}/${tasks.length}`} detail="Completed" icon={CheckSquare} />
          <MetricPanel label="Sessions" value={sessions.length.toString()} detail="Tracked blocks" icon={Timer} />
          <MetricPanel label="Files" value={files.length.toString()} detail="Local assets" icon={FileText} />
          <MetricPanel label="Timeline" value={timelineEvents.length.toString()} detail="Project events" icon={Clock3} />
        </div>

        <div className="grid min-h-0 grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="border-b border-[var(--color-border)] bg-[var(--color-app-bg)] lg:border-b-0 lg:border-r">
            <PanelHeader title="Project Notes" detail={`${project.title} / ${notes.length} notes`} />
            <div className="space-y-1 p-3">
              {notes.length === 0 ? (
                <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4 text-center">
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
                        : "border-transparent hover:border-slate-200 hover:bg-[var(--color-surface)]",
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
    <div className="grid h-auto min-h-0 grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] xl:h-full xl:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.8fr)]">
      <aside className="min-h-0 border-b border-[var(--color-border)] bg-[var(--color-app-bg)] xl:border-b-0 xl:border-r">
        <PanelHeader title="Notes" detail="Folders and records" />
        <div className="space-y-1 p-3">
          {notes.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4 text-center">
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
                  note.id === selectedNoteId ? "bg-[var(--color-selection)]" : "hover:bg-[var(--color-surface)]",
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
        <section key={status} className="min-h-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
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
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
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
      <section className="h-auto min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] xl:h-full">
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
  exportSaveState,
  onPrepareMarkdownExport,
  onPrepareJsonExport,
  onSaveProjectRecord,
  onRevealSavedExport,
}: {
  exportPreview: string;
  exportSaveState: ExportSaveState | null;
  onPrepareMarkdownExport: () => void;
  onPrepareJsonExport: () => void;
  onSaveProjectRecord: (format: ExportFormat) => void;
  onRevealSavedExport: () => void;
}) {
  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:h-full">
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
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
            Preview Markdown
          </button>
          <button
            type="button"
            onClick={onPrepareJsonExport}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700"
          >
            <Database size={15} />
            Preview Project JSON
          </button>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <p className="text-[12px] font-semibold uppercase text-[var(--color-muted)]">Save file</p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => onSaveProjectRecord("markdown")}
              disabled={exportSaveState?.status === "saving"}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Download size={15} />
              Save Markdown...
            </button>
            <button
              type="button"
              onClick={() => onSaveProjectRecord("json")}
              disabled={exportSaveState?.status === "saving"}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Database size={15} />
              Save JSON...
            </button>
          </div>
          <ExportStatusMessage exportSaveState={exportSaveState} onRevealSavedExport={onRevealSavedExport} />
        </div>
      </section>
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <PanelHeader title="Export Preview" detail="Portable project record" />
        <pre className="h-full overflow-auto whitespace-pre-wrap p-5 text-[13px] leading-6 text-slate-800">
          {exportPreview || "Choose an export format to prepare a portable project record."}
        </pre>
      </section>
    </div>
  );
}

function ExportStatusMessage({
  exportSaveState,
  onRevealSavedExport,
}: {
  exportSaveState: ExportSaveState | null;
  onRevealSavedExport: () => void;
}) {
  if (!exportSaveState) {
    return (
      <p className="mt-3 rounded-md bg-[var(--color-app-bg)] px-3 py-2 text-[12px] leading-5 text-[var(--color-muted)]">
        Save uses the native file picker in the desktop app.
      </p>
    );
  }

  if (exportSaveState.status === "saving") {
    return (
      <p
        className="mt-3 rounded-md bg-[var(--color-selection)] px-3 py-2 text-[12px] font-medium leading-5 text-[var(--color-accent)]"
        role="status"
        aria-live="polite"
      >
        Saving {formatExportFormat(exportSaveState.format)} project record...
      </p>
    );
  }

  if (exportSaveState.status === "saved") {
    return (
      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2" role="status" aria-live="polite">
        <p className="truncate text-[12px] font-semibold text-emerald-800">
          Saved {formatExportFormat(exportSaveState.format)} record.
        </p>
        <button
          type="button"
          onClick={onRevealSavedExport}
          className="mt-2 h-8 rounded-md border border-emerald-200 bg-[var(--color-surface)] px-3 text-[12px] font-semibold whitespace-nowrap text-emerald-800 transition hover:bg-emerald-100"
        >
          Reveal in Folder
        </button>
      </div>
    );
  }

  if (exportSaveState.status === "downloaded") {
    return (
      <p
        className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold leading-5 text-emerald-800"
        role="status"
        aria-live="polite"
      >
        Downloaded {exportSaveState.fileName}.
      </p>
    );
  }

  if (exportSaveState.status === "cancelled") {
    return (
      <p
        className="mt-3 rounded-md bg-[var(--color-app-bg)] px-3 py-2 text-[12px] leading-5 text-[var(--color-muted)]"
        role="status"
        aria-live="polite"
      >
        {formatExportFormat(exportSaveState.format)} export was cancelled.
      </p>
    );
  }

  return (
    <p
      className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold leading-5 text-red-700"
      role="alert"
    >
      {exportSaveState.message}
    </p>
  );
}

function PersistenceAlert({ error }: { error: string | null }) {
  return (
    <div
      className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800"
      role="status"
      aria-live="polite"
    >
      <Database size={16} className="mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[13px] font-semibold">FlowDesk could not save the latest changes.</p>
        <p className="mt-1 text-[12px] leading-5">{error ?? "Keep the app open and try the action again."}</p>
      </div>
    </div>
  );
}

function MetricPanel({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
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
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
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
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
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
    <article className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
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
              aria-pressed={task.status === status}
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
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
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
