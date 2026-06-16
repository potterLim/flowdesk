import { Download, Upload } from "lucide-react";
import { clsx } from "clsx";
import type { WorkspacePersistenceMode } from "../../../lib/persistence/workspaceRepository";
import { formatDateTime } from "../../../lib/date";
import type { PersistenceStatus } from "../../../stores/workspaceStore";
import type { WorkspaceBackupState } from "../workspaceTypes";
import type { IsoDateTimeString } from "../../../domain/workspace";
import { WorkspaceBackupStatusMessage } from "./WorkspaceStatusMessages";

export function PersistenceStatusBadge({
  mode,
  status,
  error,
  lastPersistedAt,
}: {
  mode: WorkspacePersistenceMode;
  status: PersistenceStatus;
  error: string | null;
  lastPersistedAt: IsoDateTimeString | null;
}) {
  const label =
    status === "hydrating"
      ? "Opening workspace"
      : status === "saving"
        ? "Saving locally"
        : status === "error"
          ? "Storage issue"
          : mode === "sqlite"
            ? "Saved locally"
            : "Preview saved";
  const detail =
    status === "saving"
      ? "Writing local changes"
      : status === "error"
        ? (error ?? "FlowDesk could not write to local storage.")
        : lastPersistedAt
          ? `Updated ${formatDateTime(lastPersistedAt)}`
          : "Workspace is current";
  const dotClass =
    status === "error"
      ? "bg-red-500"
      : status === "saving" || status === "hydrating"
        ? "bg-[var(--color-accent)] motion-safe:animate-pulse"
        : "bg-emerald-500";

  return (
    <div
      className={clsx(
        "rounded-md border px-3 py-2",
        status === "error" ? "border-red-200 bg-red-50" : "border-[var(--color-border)] bg-[var(--color-app-bg)]",
      )}
      aria-live={status === "error" || status === "saving" ? "polite" : "off"}
    >
      <div className="flex items-center gap-2">
        <span className={clsx("h-2 w-2 shrink-0 rounded-full", dotClass)} />
        <span className="truncate text-[12px] font-semibold text-[var(--color-ink)]">{label}</span>
      </div>
      <p className="mt-1 truncate text-[11px] text-[var(--color-muted)]">{detail}</p>
    </div>
  );
}

export function WorkspaceDataControls({
  workspaceBackupState,
  onSaveWorkspaceBackup,
  onSelectWorkspaceBackup,
}: {
  workspaceBackupState: WorkspaceBackupState | null;
  onSaveWorkspaceBackup: () => void;
  onSelectWorkspaceBackup: () => void;
}) {
  const isBusy = workspaceBackupState?.status === "saving" || workspaceBackupState?.status === "selecting";

  return (
    <div className="mt-3 rounded-md border border-[var(--color-border)] bg-[var(--color-app-bg)] p-2">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onSaveWorkspaceBackup}
          disabled={isBusy}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <Download size={13} />
          Back Up
        </button>
        <button
          type="button"
          onClick={onSelectWorkspaceBackup}
          disabled={isBusy}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 text-[12px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
        >
          <Upload size={13} />
          Restore
        </button>
      </div>
      <WorkspaceBackupStatusMessage workspaceBackupState={workspaceBackupState} tone="sidebar" />
    </div>
  );
}
