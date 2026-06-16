import { Plus, Search, Settings2 } from "lucide-react";
import { useState } from "react";
import type { IsoDateTimeString, Project, ProjectId } from "../../../domain/workspace";
import type { WorkspacePersistenceMode } from "../../../lib/persistence/workspaceRepository";
import type { PersistenceStatus } from "../../../stores/workspaceStore";
import { ProjectSidebarProjectList } from "./ProjectSidebarProjects";
import { IconButton } from "./WorkspacePrimitives";
import { PersistenceStatusBadge } from "./WorkspaceStatus";

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: ProjectId | null;
  onSelectProject: (projectId: ProjectId) => void;
  onCreateProject: () => void;
  onToggleProjectPinned: (projectId: ProjectId) => void;
  onArchiveProject: (projectId: ProjectId) => void;
  onRestoreProject: (projectId: ProjectId) => void;
  onOpenWorkspaceSettings: () => void;
  persistenceMode: WorkspacePersistenceMode;
  persistenceStatus: PersistenceStatus;
  persistenceError: string | null;
  lastPersistedAt: IsoDateTimeString | null;
}

export function ProjectSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
  onCreateProject,
  onToggleProjectPinned,
  onArchiveProject,
  onRestoreProject,
  onOpenWorkspaceSettings,
  persistenceMode,
  persistenceStatus,
  persistenceError,
  lastPersistedAt,
}: ProjectSidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <aside
      aria-label="Projects and workspace controls"
      className="flex w-full shrink-0 flex-col border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:w-[292px] lg:border-b-0 lg:border-r"
    >
      <div className="border-b border-[var(--color-border)] px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[19px] font-semibold tracking-normal text-slate-950">FlowDesk</h1>
            <p className="mt-0.5 text-[12px] font-medium text-[var(--color-muted)]">Research workspace</p>
          </div>
          <IconButton label="Workspace settings" icon={Settings2} onClick={onOpenWorkspaceSettings} />
        </div>
        <label className="mt-4 flex h-9 items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 text-[13px] text-[var(--color-muted)]">
          <Search size={15} />
          <input
            id="flowdesk-project-search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            aria-label="Search projects"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="Search projects"
          />
        </label>
      </div>

      <ProjectSidebarProjectList
        projects={projects}
        searchQuery={searchQuery}
        selectedProjectId={selectedProjectId}
        onSelectProject={onSelectProject}
        onToggleProjectPinned={onToggleProjectPinned}
        onArchiveProject={onArchiveProject}
        onRestoreProject={onRestoreProject}
      />

      <div className="border-t border-[var(--color-border)] p-3">
        <PersistenceStatusBadge
          mode={persistenceMode}
          status={persistenceStatus}
          error={persistenceError}
          lastPersistedAt={lastPersistedAt}
        />
        {projects.length > 0 && (
          <button
            type="button"
            onClick={onCreateProject}
            className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-[var(--color-accent)] px-3 text-[13px] font-semibold whitespace-nowrap text-white shadow-sm transition hover:bg-[var(--color-accent-strong)]"
          >
            <Plus size={15} />
            New Project
          </button>
        )}
      </div>
    </aside>
  );
}
