import { Archive, Check, Circle, Plus, Timer, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { Task, TaskId, TaskStatus } from "../../../domain/workspace";
import { formatShortDate } from "../../../lib/date";
import { PanelHeader } from "../components/WorkspacePrimitives";
import { priorityClasses, taskStatusLabels, taskStatusOptions } from "../workspaceConstants";

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
  onUpdateTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
  onDeleteTask: (taskId: TaskId) => void;
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
  onUpdateTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
  onDeleteTask: (taskId: TaskId) => void;
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
          {taskStatusOptions.map((status) => (
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
