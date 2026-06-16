import type { TimelineEvent } from "../../../domain/workspace";
import { PanelHeader } from "../components/WorkspacePrimitives";
import { TimelineList } from "./TimelinePanels";

export function TimelineView({ timelineEvents }: { timelineEvents: TimelineEvent[] }) {
  return (
    <div className="h-auto min-h-0 pt-5 xl:h-full">
      <section className="h-auto min-h-0 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)] xl:h-full">
        <PanelHeader title="Timeline" detail="A durable history of project activity" />
        <div className="min-h-0 overflow-y-auto px-6 py-4">
          <TimelineList timelineEvents={timelineEvents} />
        </div>
      </section>
    </div>
  );
}
