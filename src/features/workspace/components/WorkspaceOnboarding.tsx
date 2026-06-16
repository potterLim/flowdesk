import { CheckSquare, Clock3, Database, Download, NotebookText, PanelLeft, Plus, Timer, Upload } from "lucide-react";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import type { Project } from "../../../domain/workspace";
import type { CreateProjectInput } from "../../../stores/workspaceStore";
import { parseTags } from "../workspaceUtils";
import type { WorkspaceBackupState } from "../workspaceTypes";
import { ProjectAccentPicker, ProjectTextArea, ProjectTextField } from "./ProjectFormFields";
import { WorkspaceBackupStatusMessage } from "./WorkspaceStatusMessages";

export function WorkspaceBootView() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-app-bg)] px-6 text-[var(--color-ink)]">
      <section
        className="w-full max-w-[420px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-soft)]"
        aria-live="polite"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
              <PanelLeft size={18} />
            </span>
            <div>
              <h1 className="text-[17px] font-semibold text-[var(--color-ink)]">FlowDesk</h1>
              <p className="mt-0.5 text-[12px] text-[var(--color-muted)]">Opening your local workspace</p>
            </div>
          </div>
        </div>
        <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-subtle)]">
          <div className="h-full w-1/2 rounded-full bg-[var(--color-accent)] motion-safe:animate-pulse" />
        </div>
      </section>
    </main>
  );
}

export function FirstRunView({
  workspaceBackupState,
  onCreateProject,
  onSelectWorkspaceBackup,
}: {
  workspaceBackupState: WorkspaceBackupState | null;
  onCreateProject: (input: CreateProjectInput) => void;
  onSelectWorkspaceBackup: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [accent, setAccent] = useState<Project["accent"]>("teal");
  const canCreateProject = title.trim().length > 0;

  const handleSubmit = (event: SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCreateProject) {
      return;
    }

    onCreateProject({
      title,
      description,
      tags: parseTags(tags),
      accent,
    });
    setTitle("");
    setDescription("");
    setTags("");
    setAccent("teal");
  };

  return (
    <section className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-8 lg:px-10">
      <div className="mx-auto grid w-full max-w-[1080px] gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[var(--shadow-soft)] sm:p-6"
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[var(--color-accent)] text-white">
            <PanelLeft size={20} />
          </div>
          <h2 className="mt-5 max-w-2xl text-[28px] font-semibold leading-tight tracking-normal text-[var(--color-ink)]">
            Create your first project.
          </h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-[var(--color-muted)]">
            FlowDesk keeps notes, tasks, sessions, files, and exports organized around a durable project record.
          </p>

          <div className="mt-5 grid gap-3">
            <ProjectTextField
              label="Project name"
              value={title}
              onChange={setTitle}
              placeholder="Name this project"
              autoFocus
            />
            <ProjectTextArea label="Summary" value={description} onChange={setDescription} placeholder="Optional" />
            <ProjectTextField label="Tags" value={tags} onChange={setTags} placeholder="Optional, comma-separated" />
            <ProjectAccentPicker value={accent} onChange={setAccent} />
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <p className="text-[12px] leading-5 text-[var(--color-muted)]">
              Private by default. Stored on this device.
            </p>
            <button
              type="submit"
              disabled={!canCreateProject}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 text-[13px] font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-[var(--color-accent-strong)] disabled:bg-slate-300"
            >
              <Plus size={15} />
              Create Project
            </button>
          </div>
        </form>

        <aside className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)]">
          <p className="px-1 text-[12px] font-semibold uppercase text-[var(--color-muted)]">Every Project Includes</p>
          <div className="mt-4 space-y-2">
            {[
              { icon: NotebookText, title: "Notes", detail: "Markdown editor and preview" },
              { icon: CheckSquare, title: "Tasks", detail: "Priorities and due dates" },
              { icon: Timer, title: "Sessions", detail: "Focused work blocks" },
              { icon: Clock3, title: "Timeline", detail: "Project activity history" },
              { icon: Download, title: "Exports", detail: "Portable project records" },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="flex gap-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-app-bg)] p-3"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-selection)] text-[var(--color-accent)]">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-[var(--color-ink)]">{item.title}</span>
                    <span className="mt-0.5 block text-[12px] leading-5 text-[var(--color-muted)]">{item.detail}</span>
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-app-bg)] p-3">
            <div className="flex items-start gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--color-selection)] text-[var(--color-accent)]">
                <Database size={15} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-[var(--color-ink)]">Restore existing work</p>
                <p className="mt-0.5 text-[12px] leading-5 text-[var(--color-muted)]">
                  Open a FlowDesk backup before creating a new workspace.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onSelectWorkspaceBackup}
              disabled={workspaceBackupState?.status === "selecting"}
              className="mt-3 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <Upload size={14} />
              Restore Backup...
            </button>
            <WorkspaceBackupStatusMessage workspaceBackupState={workspaceBackupState} tone="compact" />
          </div>
        </aside>
      </div>
    </section>
  );
}
