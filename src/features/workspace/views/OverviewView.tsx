import { CheckSquare, Clock3, FileText, NotebookText, Timer } from "lucide-react";
import { clsx } from "clsx";
import type { Note, Project, Task, TaskStatus, TimelineEvent, WorkSession, WorkspaceFile } from "../../../domain/workspace";
import { EmptyState, PanelHeader } from "../components/WorkspacePrimitives";
import { MarkdownReadingSurface, MetricPanel, SessionCard, TaskStack, TimelineStack } from "./WorkspaceViewPanels";

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
