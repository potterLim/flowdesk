import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { clsx } from "clsx";
import type { KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { useDialogControls } from "../hooks/useDialogControls";

export interface CommandPaletteItem {
  id: string;
  label: string;
  detail: string;
  shortcut?: string;
  icon: LucideIcon;
  isDisabled?: boolean;
  onSelect: () => void;
}

function getCommandSearchScore(command: CommandPaletteItem, query: string): number {
  const label = command.label.toLowerCase();
  const detail = command.detail.toLowerCase();
  const shortcut = command.shortcut?.toLowerCase() ?? "";

  if (label === query) {
    return 0;
  }

  if (label.startsWith(query)) {
    return 1;
  }

  if (label.split(/\s+/).some((word) => word.startsWith(query))) {
    return 2;
  }

  if (detail.includes(query)) {
    return 3;
  }

  if (shortcut.includes(query)) {
    return 4;
  }

  return Number.POSITIVE_INFINITY;
}

export function CommandPalette({
  isOpen,
  commands,
  onClose,
}: {
  isOpen: boolean;
  commands: CommandPaletteItem[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useDialogControls<HTMLDivElement>(isOpen, onClose);
  const filteredCommands = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return commands;
    }

    return commands
      .map((command, index) => ({
        command,
        index,
        score: getCommandSearchScore(command, normalizedQuery),
      }))
      .filter((item) => Number.isFinite(item.score))
      .sort((first, second) => first.score - second.score || first.index - second.index)
      .map((item) => item.command);
  }, [commands, query]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setQuery("");
    setActiveIndex(0);
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    setActiveIndex((index) => Math.min(index, Math.max(filteredCommands.length - 1, 0)));
  }, [filteredCommands.length]);

  if (!isOpen) {
    return null;
  }

  const activeCommand = filteredCommands[activeIndex];

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, Math.max(filteredCommands.length - 1, 0)));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
      return;
    }

    if (event.key === "Enter" && activeCommand && !activeCommand.isDisabled) {
      event.preventDefault();
      onClose();
      activeCommand.onSelect();
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-slate-950/24 px-4 pt-[12vh] backdrop-blur-sm" onMouseDown={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-[640px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.24)]"
      >
        <div className="flex h-12 items-center gap-3 border-b border-[var(--color-border)] px-4">
          <Search size={16} className="shrink-0 text-[var(--color-muted)]" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Search commands"
            role="combobox"
            aria-expanded="true"
            aria-autocomplete="list"
            aria-controls="flowdesk-command-results"
            aria-activedescendant={activeCommand ? `flowdesk-command-${activeCommand.id}` : undefined}
            className="h-full min-w-0 flex-1 bg-transparent text-[14px] text-[var(--color-ink)] outline-none placeholder:text-slate-400"
            placeholder="Search commands"
          />
          <h2 id="command-palette-title" className="sr-only">
            Command Palette
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close command palette"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition hover:bg-[var(--color-surface-subtle)] hover:text-slate-950"
          >
            <X size={15} />
          </button>
        </div>

        <div id="flowdesk-command-results" role="listbox" className="max-h-[420px] overflow-y-auto p-2">
          {filteredCommands.length === 0 ? (
            <div className="px-3 py-8 text-center text-[13px] font-medium text-[var(--color-muted)]">No matching commands</div>
          ) : (
            filteredCommands.map((command, index) => {
              const Icon = command.icon;
              const isActive = index === activeIndex;

              return (
                <button
                  key={command.id}
                  id={`flowdesk-command-${command.id}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  disabled={command.isDisabled}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => {
                    if (command.isDisabled) {
                      return;
                    }

                    onClose();
                    command.onSelect();
                  }}
                  className={clsx(
                    "flex min-h-12 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition",
                    isActive ? "bg-[var(--color-selection)]" : "hover:bg-[var(--color-surface-subtle)]",
                    command.isDisabled && "cursor-not-allowed opacity-45",
                  )}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-accent)]">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-[var(--color-ink)]">{command.label}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-[var(--color-muted)]">{command.detail}</span>
                  </span>
                  {command.shortcut && (
                    <span className="shrink-0 rounded-md border border-[var(--color-border)] px-2 py-1 text-[11px] font-semibold text-[var(--color-muted)]">
                      {command.shortcut}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
