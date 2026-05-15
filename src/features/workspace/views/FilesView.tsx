import { ExternalLink, FileText, FolderOpen, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { clsx } from "clsx";
import type { WorkspaceFile } from "../../../domain/workspace";
import { formatDateTime, formatShortDate } from "../../../lib/date";
import { EmptyState, PanelHeader } from "../components/WorkspacePrimitives";

export function FilesView({
  files,
  canEditProject,
  fileActionError,
  onImportFiles,
  onOpenFile,
  onRevealFile,
  onDeleteFile,
}: {
  files: WorkspaceFile[];
  canEditProject: boolean;
  fileActionError: string | null;
  onImportFiles: () => void;
  onOpenFile: (path: string) => void;
  onRevealFile: (path: string) => void;
  onDeleteFile: (fileId: string) => void;
}) {
  const [selectedFileId, setSelectedFileId] = useState("");

  useEffect(() => {
    if (files.some((file) => file.id === selectedFileId)) {
      return;
    }

    setSelectedFileId(files[0]?.id ?? "");
  }, [files, selectedFileId]);

  const selectedFile = files.find((file) => file.id === selectedFileId) ?? files[0];
  const selectedFileStorageLabel = selectedFile?.storageMode === "managed" ? "Managed copy" : "Linked file";

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 lg:grid-cols-[360px_minmax(0,1fr)] xl:h-full">
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <div className="flex h-14 items-center justify-between border-b border-[var(--color-border)] px-4">
          <div className="min-w-0">
            <h3 className="truncate text-[14px] font-semibold text-slate-950">Files</h3>
            <p className="mt-0.5 truncate text-[12px] text-[var(--color-muted)]">
              {files.length === 1 ? "1 project attachment" : `${files.length} project attachments`}
            </p>
          </div>
          {canEditProject && (
            <button
              type="button"
              onClick={onImportFiles}
              className="inline-flex h-8 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[12px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)]"
            >
              <Upload size={13} />
              Import
            </button>
          )}
        </div>
        <div className="min-h-0 space-y-2 overflow-y-auto p-3">
          {fileActionError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] font-semibold leading-5 text-red-700" role="alert">
              {fileActionError}
            </p>
          )}
          {files.length === 0 ? (
            <EmptyState
              title="No files imported"
              detail={canEditProject ? "Attach project PDFs, images, datasets, text files, or Markdown records." : "Restore the project before importing files."}
              actionLabel={canEditProject ? "Import Files" : undefined}
              onAction={canEditProject ? onImportFiles : undefined}
            />
          ) : (
            files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedFileId(file.id)}
                aria-current={selectedFile?.id === file.id ? "true" : undefined}
                className={clsx(
                  "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left transition",
                  selectedFile?.id === file.id
                    ? "border-[var(--color-accent)] bg-[var(--color-selection)]"
                    : "border-transparent hover:border-slate-200 hover:bg-[var(--color-surface-subtle)]",
                )}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)]">
                  <FileText size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-[var(--color-ink)]">{file.name}</span>
                  <span className="mt-0.5 block truncate text-[12px] text-[var(--color-muted)]">
                    {file.fileType.toUpperCase()} · {file.sizeLabel} · {file.storageMode === "managed" ? "Managed" : "Linked"}
                  </span>
                </span>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <PanelHeader title="File Details" detail={selectedFile ? formatShortDate(selectedFile.importedAt) : "Project attachment"} />
        <div className="min-h-0 overflow-y-auto p-5">
          {selectedFile ? (
            <div className="max-w-3xl">
              <div className="flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-selection)] text-[var(--color-accent)]">
                  <FileText size={20} />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[18px] font-semibold text-[var(--color-ink)]">{selectedFile.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className="text-[13px] text-[var(--color-muted)]">
                      {selectedFile.fileType.toUpperCase()} · {selectedFile.sizeLabel}
                    </p>
                    <span className="rounded-md border border-[var(--color-border)] bg-[var(--color-app-bg)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-muted)]">
                      {selectedFileStorageLabel}
                    </span>
                  </div>
                </div>
              </div>
              <dl className="mt-6 grid gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-app-bg)] p-4 text-[13px]">
                <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <dt className="font-semibold text-[var(--color-muted)]">Storage</dt>
                  <dd className="text-[var(--color-ink)]">
                    {selectedFile.storageMode === "managed"
                      ? "Copied into FlowDesk app data"
                      : "Linked to the original location"}
                  </dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <dt className="font-semibold text-[var(--color-muted)]">Imported</dt>
                  <dd className="text-[var(--color-ink)]">{formatDateTime(selectedFile.importedAt)}</dd>
                </div>
                <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
                  <dt className="font-semibold text-[var(--color-muted)]">Location</dt>
                  <dd className="min-w-0 truncate text-[var(--color-ink)]" title={selectedFile.path}>{selectedFile.path}</dd>
                </div>
                {selectedFile.sourcePath && (
                  <div className="grid gap-1 sm:grid-cols-[120px_minmax(0,1fr)]">
                    <dt className="font-semibold text-[var(--color-muted)]">Original</dt>
                    <dd className="min-w-0 truncate text-[var(--color-ink)]" title={selectedFile.sourcePath}>{selectedFile.sourcePath}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenFile(selectedFile.path)}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)]"
                >
                  <ExternalLink size={14} />
                  Open
                </button>
                <button
                  type="button"
                  onClick={() => onRevealFile(selectedFile.path)}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-[var(--color-surface-subtle)]"
                >
                  <FolderOpen size={14} />
                  Reveal
                </button>
                {canEditProject && (
                  <button
                    type="button"
                    onClick={() => onDeleteFile(selectedFile.id)}
                    className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-[13px] font-semibold whitespace-nowrap text-red-700 transition hover:bg-red-100"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                )}
              </div>
            </div>
          ) : (
            <EmptyState title="No file selected" detail="Imported files appear here with their local path, size, and system actions." />
          )}
        </div>
      </section>
    </div>
  );
}
