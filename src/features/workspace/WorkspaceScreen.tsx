import {
  Database,
  Download,
  ListChecks,
  NotebookText,
  Pin,
  Play,
  Plus,
  Search,
  Settings2,
  Square,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkspaceSnapshot } from "../../domain/workspace";
import { formatDuration, getElapsedMinutes } from "../../lib/date";
import {
  revealSavedProjectRecord,
  saveProjectRecord,
  type ExportFormat,
} from "../../lib/export/exportProjectRecord";
import { saveWorkspaceBackup, selectWorkspaceBackup } from "../../lib/backup/workspaceBackup";
import { saveReleaseDiagnostics } from "../../lib/diagnostics/releaseDiagnostics";
import { openWorkspaceFile, revealWorkspaceFile, selectWorkspaceFiles } from "../../lib/platform/workspaceFiles";
import {
  useWorkspaceStore,
  type CreateProjectInput,
  type CreateTaskInput,
  type UpdateProjectInput,
} from "../../stores/workspaceStore";
import { CommandPalette, type CommandPaletteItem } from "./components/CommandPalette";
import { WorkspaceHeader, ViewTabs } from "./components/WorkspaceHeader";
import { ProjectSidebar } from "./components/ProjectSidebar";
import { ConfirmDialog } from "./components/dialogs/ConfirmDialog";
import { CreateProjectDialog } from "./components/dialogs/CreateProjectDialog";
import { CreateTaskDialog } from "./components/dialogs/CreateTaskDialog";
import { ProjectSettingsDialog } from "./components/dialogs/ProjectSettingsDialog";
import { WorkspaceSettingsDialog } from "./components/dialogs/WorkspaceSettingsDialog";
import { FirstRunView, WorkspaceBootView } from "./components/WorkspaceOnboarding";
import { useNativeMenuEvents, type NativeWorkspaceMenuCommand } from "./hooks/useNativeMenuEvents";
import { useWorkspaceTheme } from "./hooks/useWorkspaceTheme";
import { ExportsView } from "./views/ExportsView";
import { FilesView } from "./views/FilesView";
import { NotesView } from "./views/NotesView";
import { OverviewView } from "./views/OverviewView";
import { PersistenceAlert } from "./views/PersistenceAlert";
import { SessionsView } from "./views/SessionsView";
import { TasksView } from "./views/TasksView";
import { TimelineView } from "./views/TimelineView";
import { viewItems } from "./workspaceConstants";
import {
  getErrorMessage,
  getStoredThemeMode,
  isTextEntryTarget,
} from "./workspaceUtils";
import type { DiagnosticsExportState, ExportSaveState, ThemeMode, WorkspaceBackupState } from "./workspaceTypes";

export function WorkspaceScreen() {
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [isWorkspaceSettingsOpen, setIsWorkspaceSettingsOpen] = useState(false);
  const [pendingProjectDeleteId, setPendingProjectDeleteId] = useState<string | null>(null);
  const [pendingNoteDeleteId, setPendingNoteDeleteId] = useState<string | null>(null);
  const [pendingTaskDeleteId, setPendingTaskDeleteId] = useState<string | null>(null);
  const [pendingWorkspaceRestore, setPendingWorkspaceRestore] = useState<WorkspaceSnapshot | null>(null);
  const [isStorageRepairConfirmOpen, setIsStorageRepairConfirmOpen] = useState(false);
  const [exportSaveState, setExportSaveState] = useState<ExportSaveState | null>(null);
  const [workspaceBackupState, setWorkspaceBackupState] = useState<WorkspaceBackupState | null>(null);
  const [diagnosticsExportState, setDiagnosticsExportState] = useState<DiagnosticsExportState | null>(null);
  const [fileActionError, setFileActionError] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [themeMode, setThemeMode] = useState<ThemeMode>(getStoredThemeMode);
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
  const replaceWorkspace = useWorkspaceStore((state) => state.replaceWorkspace);
  const repairWorkspaceStorage = useWorkspaceStore((state) => state.repairWorkspaceStorage);

  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const projectNotes = selectedProject ? notes.filter((note) => note.projectId === selectedProject.id) : [];
  const selectedNote = selectedProject ? notes.find((note) => note.id === selectedNoteId) ?? projectNotes[0] : undefined;
  const projectTasks = selectedProject ? tasks.filter((task) => task.projectId === selectedProject.id) : [];
  const projectSessions = selectedProject ? sessions.filter((session) => session.projectId === selectedProject.id) : [];
  const projectFiles = selectedProject ? files.filter((file) => file.projectId === selectedProject.id) : [];
  const projectTimelineEvents = selectedProject ? timelineEvents.filter((event) => event.projectId === selectedProject.id) : [];
  const activeSession = projectSessions.find((session) => session.endedAt === null);
  const canEditProject = selectedProject?.status === "active";
  const workspaceSnapshot = useMemo<WorkspaceSnapshot>(
    () => ({
      projects,
      notes,
      tasks,
      sessions,
      references,
      files,
      timelineEvents,
    }),
    [files, notes, projects, references, sessions, tasks, timelineEvents],
  );
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

  const handleSaveWorkspaceBackup = async () => {
    setWorkspaceBackupState({ status: "saving" });

    try {
      const result = await saveWorkspaceBackup(workspaceSnapshot);

      if (result.status === "saved") {
        setWorkspaceBackupState({ status: "saved", path: result.path });
        return;
      }

      if (result.status === "downloaded") {
        setWorkspaceBackupState({ status: "downloaded", fileName: result.fileName });
        return;
      }

      setWorkspaceBackupState({ status: "cancelled" });
    } catch (error: unknown) {
      setWorkspaceBackupState({ status: "error", message: getErrorMessage(error) });
    }
  };

  const handleSelectWorkspaceBackup = async () => {
    setWorkspaceBackupState({ status: "selecting" });

    try {
      const snapshot = await selectWorkspaceBackup();

      if (!snapshot) {
        setWorkspaceBackupState({ status: "cancelled" });
        return;
      }

      setPendingWorkspaceRestore(snapshot);
      setWorkspaceBackupState({ status: "ready", projectCount: snapshot.projects.length });
    } catch (error: unknown) {
      setWorkspaceBackupState({ status: "error", message: getErrorMessage(error) });
    }
  };

  const handleExportDiagnostics = async () => {
    setDiagnosticsExportState({ status: "saving" });

    try {
      const result = await saveReleaseDiagnostics();

      if (result.status === "saved") {
        setDiagnosticsExportState({ status: "saved", path: result.path });
        return;
      }

      if (result.status === "downloaded") {
        setDiagnosticsExportState({ status: "downloaded", fileName: result.fileName });
        return;
      }

      setDiagnosticsExportState({ status: "cancelled" });
    } catch (error: unknown) {
      setDiagnosticsExportState({ status: "error", message: getErrorMessage(error) });
    }
  };

  const handleConfirmWorkspaceRestore = () => {
    if (!pendingWorkspaceRestore) {
      return;
    }

    replaceWorkspace(pendingWorkspaceRestore);
    setWorkspaceBackupState({ status: "restored", projectCount: pendingWorkspaceRestore.projects.length });
    setPendingWorkspaceRestore(null);
  };

  const handleCancelWorkspaceRestore = () => {
    setPendingWorkspaceRestore(null);
    setWorkspaceBackupState({ status: "cancelled" });
  };

  const handleConfirmStorageRepair = () => {
    setIsStorageRepairConfirmOpen(false);
    repairWorkspaceStorage();
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

      if (command === "save_workspace_backup") {
        void handleSaveWorkspaceBackup();
        return;
      }

      if (command === "restore_workspace_backup") {
        void handleSelectWorkspaceBackup();
        return;
      }

      if (command === "export_diagnostics") {
        void handleExportDiagnostics();
        return;
      }

      if (command === "open_workspace_settings") {
        setIsWorkspaceSettingsOpen(true);
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
    [
      canEditProject,
      createNote,
      handleImportFiles,
      handleExportDiagnostics,
      handlePrepareMarkdownExport,
      handleSaveWorkspaceBackup,
      handleSelectWorkspaceBackup,
      openCreateTaskDialog,
      selectedProject,
    ],
  );

  useNativeMenuEvents(handleNativeMenuCommand);

  const commandPaletteItems = useMemo<CommandPaletteItem[]>(
    () => [
      {
        id: "workspace-settings",
        label: "Workspace Settings",
        detail: "Appearance, backups, and local storage",
        shortcut: "Command/Ctrl+,",
        icon: Settings2,
        onSelect: () => setIsWorkspaceSettingsOpen(true),
      },
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
        id: "save-workspace-backup",
        label: "Back Up Workspace",
        detail: "Save a complete workspace backup",
        shortcut: "Command/Ctrl+Shift+B",
        icon: Database,
        onSelect: handleSaveWorkspaceBackup,
      },
      {
        id: "restore-workspace-backup",
        label: "Restore Backup",
        detail: "Review a backup before replacing local data",
        icon: Upload,
        onSelect: handleSelectWorkspaceBackup,
      },
      {
        id: "export-diagnostics",
        label: "Export Diagnostics",
        detail: "Save local paths, DB health, and app build details",
        icon: Database,
        onSelect: handleExportDiagnostics,
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
        id: "toggle-project-pin",
        label: selectedProject?.isPinned ? "Unpin Project" : "Pin Project",
        detail: selectedProject ? selectedProject.title : "Select a project first",
        icon: Pin,
        isDisabled: !selectedProject,
        onSelect: () => {
          if (selectedProject) {
            toggleProjectPinned(selectedProject.id);
          }
        },
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
      handleExportDiagnostics,
      handlePrepareMarkdownExport,
      handleSaveWorkspaceBackup,
      handleSelectWorkspaceBackup,
      openCreateProjectDialog,
      openCreateTaskDialog,
      selectedProject,
      setActiveView,
      startSession,
      toggleProjectPinned,
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

      if (key === ",") {
        event.preventDefault();
        setIsWorkspaceSettingsOpen(true);
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

      if (key === "b" && event.shiftKey) {
        event.preventDefault();
        void handleSaveWorkspaceBackup();
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
    handleSaveWorkspaceBackup,
    openCreateTaskDialog,
    selectedProject,
    setActiveView,
    startSession,
  ]);

  if (persistenceStatus === "hydrating") {
    return <WorkspaceBootView />;
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
        onOpenWorkspaceSettings={() => setIsWorkspaceSettingsOpen(true)}
        persistenceMode={persistenceMode}
        persistenceStatus={persistenceStatus}
        persistenceError={persistenceError}
        lastPersistedAt={lastPersistedAt}
      />
      <main id="flowdesk-main" className="flex min-w-0 flex-1 flex-col">
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
              onTogglePinned={() => toggleProjectPinned(selectedProject.id)}
              onOpenSettings={() => setIsProjectSettingsOpen(true)}
            />
            <ViewTabs activeView={activeView} onSelectView={setActiveView} />
            <section className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-visible px-3 pb-5 sm:px-5 lg:overflow-y-hidden">
              {persistenceStatus === "error" && (
                <PersistenceAlert error={persistenceError} onRequestRepair={() => setIsStorageRepairConfirmOpen(true)} />
              )}
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
          <>
            {persistenceStatus === "error" && (
              <div className="px-5 sm:px-8 lg:px-10">
                <PersistenceAlert error={persistenceError} onRequestRepair={() => setIsStorageRepairConfirmOpen(true)} />
              </div>
            )}
            <FirstRunView
              workspaceBackupState={workspaceBackupState}
              onCreateProject={handleCreateProject}
              onSelectWorkspaceBackup={handleSelectWorkspaceBackup}
            />
          </>
        )}
      </main>
      <CreateProjectDialog isOpen={isCreateProjectDialogOpen} onClose={closeCreateProjectDialog} onCreateProject={handleCreateProject} />
      <CreateTaskDialog isOpen={isCreateTaskDialogOpen} onClose={closeCreateTaskDialog} onCreateTask={handleCreateTask} />
      <WorkspaceSettingsDialog
        isOpen={isWorkspaceSettingsOpen}
        themeMode={themeMode}
        persistenceMode={persistenceMode}
        persistenceStatus={persistenceStatus}
        persistenceError={persistenceError}
        lastPersistedAt={lastPersistedAt}
        workspaceBackupState={workspaceBackupState}
        diagnosticsExportState={diagnosticsExportState}
        onChangeTheme={setThemeMode}
        onSaveWorkspaceBackup={handleSaveWorkspaceBackup}
        onSelectWorkspaceBackup={handleSelectWorkspaceBackup}
        onExportDiagnostics={handleExportDiagnostics}
        onRequestRepair={() => {
          setIsWorkspaceSettingsOpen(false);
          setIsStorageRepairConfirmOpen(true);
        }}
        onClose={() => setIsWorkspaceSettingsOpen(false)}
      />
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
      <ConfirmDialog
        isOpen={pendingWorkspaceRestore !== null}
        title="Restore Workspace Backup"
        detail={`FlowDesk will replace the current local workspace with ${pendingWorkspaceRestore?.projects.length ?? 0} projects from the selected backup. Save a fresh backup first if you need to keep the current workspace.`}
        confirmLabel="Restore Backup"
        variant="warning"
        onCancel={handleCancelWorkspaceRestore}
        onConfirm={handleConfirmWorkspaceRestore}
      />
      <ConfirmDialog
        isOpen={isStorageRepairConfirmOpen}
        title="Repair Local Storage"
        detail="FlowDesk will move the current storage files into a recovery folder and open a clean local workspace. Managed files and saved backups are left in place."
        confirmLabel="Repair Storage"
        variant="warning"
        onCancel={() => setIsStorageRepairConfirmOpen(false)}
        onConfirm={handleConfirmStorageRepair}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        commands={commandPaletteItems}
        onClose={() => setIsCommandPaletteOpen(false)}
      />
    </div>
  );
}
