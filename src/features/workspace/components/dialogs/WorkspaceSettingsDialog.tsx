import { Database, Download, FileText, Monitor, Moon, Sun, X } from "lucide-react";
import { clsx } from "clsx";
import { useId } from "react";
import type { LucideIcon } from "lucide-react";
import type { IsoDateTimeString } from "../../../../domain/workspace";
import type { WorkspacePersistenceMode } from "../../../../lib/persistence/workspaceRepository";
import type { PersistenceStatus } from "../../../../stores/workspaceStore";
import { useDialogControls } from "../../hooks/useDialogControls";
import type { DiagnosticsExportState, ThemeMode, WorkspaceBackupState } from "../../workspaceTypes";
import { PersistenceStatusBadge, WorkspaceDataControls } from "../WorkspaceStatus";
import { DiagnosticsStatusMessage } from "../WorkspaceStatusMessages";

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
  lastPersistedAt: IsoDateTimeString | null;
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
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
                  FlowDesk keeps workspace records on this device. Save a JSON backup before moving machines or testing
                  recovery.
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
                  Export a support file with app version, platform, local storage paths, log folder, and database
                  health.
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
                  If the local database cannot open, FlowDesk can move the current SQLite files to a recovery folder and
                  start clean.
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

function ThemePreferenceGroup({ value, onChange }: { value: ThemeMode; onChange: (themeMode: ThemeMode) => void }) {
  const options: { value: ThemeMode; label: string; icon: LucideIcon }[] = [
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
