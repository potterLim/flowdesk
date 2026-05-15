import { lazy, Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Archive, Check, CheckSquare, Circle, Clock3, Database, Download, FileText, NotebookText, Plus, Play, Square, Timer, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { Note, Project, Task, TaskStatus, TimelineEvent, WorkSession, WorkspaceFile } from "../../../domain/workspace";
import { formatDateTime, formatDuration, formatShortDate, getElapsedMinutes } from "../../../lib/date";
import type { ExportFormat } from "../../../lib/exportProjectRecord";
import { EmptyState, PanelHeader } from "../components/WorkspacePrimitives";
import { priorityClasses, taskStatusLabels } from "../workspaceConstants";
import { formatExportFormat } from "../workspaceUtils";
import type { ExportSaveState } from "../workspaceTypes";

const MarkdownEditor = lazy(() =>
  import("../../../components/MarkdownEditor").then((module) => ({
    default: module.MarkdownEditor,
  })),
);

export function OverviewView({
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
  notes: Note[];
  tasks: Task[];
  sessions: WorkSession[];
  files: WorkspaceFile[];
  timelineEvents: TimelineEvent[];
  selectedNote: Note | undefined;
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
            <div className="max-h-[440px] space-y-1 overflow-y-auto p-3">
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

export function NotesView({
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
  notes: Note[];
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

export function TasksView({
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

export function SessionsView({
  sessions,
  canEditProject,
  onStartSession,
  onUpdateActiveSessionNotes,
  onEndSession,
}: {
  sessions: WorkSession[];
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

export function TimelineView({ timelineEvents }: { timelineEvents: TimelineEvent[] }) {
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

export function ExportsView({
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
        Desktop builds use the system save dialog.
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

export function PersistenceAlert({
  error,
  onRequestRepair,
}: {
  error: string | null;
  onRequestRepair: () => void;
}) {
  return (
    <div
      className="mt-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 sm:flex-row sm:items-start"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Database size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">FlowDesk could not write local changes.</p>
          <p className="mt-1 text-[12px] leading-5">{error ?? "Keep the app open and try the action again."}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRequestRepair}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-red-200 bg-[var(--color-surface)] px-3 text-[12px] font-semibold whitespace-nowrap text-red-700 transition hover:bg-red-100"
      >
        <Database size={13} />
        Repair Local Storage
      </button>
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
  activeSession: WorkSession | undefined;
  sessions: WorkSession[];
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
      <p className="mt-3 text-[12px] text-[var(--color-muted)]">
        {sessions.length === 1 ? "1 session recorded" : `${sessions.length} sessions recorded`}
      </p>
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
