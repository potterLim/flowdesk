import type {
  Note,
  NoteId,
  Project,
  Task,
  TaskId,
  TaskStatus,
  TimelineEvent,
  WorkSession,
  WorkspaceFile,
  WorkspaceFileId,
  WorkspaceFilePath,
  WorkspaceView,
} from "../../../domain/workspace";
import { formatDuration, getElapsedMinutes } from "../../../lib/date";
import type { ExportFormat } from "../../../lib/export/exportProjectRecord";
import type { ExportSaveState } from "../workspaceTypes";
import { ViewTabs, WorkspaceHeader } from "./WorkspaceHeader";
import { ExportsView } from "../views/ExportsView";
import { FilesView } from "../views/FilesView";
import { NotesView } from "../views/NotesView";
import { OverviewView } from "../views/OverviewView";
import { PersistenceAlert } from "../views/PersistenceAlert";
import { SessionsView } from "../views/SessionsView";
import { TasksView } from "../views/TasksView";
import { TimelineView } from "../views/TimelineView";

interface WorkspaceProjectContentProps {
  activeSession: WorkSession | undefined;
  activeView: WorkspaceView;
  canEditProject: boolean;
  exportPreview: string;
  exportSaveState: ExportSaveState | null;
  fileActionError: string | null;
  persistenceError: string | null;
  persistenceStatus: "hydrating" | "saving" | "saved" | "error";
  project: Project;
  projectFiles: WorkspaceFile[];
  projectNotes: Note[];
  projectSessions: WorkSession[];
  projectTasks: Task[];
  projectTimelineEvents: TimelineEvent[];
  selectedNote: Note | undefined;
  onArchiveProject: () => void;
  onCreateNote: () => void;
  onCreateTask: () => void;
  onDeleteFile: (fileId: WorkspaceFileId) => void;
  onDeleteNote: (noteId: NoteId) => void;
  onDeleteTask: (taskId: TaskId) => void;
  onEndSession: () => void;
  onFlushWorkspacePersistence: () => void;
  onImportFiles: () => void;
  onOpenFile: (path: WorkspaceFilePath) => void;
  onOpenProjectSettings: () => void;
  onPrepareJsonExport: () => void;
  onPrepareMarkdownExport: () => void;
  onRequestStorageRepair: () => void;
  onRestoreProject: () => void;
  onRevealFile: (path: WorkspaceFilePath) => void;
  onRevealSavedExport: () => void;
  onSaveProjectRecord: (format: ExportFormat) => void;
  onSelectNote: (noteId: NoteId) => void;
  onSelectView: (view: WorkspaceView) => void;
  onStartSession: () => void;
  onTogglePinned: () => void;
  onUpdateActiveSessionNotes: (notes: string) => void;
  onUpdateNoteContent: (content: string) => void;
  onUpdateNoteTitle: (title: string) => void;
  onUpdateTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
}

export function WorkspaceProjectContent({
  activeSession,
  activeView,
  canEditProject,
  exportPreview,
  exportSaveState,
  fileActionError,
  persistenceError,
  persistenceStatus,
  project,
  projectFiles,
  projectNotes,
  projectSessions,
  projectTasks,
  projectTimelineEvents,
  selectedNote,
  onArchiveProject,
  onCreateNote,
  onCreateTask,
  onDeleteFile,
  onDeleteNote,
  onDeleteTask,
  onEndSession,
  onFlushWorkspacePersistence,
  onImportFiles,
  onOpenFile,
  onOpenProjectSettings,
  onPrepareJsonExport,
  onPrepareMarkdownExport,
  onRequestStorageRepair,
  onRestoreProject,
  onRevealFile,
  onRevealSavedExport,
  onSaveProjectRecord,
  onSelectNote,
  onSelectView,
  onStartSession,
  onTogglePinned,
  onUpdateActiveSessionNotes,
  onUpdateNoteContent,
  onUpdateNoteTitle,
  onUpdateTaskStatus,
}: WorkspaceProjectContentProps) {
  return (
    <>
      <WorkspaceHeader
        project={project}
        activeSessionLabel={activeSession ? formatDuration(getElapsedMinutes(activeSession.startedAt, null)) : null}
        canEditProject={canEditProject}
        onCreateNote={onCreateNote}
        onCreateTask={onCreateTask}
        onStartSession={onStartSession}
        onEndSession={onEndSession}
        onPrepareMarkdownExport={onPrepareMarkdownExport}
        onArchiveProject={onArchiveProject}
        onRestoreProject={onRestoreProject}
        onTogglePinned={onTogglePinned}
        onOpenSettings={onOpenProjectSettings}
      />
      <ViewTabs activeView={activeView} onSelectView={onSelectView} />
      <section className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-visible px-3 pb-5 sm:px-5 lg:overflow-y-hidden">
        {persistenceStatus === "error" && (
          <PersistenceAlert error={persistenceError} onRequestRepair={onRequestStorageRepair} />
        )}
        {activeView === "overview" && (
          <OverviewView
            project={project}
            notes={projectNotes}
            tasks={projectTasks}
            sessions={projectSessions}
            files={projectFiles}
            timelineEvents={projectTimelineEvents}
            selectedNote={selectedNote}
            canEditProject={canEditProject}
            onSelectNote={onSelectNote}
            onCreateNote={onCreateNote}
            onCreateTask={onCreateTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
            onStartSession={onStartSession}
            onUpdateActiveSessionNotes={onUpdateActiveSessionNotes}
            onEndSession={onEndSession}
            onFlushWorkspacePersistence={onFlushWorkspacePersistence}
          />
        )}
        {activeView === "notes" && (
          <NotesView
            notes={projectNotes}
            selectedNoteId={selectedNote?.id ?? null}
            selectedNoteContent={selectedNote?.content ?? ""}
            onSelectNote={onSelectNote}
            onUpdateTitle={onUpdateNoteTitle}
            onUpdateContent={onUpdateNoteContent}
            onCommitPendingChanges={onFlushWorkspacePersistence}
            onCreateNote={onCreateNote}
            onDeleteNote={onDeleteNote}
            canEditProject={canEditProject}
          />
        )}
        {activeView === "tasks" && (
          <TasksView
            tasks={projectTasks}
            canEditProject={canEditProject}
            onCreateTask={onCreateTask}
            onUpdateTaskStatus={onUpdateTaskStatus}
            onDeleteTask={onDeleteTask}
          />
        )}
        {activeView === "sessions" && (
          <SessionsView
            sessions={projectSessions}
            canEditProject={canEditProject}
            onStartSession={onStartSession}
            onUpdateActiveSessionNotes={onUpdateActiveSessionNotes}
            onEndSession={onEndSession}
            onFlushWorkspacePersistence={onFlushWorkspacePersistence}
          />
        )}
        {activeView === "files" && (
          <FilesView
            files={projectFiles}
            canEditProject={canEditProject}
            fileActionError={fileActionError}
            onImportFiles={onImportFiles}
            onOpenFile={onOpenFile}
            onRevealFile={onRevealFile}
            onDeleteFile={onDeleteFile}
          />
        )}
        {activeView === "timeline" && <TimelineView timelineEvents={projectTimelineEvents} />}
        {activeView === "exports" && (
          <ExportsView
            exportPreview={exportPreview}
            exportSaveState={exportSaveState}
            onPrepareMarkdownExport={onPrepareMarkdownExport}
            onPrepareJsonExport={onPrepareJsonExport}
            onSaveProjectRecord={onSaveProjectRecord}
            onRevealSavedExport={onRevealSavedExport}
          />
        )}
      </section>
    </>
  );
}
