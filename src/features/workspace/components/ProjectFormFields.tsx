import { clsx } from "clsx";
import type { ProjectAccent } from "../../../domain/workspace";
import { accentClasses, projectAccentOptions } from "../workspaceConstants";

export function ProjectTextField({
  label,
  value,
  onChange,
  placeholder,
  autoFocus,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <input
        autoFocus={autoFocus}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={clsx(
          "mt-1 h-10 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 text-[14px] text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]",
          disabled && "cursor-not-allowed opacity-70",
        )}
      />
    </label>
  );
}

export function ProjectTextArea({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold text-slate-700">{label}</span>
      <textarea
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={3}
        className={clsx(
          "mt-1 w-full resize-none rounded-md border border-[var(--color-border)] bg-[var(--color-surface-subtle)] px-3 py-2 text-[14px] leading-6 text-[var(--color-ink)] outline-none transition placeholder:text-slate-400 focus:border-[var(--color-accent)] focus:ring-3 focus:ring-[var(--color-focus-ring)]",
          disabled && "cursor-not-allowed opacity-70",
        )}
      />
    </label>
  );
}

export function ProjectAccentPicker({
  value,
  onChange,
  disabled = false,
}: {
  value: ProjectAccent;
  onChange: (accent: ProjectAccent) => void;
  disabled?: boolean;
}) {
  return (
    <fieldset>
      <legend className="text-[12px] font-semibold text-slate-700">Color</legend>
      <div className="mt-2 flex gap-2">
        {projectAccentOptions.map((accentOption) => (
          <button
            key={accentOption}
            type="button"
            disabled={disabled}
            aria-label={`Use ${accentOption} project color`}
            aria-pressed={value === accentOption}
            onClick={() => onChange(accentOption)}
            className={clsx(
              "h-8 w-8 rounded-md border-2 transition",
              accentClasses[accentOption],
              value === accentOption ? "border-[var(--color-ink)]" : "border-transparent",
              disabled && "cursor-not-allowed opacity-70",
            )}
          />
        ))}
      </div>
    </fieldset>
  );
}
