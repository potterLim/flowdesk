import { Archive, ArchiveRestore, ChevronRight, Pin, Plus, Search, Settings2 } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";
import type { ReactNode } from "react";
import type { Project } from "../../../domain/workspace";
import type { WorkspacePersistenceMode } from "../../../lib/persistence/workspaceRepository";
import type { PersistenceStatus } from "../../../stores/workspaceStore";
import { accentClasses } from "../workspaceConstants";
import { IconButton } from "./WorkspacePrimitives";
import { PersistenceStatusBadge } from "./WorkspaceStatus";

interface ProjectSidebarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (projectId: string) => void;
  onCreateProject: () => void;
  onToggleProjectPinned: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
  onOpenWorkspaceSettings: () => void;
  persistenceMode: WorkspacePersistenceMode;
  persistenceStatus: PersistenceStatus;
  persistenceError: string | null;
  lastPersistedAt: string | null;
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
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleProjects = projects.filter((project) => {
    if (!normalizedSearchQuery) {
      return true;
    }

    return [project.title, project.description, ...project.tags].some((value) => value.toLowerCase().includes(normalizedSearchQuery));
  });
  const activeProjects = visibleProjects.filter((project) => project.status === "active");
  const archivedProjects = visibleProjects.filter((project) => project.status === "archived");

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

      <div className="max-h-[480px] flex-1 overflow-y-auto px-3 py-4 lg:min-h-0 lg:max-h-none">
        {visibleProjects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-app-bg)] px-3 py-5 text-center">
            <p className="text-[13px] font-semibold text-slate-800">
              {projects.length === 0 ? "No projects yet" : "No matching projects"}
            </p>
            <p className="mt-1 text-[12px] leading-5 text-[var(--color-muted)]">
              {projects.length === 0 ? "Create a project to begin." : "Adjust the search query."}
            </p>
          </div>
        ) : (
          <>
            {activeProjects.some((project) => project.isPinned) && (
              <SidebarSection title="Pinned">
                {activeProjects
                  .filter((project) => project.isPinned)
                  .map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isSelected={project.id === selectedProjectId}
                      onSelectProject={onSelectProject}
                      onToggleProjectPinned={onToggleProjectPinned}
                      onArchiveProject={onArchiveProject}
                      onRestoreProject={onRestoreProject}
                    />
                  ))}
              </SidebarSection>
            )}

            {activeProjects.some((project) => !project.isPinned) && (
              <SidebarSection title="Projects">
                {activeProjects
                  .filter((project) => !project.isPinned)
                  .map((project) => (
                    <ProjectRow
                      key={project.id}
                      project={project}
                      isSelected={project.id === selectedProjectId}
                      onSelectProject={onSelectProject}
                      onToggleProjectPinned={onToggleProjectPinned}
                      onArchiveProject={onArchiveProject}
                      onRestoreProject={onRestoreProject}
                    />
                  ))}
              </SidebarSection>
            )}

            {archivedProjects.length > 0 && (
              <SidebarSection title="Archived">
                {archivedProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    isSelected={project.id === selectedProjectId}
                    onSelectProject={onSelectProject}
                    onToggleProjectPinned={onToggleProjectPinned}
                    onArchiveProject={onArchiveProject}
                    onRestoreProject={onRestoreProject}
                  />
                ))}
              </SidebarSection>
            )}
          </>
        )}
      </div>

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

function SidebarSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between px-2">
        <p className="text-[11px] font-semibold uppercase text-slate-500">{title}</p>
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function ProjectRow({
  project,
  isSelected,
  onSelectProject,
  onToggleProjectPinned,
  onArchiveProject,
  onRestoreProject,
}: {
  project: Project;
  isSelected: boolean;
  onSelectProject: (projectId: string) => void;
  onToggleProjectPinned: (projectId: string) => void;
  onArchiveProject: (projectId: string) => void;
  onRestoreProject: (projectId: string) => void;
}) {
  return (
    <div
      className={clsx(
        "group flex w-full items-center gap-1 rounded-md px-2 py-2 transition",
        isSelected ? "bg-[var(--color-selection)] text-[var(--color-ink)]" : "text-slate-700 hover:bg-[var(--color-surface-subtle)]",
      )}
    >
      <button
        type="button"
        onClick={() => onSelectProject(project.id)}
        aria-label={`Open ${project.title}`}
        aria-current={isSelected ? "page" : undefined}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <span
          className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
            accentClasses[project.accent],
          )}
        >
          {project.icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[13px] font-semibold">{project.title}</span>
            {project.isPinned && <Pin size={12} className="shrink-0 text-[var(--color-accent)]" />}
          </span>
          <span className="mt-0.5 block truncate text-[12px] text-[var(--color-muted)]">
            {project.tags.length > 0 ? project.tags.join(", ") : "No tags"}
          </span>
        </span>
      </button>
      {project.status === "active" && (
        <button
          type="button"
          aria-label={project.isPinned ? `Unpin ${project.title}` : `Pin ${project.title}`}
          title={project.isPinned ? "Unpin project" : "Pin project"}
          onClick={() => onToggleProjectPinned(project.id)}
          className={clsx(
            "hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)] lg:flex",
            isSelected ? "lg:opacity-100" : "lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
          )}
        >
          <Pin size={13} />
        </button>
      )}
      {project.status === "archived" ? (
        <button
          type="button"
          aria-label={`Restore ${project.title}`}
          title="Restore project"
          onClick={() => onRestoreProject(project.id)}
          className={clsx(
            "hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-[var(--color-surface)] hover:text-[var(--color-accent)] lg:flex",
            isSelected ? "lg:opacity-100" : "lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
          )}
        >
          <ArchiveRestore size={13} />
        </button>
      ) : (
        <button
          type="button"
          aria-label={`Archive ${project.title}`}
          title="Archive project"
          onClick={() => onArchiveProject(project.id)}
          className={clsx(
            "hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-[var(--color-surface)] hover:text-amber-700 lg:flex",
            isSelected ? "lg:opacity-100" : "lg:opacity-0 lg:group-focus-within:opacity-100 lg:group-hover:opacity-100",
          )}
        >
          <Archive size={13} />
        </button>
      )}
      <ChevronRight size={14} className="hidden shrink-0 text-slate-400 transition lg:block" />
    </div>
  );
}
