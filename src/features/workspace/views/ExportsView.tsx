import { Database, Download } from "lucide-react";
import type { ExportFormat } from "../../../lib/export/exportProjectRecord";
import { PanelHeader } from "../components/WorkspacePrimitives";
import type { ExportSaveState } from "../workspaceTypes";
import { formatExportFormat } from "../workspaceUtils";

export function ExportsView({
  exportPreview,
  exportSaveState,
  onPrepareMarkdownExport,
  onPrepareJsonExport,
  onSaveProjectRecord,
  onRevealSavedExport,
}: {
  exportPreview: string;
  exportSaveState: ExportSaveState | null;
  onPrepareMarkdownExport: () => void;
  onPrepareJsonExport: () => void;
  onSaveProjectRecord: (format: ExportFormat) => void;
  onRevealSavedExport: () => void;
}) {
  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 lg:grid-cols-[320px_minmax(0,1fr)] xl:h-full">
      <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
        <h3 className="text-[15px] font-semibold text-slate-950">Export Records</h3>
        <p className="mt-2 text-[13px] leading-6 text-[var(--color-muted)]">
          Exports are generated from project records rather than rendered UI, so records stay stable as the app evolves.
        </p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={onPrepareMarkdownExport}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white"
          >
            <Download size={15} />
            Preview Markdown
          </button>
          <button
            type="button"
            onClick={onPrepareJsonExport}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700"
          >
            <Database size={15} />
            Preview Project JSON
          </button>
        </div>

        <div className="mt-5 border-t border-[var(--color-border)] pt-4">
          <p className="text-[12px] font-semibold uppercase text-[var(--color-muted)]">Save file</p>
          <div className="mt-3 space-y-2">
            <button
              type="button"
              onClick={() => onSaveProjectRecord("markdown")}
              disabled={exportSaveState?.status === "saving"}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Download size={15} />
              Save Markdown...
            </button>
            <button
              type="button"
              onClick={() => onSaveProjectRecord("json")}
              disabled={exportSaveState?.status === "saving"}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Database size={15} />
              Save JSON...
            </button>
          </div>
          <ExportStatusMessage exportSaveState={exportSaveState} onRevealSavedExport={onRevealSavedExport} />
        </div>
      </section>
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <PanelHeader title="Export Preview" detail="Portable project record" />
        <pre className="h-full overflow-auto whitespace-pre-wrap p-5 text-[13px] leading-6 text-slate-800">
          {exportPreview || "Choose an export format to prepare a portable project record."}
        </pre>
      </section>
    </div>
  );
}

function ExportStatusMessage({
  exportSaveState,
  onRevealSavedExport,
}: {
  exportSaveState: ExportSaveState | null;
  onRevealSavedExport: () => void;
}) {
  if (!exportSaveState) {
    return (
      <p className="mt-3 rounded-md bg-[var(--color-app-bg)] px-3 py-2 text-[12px] leading-5 text-[var(--color-muted)]">
        Desktop builds use the system save dialog.
      </p>
    );
  }

  if (exportSaveState.status === "saving") {
    return (
      <p
        className="mt-3 rounded-md bg-[var(--color-selection)] px-3 py-2 text-[12px] font-medium leading-5 text-[var(--color-accent)]"
        role="status"
        aria-live="polite"
      >
        Saving {formatExportFormat(exportSaveState.format)} project record...
      </p>
    );
  }

  if (exportSaveState.status === "saved") {
    return (
      <div
        className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2"
        role="status"
        aria-live="polite"
      >
        <p className="truncate text-[12px] font-semibold text-emerald-800">
          Saved {formatExportFormat(exportSaveState.format)} record.
        </p>
        <button
          type="button"
          onClick={onRevealSavedExport}
          className="mt-2 h-8 rounded-md border border-emerald-200 bg-[var(--color-surface)] px-3 text-[12px] font-semibold whitespace-nowrap text-emerald-800 transition hover:bg-emerald-100"
        >
          Reveal in Folder
        </button>
      </div>
    );
  }

  if (exportSaveState.status === "downloaded") {
    return (
      <p
        className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12px] font-semibold leading-5 text-emerald-800"
        role="status"
        aria-live="polite"
      >
        Downloaded {exportSaveState.fileName}.
      </p>
    );
  }

  if (exportSaveState.status === "cancelled") {
    return (
      <p
        className="mt-3 rounded-md bg-[var(--color-app-bg)] px-3 py-2 text-[12px] leading-5 text-[var(--color-muted)]"
        role="status"
        aria-live="polite"
      >
        {formatExportFormat(exportSaveState.format)} export was cancelled.
      </p>
    );
  }

  return (
    <p
      className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold leading-5 text-red-700"
      role="alert"
    >
      {exportSaveState.message}
    </p>
  );
}
