import { clsx } from "clsx";
import type { ReactNode } from "react";
import type { DiagnosticsExportState, WorkspaceBackupState } from "../workspaceTypes";

type StatusTone = "accent" | "danger" | "muted" | "success" | "warning";

interface StatusMessageProps {
  children: ReactNode;
  className?: string;
  tone: StatusTone;
}

export function WorkspaceBackupStatusMessage({
  workspaceBackupState,
  tone,
}: {
  workspaceBackupState: WorkspaceBackupState | null;
  tone: "compact" | "sidebar";
}) {
  if (!workspaceBackupState) {
    return null;
  }

  const baseClass = tone === "compact" ? "mt-3" : "mt-2";

  switch (workspaceBackupState.status) {
    case "saving":
      return (
        <StatusMessage className={baseClass} tone="accent">
          Saving workspace backup...
        </StatusMessage>
      );
    case "selecting":
      return (
        <StatusMessage className={baseClass} tone="accent">
          Opening backup file...
        </StatusMessage>
      );
    case "saved":
      return (
        <StatusMessage className={baseClass} tone="success">
          Workspace backup saved.
        </StatusMessage>
      );
    case "downloaded":
      return (
        <StatusMessage className={baseClass} tone="success">
          Downloaded {workspaceBackupState.fileName}.
        </StatusMessage>
      );
    case "ready":
      return (
        <StatusMessage className={baseClass} tone="warning">
          Ready to restore {workspaceBackupState.projectCount} projects.
        </StatusMessage>
      );
    case "restored":
      return (
        <StatusMessage className={baseClass} tone="success">
          Restored {workspaceBackupState.projectCount} projects.
        </StatusMessage>
      );
    case "cancelled":
      return (
        <StatusMessage className={baseClass} tone="muted">
          No changes made.
        </StatusMessage>
      );
    case "error":
      return (
        <StatusMessage className={baseClass} tone="danger">
          {workspaceBackupState.message}
        </StatusMessage>
      );
  }
}

export function DiagnosticsStatusMessage({
  diagnosticsExportState,
}: {
  diagnosticsExportState: DiagnosticsExportState | null;
}) {
  if (!diagnosticsExportState) {
    return null;
  }

  switch (diagnosticsExportState.status) {
    case "saving":
      return <StatusMessage tone="accent">Preparing diagnostics...</StatusMessage>;
    case "saved":
      return <StatusMessage tone="success">Diagnostics saved.</StatusMessage>;
    case "downloaded":
      return <StatusMessage tone="success">Downloaded {diagnosticsExportState.fileName}.</StatusMessage>;
    case "cancelled":
      return <StatusMessage tone="muted">No diagnostics file saved.</StatusMessage>;
    case "error":
      return <StatusMessage tone="danger">{diagnosticsExportState.message}</StatusMessage>;
  }
}

function StatusMessage({ children, className = "mt-2", tone }: StatusMessageProps) {
  return (
    <p
      className={clsx("text-[11px] leading-5", statusMessageToneClasses[tone], className)}
      role={tone === "danger" ? "alert" : "status"}
      aria-live={tone === "danger" ? undefined : "polite"}
    >
      {children}
    </p>
  );
}

const statusMessageToneClasses = {
  accent: "font-medium text-[var(--color-accent)]",
  danger: "font-semibold text-red-700",
  muted: "text-[var(--color-muted)]",
  success: "truncate font-medium text-emerald-700",
  warning: "font-medium text-amber-700",
} as const satisfies Record<StatusTone, string>;
