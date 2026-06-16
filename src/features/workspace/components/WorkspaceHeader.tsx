import {
  Archive,
  ArchiveRestore,
  Download,
  ListChecks,
  NotebookText,
  Pin,
  Play,
  Settings2,
  Square,
  Tags,
} from "lucide-react";
import { clsx } from "clsx";
import type { Project, WorkspaceView } from "../../../domain/workspace";
import { formatDateTime } from "../../../lib/date";
import { accentClasses, viewItems } from "../workspaceConstants";
import { formatAriaShortcut } from "../workspaceUtils";
import { ActionButton, IconButton } from "./WorkspacePrimitives";

export function WorkspaceHeader({
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
  onTogglePinned,
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
  onTogglePinned: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-5 py-4">
      <div className="flex flex-col items-start justify-between gap-4 2xl:flex-row">
        <div className="w-full min-w-0 2xl:w-auto">
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={clsx(
                "flex h-9 w-9 items-center justify-center rounded-md text-[12px] font-bold",
                accentClasses[project.accent],
              )}
            >
              {project.icon}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="max-w-full truncate text-[20px] font-semibold tracking-normal text-slate-950 sm:text-[22px]">
                {project.title}
              </h2>
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
        <div className="flex w-full items-center gap-2 overflow-x-auto pb-1 2xl:w-auto 2xl:shrink-0">
          {canEditProject &&
            (activeSessionLabel ? (
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
                <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[11px] leading-none text-red-700 sm:ml-0">
                  {activeSessionLabel}
                </span>
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
            ))}
          {canEditProject && (
            <ActionButton icon={NotebookText} label="New Note" shortcut="Command/Ctrl+N" onClick={onCreateNote} />
          )}
          {canEditProject && <ActionButton icon={ListChecks} label="New Task" onClick={onCreateTask} />}
          <ActionButton icon={Download} label="Export" shortcut="Command/Ctrl+E" onClick={onPrepareMarkdownExport} />
          {project.status === "active" ? (
            <ActionButton icon={Archive} label="Archive" onClick={onArchiveProject} />
          ) : (
            <ActionButton icon={ArchiveRestore} label="Restore" onClick={onRestoreProject} />
          )}
          {project.status === "active" && (
            <IconButton
              label={project.isPinned ? "Unpin project" : "Pin project"}
              icon={Pin}
              isActive={project.isPinned}
              size="md"
              onClick={onTogglePinned}
            />
          )}
          <IconButton label="Project settings" icon={Settings2} size="md" onClick={onOpenSettings} />
        </div>
      </div>
    </header>
  );
}

export function ViewTabs({
  activeView,
  onSelectView,
}: {
  activeView: WorkspaceView;
  onSelectView: (view: WorkspaceView) => void;
}) {
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
