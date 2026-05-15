import { lazy, Suspense } from "react";
import { Plus, Trash2 } from "lucide-react";
import { clsx } from "clsx";
import type { Note } from "../../../domain/workspace";
import { formatShortDate } from "../../../lib/date";
import { EmptyState, PanelHeader } from "../components/WorkspacePrimitives";
import { MarkdownReadingSurface } from "./WorkspaceViewPanels";

const MarkdownEditor = lazy(() =>
  import("../../../components/MarkdownEditor").then((module) => ({ default: module.MarkdownEditor })),
);

export function NotesView({
  notes,
  selectedNoteId,
  selectedNoteContent,
  onSelectNote,
  onUpdateTitle,
  onUpdateContent,
  onCreateNote,
  onDeleteNote,
  canEditProject,
}: {
  notes: Note[];
  selectedNoteId: string;
  selectedNoteContent: string;
  onSelectNote: (noteId: string) => void;
  onUpdateTitle: (title: string) => void;
  onUpdateContent: (content: string) => void;
  onCreateNote: () => void;
  onDeleteNote: (noteId: string) => void;
  canEditProject: boolean;
}) {
  const selectedNote = notes.find((note) => note.id === selectedNoteId);

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] xl:h-full xl:grid-cols-[280px_minmax(0,1fr)_minmax(320px,0.8fr)]">
      <aside className="min-h-0 border-b border-[var(--color-border)] bg-[var(--color-app-bg)] xl:border-b-0 xl:border-r">
        <PanelHeader title="Notes" detail="Folders and records" />
        <div className="space-y-1 p-3">
          {notes.length === 0 ? (
            <div className="rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-4 text-center">
              <p className="text-[13px] font-semibold text-slate-900">No notes yet</p>
              <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">Create the first durable record for this project.</p>
              {canEditProject && (
                <button
                  type="button"
                  onClick={onCreateNote}
                  className="mt-3 inline-flex h-8 items-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[12px] font-semibold whitespace-nowrap text-white"
                >
                  <Plus size={13} />
                  New Note
                </button>
              )}
            </div>
          ) : (
            notes.map((note) => (
              <button
                key={note.id}
                type="button"
                onClick={() => onSelectNote(note.id)}
                className={clsx(
                  "w-full rounded-md px-3 py-2 text-left transition",
                  note.id === selectedNoteId ? "bg-[var(--color-selection)]" : "hover:bg-[var(--color-surface)]",
                )}
              >
                <span className="block truncate text-[13px] font-semibold text-slate-900">{note.title || "Untitled note"}</span>
                <span className="mt-1 block text-[12px] text-[var(--color-muted)]">
                  {note.folder} · {formatShortDate(note.updatedAt)}
                </span>
              </button>
            ))
          )}
        </div>
      </aside>

      <section className="grid min-h-[520px] grid-rows-[48px_minmax(0,1fr)] border-b border-[var(--color-border)] xl:min-h-0 xl:border-b-0 xl:border-r">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4">
          <div className="min-w-0">
            {selectedNote ? (
              <input
                value={selectedNote.title}
                onChange={(event) => onUpdateTitle(event.target.value)}
                readOnly={!canEditProject}
                className="h-6 w-full min-w-0 rounded-sm bg-transparent text-[13px] font-semibold text-slate-950 outline-none focus:bg-[var(--color-surface-subtle)] read-only:cursor-default"
                aria-label="Note title"
              />
            ) : (
              <p className="truncate text-[13px] font-semibold text-slate-950">No note selected</p>
            )}
            <p className="text-[12px] text-[var(--color-muted)]">
              {selectedNote ? (canEditProject ? "Markdown editor" : "Archived note") : "Choose or create a note"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[12px] font-medium whitespace-nowrap text-slate-600">
              {selectedNote ? (canEditProject ? "Saved locally" : "Read only") : "Ready"}
            </span>
            {selectedNote && canEditProject && (
              <button
                type="button"
                onClick={() => onDeleteNote(selectedNote.id)}
                aria-label="Delete note"
                title="Delete note"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--color-border)] text-slate-500 transition hover:bg-red-50 hover:text-red-700"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        {selectedNote && canEditProject ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-[13px] font-medium text-[var(--color-muted)]">
                Loading Markdown editor
              </div>
            }
          >
            <MarkdownEditor value={selectedNoteContent} onChange={onUpdateContent} />
          </Suspense>
        ) : selectedNote ? (
          <div className="min-h-0 overflow-y-auto p-5">
            <MarkdownReadingSurface content={selectedNoteContent} />
          </div>
        ) : (
          <EmptyState
            title="No note selected"
            detail={canEditProject ? "Create a note to open the Markdown editor." : "Restore the project before adding new notes."}
          />
        )}
      </section>

      <section className="grid min-h-[480px] grid-rows-[48px_minmax(0,1fr)] bg-[var(--color-app-bg)] xl:min-h-0">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4">
          <div>
            <p className="text-[13px] font-semibold text-slate-950">Preview</p>
            <p className="text-[12px] text-[var(--color-muted)]">Rendered Markdown</p>
          </div>
        </div>
        <div className="min-h-0 overflow-y-auto p-5">
          {selectedNote ? (
            <MarkdownReadingSurface content={selectedNoteContent} />
          ) : (
            <EmptyState title="Preview is empty" detail="The rendered note preview appears here after a note is created." />
          )}
        </div>
      </section>
    </div>
  );
}
