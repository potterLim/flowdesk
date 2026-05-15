import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Archive, Check, Circle, Play, Plus, Square, Timer, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import type { Task, TaskStatus, TimelineEvent, WorkSession } from "../../../domain/workspace";
import { formatDateTime, formatDuration, formatShortDate, getElapsedMinutes } from "../../../lib/date";
import { PanelHeader } from "../components/WorkspacePrimitives";
import { priorityClasses, taskStatusLabels } from "../workspaceConstants";

export function MetricPanel({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: LucideIcon }) {
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

export function SessionCard({
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

export function TaskStack({
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

export function TaskCard({
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

export function TimelineStack({ timelineEvents }: { timelineEvents: TimelineEvent[] }) {
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

export function TimelineList({ timelineEvents }: { timelineEvents: TimelineEvent[] }) {
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

export function MarkdownReadingSurface({ content }: { content: string }) {
  return (
    <div className="flowdesk-markdown max-w-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
