import { clsx } from "clsx";
import type { Project } from "../../../domain/workspace";
import { accentClasses } from "../workspaceConstants";

export function ProjectTextField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 text-[14px] text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]"
      />
    </label>
  );
}

export function ProjectTextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className="mt-1 w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2 text-[14px] leading-6 text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]"
      />
    </label>
  );
}

export function ProjectAccentPicker({
  value,
  onChange,
}: {
  value: Project["accent"];
  onChange: (accent: Project["accent"]) => void;
}) {
  return (
    <fieldset>
      <legend className="text-[12px] font-semibold text-slate-700">Color</legend>
      <div className="mt-2 flex gap-2">
        {(["teal", "blue", "violet", "amber", "rose"] as Project["accent"][]).map((accentOption) => (
          <button
            key={accentOption}
            type="button"
            aria-label={`Use ${accentOption} project color`}
            aria-pressed={value === accentOption}
            onClick={() => onChange(accentOption)}
            className={clsx(
              "h-8 w-8 rounded-md border-2 transition",
              accentClasses[accentOption],
              value === accentOption ? "border-[var(--color-ink)]" : "border-transparent",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}
