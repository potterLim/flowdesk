import { Database } from "lucide-react";

export function PersistenceAlert({
  error,
  onRequestRepair,
}: {
  error: string | null;
  onRequestRepair: () => void;
}) {
  return (
    <div
      className="mt-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 sm:flex-row sm:items-start"
      role="status"
      aria-live="polite"
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <Database size={16} className="mt-0.5 shrink-0" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold">FlowDesk could not write local changes.</p>
          <p className="mt-1 text-[12px] leading-5">{error ?? "Keep the app open and try the action again."}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onRequestRepair}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border border-red-200 bg-[var(--color-surface)] px-3 text-[12px] font-semibold whitespace-nowrap text-red-700 transition hover:bg-red-100"
      >
        <Database size={13} />
        Repair Local Storage
      </button>
    </div>
  );
}
