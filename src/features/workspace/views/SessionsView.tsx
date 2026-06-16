import type { WorkSession } from "../../../domain/workspace";
import { formatDuration, getElapsedMinutes } from "../../../lib/date";
import { EmptyState, PanelHeader } from "../components/WorkspacePrimitives";
import { SessionCard } from "./SessionCard";

export function SessionsView({
  sessions,
  canEditProject,
  onStartSession,
  onUpdateActiveSessionNotes,
  onEndSession,
  onFlushWorkspacePersistence,
}: {
  sessions: WorkSession[];
  canEditProject: boolean;
  onStartSession: () => void;
  onUpdateActiveSessionNotes: (notes: string) => void;
  onEndSession: () => void;
  onFlushWorkspacePersistence: () => void;
}) {
  const activeSession = sessions.find((session) => session.endedAt === null);

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-5 pt-5 lg:grid-cols-[360px_minmax(0,1fr)] xl:h-full">
      <SessionCard
        activeSession={activeSession}
        sessions={sessions}
        canEditProject={canEditProject}
        onStartSession={onStartSession}
        onUpdateActiveSessionNotes={onUpdateActiveSessionNotes}
        onEndSession={onEndSession}
        onFlushWorkspacePersistence={onFlushWorkspacePersistence}
      />
      <section className="min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]">
        <PanelHeader title="Session History" detail="Actual work blocks over time" />
        <div className="min-h-0 divide-y divide-[var(--color-border)] overflow-y-auto">
          {sessions.length === 0 ? (
            <EmptyState
              title="No sessions yet"
              detail={
                canEditProject
                  ? "Start a focus session when work begins."
                  : "Restore the project before tracking sessions."
              }
              actionLabel={canEditProject ? "Start Session" : undefined}
              onAction={canEditProject ? onStartSession : undefined}
            />
          ) : (
            sessions.map((session) => (
              <div key={session.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[14px] font-semibold text-slate-950">{session.title}</p>
                    <p className="mt-1 max-w-2xl text-[13px] leading-6 text-[var(--color-muted)]">
                      {session.notes || "No notes recorded."}
                    </p>
                  </div>
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[12px] font-semibold whitespace-nowrap text-slate-600">
                    {session.durationMinutes
                      ? formatDuration(session.durationMinutes)
                      : formatDuration(getElapsedMinutes(session.startedAt, null))}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
