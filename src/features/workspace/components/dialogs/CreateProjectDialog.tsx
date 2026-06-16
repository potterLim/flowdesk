import { X } from "lucide-react";
import { useState } from "react";
import type { SyntheticEvent } from "react";
import type { Project } from "../../../../domain/workspace";
import type { CreateProjectInput } from "../../../../stores/workspaceStore";
import { useDialogControls } from "../../hooks/useDialogControls";
import { parseTags } from "../../workspaceUtils";
import { ProjectAccentPicker, ProjectTextArea, ProjectTextField } from "../ProjectFormFields";

export function CreateProjectDialog({
  isOpen,
  onClose,
  onCreateProject,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (input: CreateProjectInput) => void;
}) {
  if (!isOpen) {
    return null;
  }

  return <CreateProjectDialogContent onClose={onClose} onCreateProject={onCreateProject} />;
}

function CreateProjectDialogContent({
  onClose,
  onCreateProject,
}: {
  onClose: () => void;
  onCreateProject: (input: CreateProjectInput) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [accent, setAccent] = useState<Project["accent"]>("teal");
  const dialogRef = useDialogControls<HTMLFormElement>(true, onClose);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/24 px-4 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <form
        ref={dialogRef}
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-project-title"
        aria-describedby="create-project-description"
        className="w-full max-w-[560px] rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_24px_80px_rgb(15_23_42/0.22)]"
      >
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4">
          <div>
            <h2 id="create-project-title" className="text-[16px] font-semibold text-[var(--color-ink)]">
              New Project
            </h2>
            <p id="create-project-description" className="mt-0.5 text-[12px] text-[var(--color-muted)]">
              Create the anchor for a workspace record.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close new project dialog"
            className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
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

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border)] bg-[var(--color-app-bg)] px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-[13px] font-semibold whitespace-nowrap text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!canCreateProject}
            className="h-9 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white transition hover:bg-[var(--color-accent-strong)] disabled:bg-slate-300"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
