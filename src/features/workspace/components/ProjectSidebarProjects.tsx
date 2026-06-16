import { Archive, ArchiveRestore, ChevronRight, Pin } from "lucide-react";
import { clsx } from "clsx";
import { useMemo } from "react";
import type { ReactNode } from "react";
import type { Project, ProjectId } from "../../../domain/workspace";
import { accentClasses } from "../workspaceConstants";

interface ProjectSidebarProjectListProps {
  projects: Project[];
  searchQuery: string;
  selectedProjectId: ProjectId | null;
  onSelectProject: (projectId: ProjectId) => void;
  onToggleProjectPinned: (projectId: ProjectId) => void;
  onArchiveProject: (projectId: ProjectId) => void;
  onRestoreProject: (projectId: ProjectId) => void;
}

interface SidebarProjectGroups {
  archivedProjects: Project[];
  pinnedProjects: Project[];
  unpinnedProjects: Project[];
  visibleProjects: Project[];
}

export function ProjectSidebarProjectList({
  projects,
  searchQuery,
  selectedProjectId,
  onSelectProject,
  onToggleProjectPinned,
  onArchiveProject,
  onRestoreProject,
}: ProjectSidebarProjectListProps) {
  const { archivedProjects, pinnedProjects, unpinnedProjects, visibleProjects } = useMemo(
    () => getSidebarProjectGroups(projects, searchQuery),
    [projects, searchQuery],
  );

  return (
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
          {pinnedProjects.length > 0 && (
            <SidebarSection title="Pinned">
              {pinnedProjects.map((project) => (
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

          {unpinnedProjects.length > 0 && (
            <SidebarSection title="Projects">
              {unpinnedProjects.map((project) => (
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
  );
}

function getSidebarProjectGroups(projects: Project[], searchQuery: string): SidebarProjectGroups {
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const visibleProjects = normalizedSearchQuery
    ? projects.filter((project) => projectMatchesSearch(project, normalizedSearchQuery))
    : projects;
  const pinnedProjects: Project[] = [];
  const unpinnedProjects: Project[] = [];
  const archivedProjects: Project[] = [];

  for (const project of visibleProjects) {
    if (project.status === "archived") {
      archivedProjects.push(project);
    } else if (project.isPinned) {
      pinnedProjects.push(project);
    } else {
      unpinnedProjects.push(project);
    }
  }

  return {
    archivedProjects,
    pinnedProjects,
    unpinnedProjects,
    visibleProjects,
  };
}

function projectMatchesSearch(project: Project, normalizedSearchQuery: string): boolean {
  return [project.title, project.description, ...project.tags].some((value) =>
    value.toLowerCase().includes(normalizedSearchQuery),
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
  onSelectProject: (projectId: ProjectId) => void;
  onToggleProjectPinned: (projectId: ProjectId) => void;
  onArchiveProject: (projectId: ProjectId) => void;
  onRestoreProject: (projectId: ProjectId) => void;
}) {
  return (
    <div
      className={clsx(
        "group flex w-full items-center gap-1 rounded-md px-2 py-2 transition",
        isSelected
          ? "bg-[var(--color-selection)] text-[var(--color-ink)]"
          : "text-slate-700 hover:bg-[var(--color-surface-subtle)]",
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
