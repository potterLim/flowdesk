import { X } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import type { TaskPriority } from "../../../../domain/workspace";
import { toIsoDateString } from "../../../../domain/workspaceValues";
import type { CreateTaskInput } from "../../../../stores/workspaceStore";
import { useDialogControls } from "../../hooks/useDialogControls";
import { taskPriorityOptions } from "../../workspaceConstants";
import { parseTags } from "../../workspaceUtils";
import { ProjectTextField } from "../ProjectFormFields";

export function CreateTaskDialog({
  isOpen,
  onClose,
  onCreateTask,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (input: CreateTaskInput) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return <CreateTaskDialogContent onClose={onClose} onCreateTask={onCreateTask} />;
}

function CreateTaskDialogContent({
  onClose,
  onCreateTask,
}: {
  onClose: () => void;
  onCreateTask: (input: CreateTaskInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tags, setTags] = useState("");
  const dialogRef = useDialogControls<HTMLFormElement>(true, onClose);

  const canCreateTask = title.trim().length > 0;
  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateTask) {
      return;
    }

    onCreateTask({
      title,
      priority,
      dueDate: dueDate ? toIsoDateString(dueDate) : null,
      tags: parseTags(tags),
    });
    setTitle("");
    setPriority("medium");
    setDueDate("");
    setTags("");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-task-title"
        aria-describedby="create-task-description"
        className="w-full max-w-[520px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="create-task-title" className="text-[16px] font-semibold text-[var(--color-ink)]">
              New Task
            </h2>
            <p id="create-task-description" className="mt-0.5 text-[12px] text-[var(--color-muted)]">
              Add one concrete next step.
            </p>
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
          <ProjectTextField
            label="Task title"
            value={title}
            onChange={setTitle}
            placeholder="Describe the next step"
            autoFocus
          />
          <fieldset>
            <legend className="text-[12px] font-semibold text-slate-700">Priority</legend>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {taskPriorityOptions.map((priorityOption) => (
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
