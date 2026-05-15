import { Database, Download, FileText, Monitor, Moon, Sun, Trash2, X } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { LucideIcon } from "lucide-react";
import type { Project, TaskPriority } from "../../../domain/workspace";
import type { WorkspacePersistenceMode } from "../../../lib/persistence/workspaceRepository";
import type { CreateProjectInput, CreateTaskInput, PersistenceStatus, UpdateProjectInput } from "../../../stores/workspaceStore";
import { useDialogControls } from "../hooks/useDialogControls";
import { parseTags } from "../workspaceUtils";
import type { DiagnosticsExportState, ThemeMode, WorkspaceBackupState } from "../workspaceTypes";
import { ProjectAccentPicker, ProjectTextArea, ProjectTextField } from "./ProjectFormFields";
import { DiagnosticsStatusMessage, PersistenceStatusBadge, WorkspaceDataControls } from "./WorkspaceStatus";

export function CreateProjectDialog({
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
        aria-describedby="create-project-description"
        className="w-full max-w-[560px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="create-project-title" className="text-[16px] font-semibold text-[var(--color-ink)]">
              New Project
            </h2>
            <p id="create-project-description" className="mt-0.5 text-[12px] text-[var(--color-muted)]">
              Create the anchor for a workspace record.
            </p>
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

export function CreateTaskDialog({
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

export function ProjectSettingsDialog({
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
        aria-describedby="project-settings-description"
        className="w-full max-w-[600px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="project-settings-title" className="text-[16px] font-semibold text-[var(--color-ink)]">
              Project Settings
            </h2>
            <p id="project-settings-description" className="mt-0.5 text-[12px] text-[var(--color-muted)]">
              {project.status === "archived" ? "Read-only archived project" : "Project identity and organization"}
            </p>
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

export function WorkspaceSettingsDialog({
  isOpen,
  themeMode,
  persistenceMode,
  persistenceStatus,
  persistenceError,
  lastPersistedAt,
  workspaceBackupState,
  diagnosticsExportState,
  onChangeTheme,
  onSaveWorkspaceBackup,
  onSelectWorkspaceBackup,
  onExportDiagnostics,
  onRequestRepair,
  onClose,
}: {
  isOpen: boolean;
  themeMode: ThemeMode;
  persistenceMode: WorkspacePersistenceMode;
  persistenceStatus: PersistenceStatus;
  persistenceError: string | null;
  lastPersistedAt: string | null;
  workspaceBackupState: WorkspaceBackupState | null;
  diagnosticsExportState: DiagnosticsExportState | null;
  onChangeTheme: (themeMode: ThemeMode) => void;
  onSaveWorkspaceBackup: () => void;
  onSelectWorkspaceBackup: () => void;
  onExportDiagnostics: () => void;
  onRequestRepair: () => void;
  onClose: () => void;
}) {
  const dialogRef = useDialogControls<HTMLDivElement>(isOpen, onClose);
  const generatedDialogId = useId();
  const titleId = `${generatedDialogId}-title`;
  const descriptionId = `${generatedDialogId}-description`;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-[620px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-[16px] font-semibold text-[var(--color-ink)]">
              Workspace Settings
            </h2>
            <p id={descriptionId} className="mt-0.5 text-[12px] text-[var(--color-muted)]">
              Appearance, backups, and local storage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close workspace settings"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X size={16} />
          </button>
        </div>

        <div className="max-h-[min(680px,calc(100vh-140px))] overflow-y-auto px-5 py-5">
          <section>
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-selection)] text-[var(--color-accent)]">
                <Monitor size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Appearance</h3>
                <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
                  Match the system by default, or choose a fixed theme for this workspace.
                </p>
                <ThemePreferenceGroup value={themeMode} onChange={onChangeTheme} />
              </div>
            </div>
          </section>

          <section className="mt-6 border-t border-[var(--color-border)] pt-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-selection)] text-[var(--color-accent)]">
                <Database size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Local Data</h3>
                <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
                  FlowDesk keeps workspace records on this device. Save a JSON backup before moving machines or testing recovery.
                </p>
                <div className="mt-3">
                  <PersistenceStatusBadge
                    mode={persistenceMode}
                    status={persistenceStatus}
                    error={persistenceError}
                    lastPersistedAt={lastPersistedAt}
                  />
                </div>
                <WorkspaceDataControls
                  workspaceBackupState={workspaceBackupState}
                  onSaveWorkspaceBackup={onSaveWorkspaceBackup}
                  onSelectWorkspaceBackup={onSelectWorkspaceBackup}
                />
              </div>
            </div>
          </section>

          <section className="mt-6 border-t border-[var(--color-border)] pt-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-selection)] text-[var(--color-accent)]">
                <FileText size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Diagnostics</h3>
                <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
                  Export a support file with app version, platform, local storage paths, log folder, and database health.
                </p>
                <button
                  type="button"
                  onClick={onExportDiagnostics}
                  disabled={diagnosticsExportState?.status === "saving"}
                  className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  <Download size={14} />
                  Export Diagnostics
                </button>
                <DiagnosticsStatusMessage diagnosticsExportState={diagnosticsExportState} />
              </div>
            </div>
          </section>

          <section className="mt-6 border-t border-[var(--color-border)] pt-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                <Database size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[14px] font-semibold text-[var(--color-ink)]">Storage Recovery</h3>
                <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
                  If the local database cannot open, FlowDesk can move the current SQLite files to a recovery folder and start clean.
                </p>
                <button
                  type="button"
                  onClick={onRequestRepair}
                  className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 text-[13px] font-semibold whitespace-nowrap text-amber-800 transition hover:bg-amber-100"
                >
                  <Database size={14} />
                  Repair Storage
                </button>
              </div>
            </div>
          </section>
        </div>

        <div className="flex items-center justify-end border-t border-[var(--color-border)] bg-[var(--color-app-bg)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)]"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function ThemePreferenceGroup({
  value,
  onChange,
}: {
  value: ThemeMode;
  onChange: (themeMode: ThemeMode) => void;
}) {
  const options: Array<{ value: ThemeMode; label: string; icon: LucideIcon }> = [
    { value: "system", label: "System", icon: Monitor },
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
  ];

  return (
    <div className="mt-3 grid grid-cols-3 gap-2" role="group" aria-label="Appearance theme">
      {options.map((option) => {
        const Icon = option.icon;
        const isSelected = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={isSelected}
            className={clsx(
              "inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-[13px] font-semibold whitespace-nowrap transition",
              isSelected
                ? "border-[var(--color-accent)] bg-[var(--color-selection)] text-[var(--color-accent)]"
                : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-700 hover:bg-slate-50",
            )}
          >
            <Icon size={15} />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function ConfirmDialog({
  isOpen,
  title,
  detail,
  confirmLabel,
  variant = "danger",
  onCancel,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  detail: string;
  confirmLabel: string;
  variant?: "danger" | "warning";
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useDialogControls<HTMLDivElement>(isOpen, onCancel);
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const generatedDialogId = useId();
  const dialogTitleId = `${generatedDialogId}-title`;
  const dialogDetailId = `${generatedDialogId}-detail`;
  const Icon = variant === "danger" ? Trash2 : Database;
  const iconClass = variant === "danger" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700";
  const confirmClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-strong)]";

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
        role={variant === "danger" ? "alertdialog" : "dialog"}
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        aria-describedby={dialogDetailId}
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-[460px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.24)]"
      >
        <div className="px-5 pt-5">
          <div className={clsx("flex h-10 w-10 items-center justify-center rounded-lg", iconClass)}>
            <Icon size={18} />
          </div>
          <h2 id={dialogTitleId} className="mt-4 text-[17px] font-semibold text-[var(--color-ink)]">
            {title}
          </h2>
          <p id={dialogDetailId} className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">{detail}</p>
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
            className={clsx("h-9 rounded-md px-3 text-[13px] font-semibold whitespace-nowrap transition", confirmClass)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
