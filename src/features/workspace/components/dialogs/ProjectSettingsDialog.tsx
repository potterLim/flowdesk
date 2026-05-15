import { Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { Project } from "../../../../domain/workspace";
import type { UpdateProjectInput } from "../../../../stores/workspaceStore";
import { useDialogControls } from "../../hooks/useDialogControls";
import { parseTags } from "../../workspaceUtils";
import { ProjectAccentPicker, ProjectTextArea, ProjectTextField } from "../ProjectFormFields";

export function ProjectSettingsDialog({
  project,
  isOpen,
  onClose,
  onUpdateProject,
  onRequestDelete,
}: {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onUpdateProject: (input: UpdateProjectInput) => void;
  onRequestDelete: () => void;
}) {
  const [title, setTitle] = useState(project.title);
  const [description, setDescription] = useState(project.description);
  const [tags, setTags] = useState(project.tags.join(", "));
  const [accent, setAccent] = useState<Project["accent"]>(project.accent);
  const dialogRef = useDialogControls<HTMLFormElement>(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setTitle(project.title);
    setDescription(project.description);
    setTags(project.tags.join(", "));
    setAccent(project.accent);
  }, [isOpen, project]);

  if (!isOpen) {
    return null;
  }

  const canSaveProject = title.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSaveProject) {
      return;
    }

    onUpdateProject({
      title,
      description,
      tags: parseTags(tags),
      accent,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm" onMouseDown={onClose}>
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-settings-title"
        aria-describedby="project-settings-description"
        className="w-full max-w-[600px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="project-settings-title" className="text-[16px] font-semibold text-[var(--color-ink)]">
              Project Settings
            </h2>
            <p id="project-settings-description" className="mt-0.5 text-[12px] text-[var(--color-muted)]">
              {project.status === "archived" ? "Read-only archived project" : "Project identity and organization"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close project settings dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <ProjectTextField label="Project name" value={title} onChange={setTitle} placeholder="Name this project" autoFocus />
          <ProjectTextArea label="Summary" value={description} onChange={setDescription} placeholder="Optional" />
          <ProjectTextField label="Tags" value={tags} onChange={setTags} placeholder="Optional, comma-separated" />
          <ProjectAccentPicker value={accent} onChange={setAccent} />
        </div>

        <div className="flex flex-col gap-3 border-t border-[var(--color-border)] bg-[var(--color-app-bg)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onRequestDelete}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 text-[13px] font-semibold whitespace-nowrap text-red-700 transition hover:bg-red-100"
          >
            <Trash2 size={14} />
            Delete Project
          </button>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSaveProject}
              className="h-9 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)] disabled:bg-slate-300"
            >
              Save Changes
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
