import { Play, Square, Timer } from "lucide-react";
import type { WorkSession } from "../../../domain/workspace";
import { formatDuration, getElapsedMinutes } from "../../../lib/date";

export function SessionCard({
  activeSession,
  sessions,
  canEditProject,
  onStartSession,
  onUpdateActiveSessionNotes,
  onEndSession,
  onFlushWorkspacePersistence,
}: {
  activeSession: WorkSession | undefined;
  sessions: WorkSession[];
  canEditProject: boolean;
  onStartSession: () => void;
  onUpdateActiveSessionNotes: (notes: string) => void;
  onEndSession: () => void;
  onFlushWorkspacePersistence: () => void;
}) {
  return (
    <section className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[15px] font-semibold text-slate-950">Focus Session</h3>
          <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">Track actual work time</p>
        </div>
        <Timer size={18} className="text-[var(--color-accent)]" />
      </div>
      {activeSession ? (
        <div className="mt-4 rounded-md border border-[var(--color-accent)] bg-[var(--color-selection)] p-3">
          <p className="text-[13px] font-semibold text-[var(--color-ink)]">{activeSession.title}</p>
          <p className="mt-2 text-[26px] font-semibold text-[var(--color-accent)]">
            {formatDuration(getElapsedMinutes(activeSession.startedAt, null))}
          </p>
          <label className="mt-3 block">
            <span className="text-[12px] font-semibold text-[var(--color-ink)]">Session notes</span>
            <textarea
              value={activeSession.notes}
              onChange={(event) => onUpdateActiveSessionNotes(event.target.value)}
              onBlur={onFlushWorkspacePersistence}
              placeholder="What changed during this block?"
              className="mt-1 min-h-[82px] w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-[13px] leading-5 text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]"
            />
          </label>
          <button
            type="button"
            onClick={onEndSession}
            className="mt-3 flex h-8 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white"
          >
            <Square size={13} />
            End Session
          </button>
        </div>
      ) : canEditProject ? (
        <button
          type="button"
          onClick={onStartSession}
          className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white"
        >
          <Play size={14} />
          Start Focus Session
        </button>
      ) : (
        <div className="mt-4 rounded-md border border-dashed border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 py-4 text-center text-[12px] leading-5 text-[var(--color-muted)]">
          Restore this project before tracking new sessions.
        </div>
      )}
      <p className="mt-3 text-[12px] text-[var(--color-muted)]">
        {sessions.length === 1 ? "1 session recorded" : `${sessions.length} sessions recorded`}
      </p>
    </section>
  );
}
