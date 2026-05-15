import { NotebookText, Plus } from "lucide-react";
import { clsx } from "clsx";
import type { LucideIcon } from "lucide-react";
import { formatAriaShortcut } from "../workspaceUtils";

export function PanelHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
      <div className="min-w-0">
        <h3 className="truncate text-[14px] font-semibold text-slate-950">{title}</h3>
        <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]">{detail}</p>
      </div>
    </div>
  );
}

export function ActionButton({
  icon: Icon,
  label,
  shortcut,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-keyshortcuts={shortcut ? formatAriaShortcut(shortcut) : undefined}
      title={shortcut ? `${label} (${shortcut})` : label}
      onClick={onClick}
      className="inline-flex h-9 w-10 shrink-0 items-center justify-center gap-0 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-0 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-[var(--color-surface-subtle)] sm:w-auto sm:gap-2 sm:px-3"
    >
      <Icon size={14} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  isActive,
  size = "sm",
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  isActive?: boolean;
  size?: "sm" | "md";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={typeof isActive === "boolean" ? isActive : undefined}
      title={label}
      onClick={onClick}
      className={clsx(
        "flex items-center justify-center rounded-md border transition",
        size === "md" ? "h-9 w-9 shrink-0" : "h-8 w-8",
        isActive
          ? "border-[var(--color-accent)] bg-[var(--color-selection)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-slate-600 hover:bg-[var(--color-surface-subtle)] hover:text-slate-950",
      )}
    >
      <Icon size={14} />
    </button>
  );
}

export function EmptyState({
  title,
  detail,
  actionLabel,
  onAction,
}: {
  title: string;
  detail: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
      <NotebookText size={26} className="text-slate-400" />
      <p className="mt-3 text-[14px] font-semibold text-slate-950">{title}</p>
      <p className="mt-1 max-w-sm text-[13px] leading-6 text-[var(--color-muted)]">{detail}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex h-9 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white"
        >
          <Plus size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
