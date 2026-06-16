import type { LucideIcon } from "lucide-react";

export function MetricPanel({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
}) {
  return (
    <section className="min-w-0 max-w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-semibold uppercase text-[var(--color-muted)]">{label}</span>
        <Icon size={16} className="text-[var(--color-accent)]" />
      </div>
      <p className="mt-3 text-[24px] font-semibold text-slate-950">{value}</p>
      <p className="text-[12px] text-[var(--color-muted)]">{detail}</p>
    </section>
  );
}
