import {
  Database,
  Download,
  ListChecks,
  NotebookText,
  Pin,
  Play,
  Plus,
  Search,
  Settings2,
  Square,
  Upload,
} from "lucide-react";
import type { ProjectId, WorkspaceView } from "../../../domain/workspace";
import type { CommandPaletteItem } from "../components/CommandPalette";
import { viewItems } from "../workspaceConstants";

export interface WorkspaceCommandItemInput {
  canEditProject: boolean;
  hasActiveSession: boolean;
  selectedProjectId: ProjectId | null;
  selectedProjectTitle: string | null;
  isSelectedProjectPinned: boolean;
  onCreateNote: () => void;
  onEndSession: () => void;
  onExportDiagnostics: () => void;
  onFocusProjectSearch: () => void;
  onImportFiles: () => void;
  onOpenCreateProject: () => void;
  onOpenCreateTask: () => void;
  onOpenProjectSettings: () => void;
  onOpenWorkspaceSettings: () => void;
  onPrepareMarkdownExport: () => void;
  onRestoreWorkspaceBackup: () => void;
  onSaveWorkspaceBackup: () => void;
  onSelectView: (view: WorkspaceView) => void;
  onStartSession: () => void;
  onToggleProjectPinned: (projectId: ProjectId) => void;
}

export function buildWorkspaceCommandItems({
  canEditProject,
  hasActiveSession,
  selectedProjectId,
  selectedProjectTitle,
  isSelectedProjectPinned,
  onCreateNote,
  onEndSession,
  onExportDiagnostics,
  onFocusProjectSearch,
  onImportFiles,
  onOpenCreateProject,
  onOpenCreateTask,
  onOpenProjectSettings,
  onOpenWorkspaceSettings,
  onPrepareMarkdownExport,
  onRestoreWorkspaceBackup,
  onSaveWorkspaceBackup,
  onSelectView,
  onStartSession,
  onToggleProjectPinned,
}: WorkspaceCommandItemInput): CommandPaletteItem[] {
  const hasSelectedProject = Boolean(selectedProjectId);
  const selectedProjectDetail = selectedProjectTitle ?? "Select a project first";

  return [
    {
      id: "workspace-settings",
      label: "Workspace Settings",
      detail: "Appearance, backups, and local storage",
      shortcut: "Command/Ctrl+,",
      icon: Settings2,
      onSelect: onOpenWorkspaceSettings,
    },
    {
      id: "new-project",
      label: "New Project",
      detail: "Create a new workspace project",
      shortcut: "Command/Ctrl+Shift+N",
      icon: Plus,
      onSelect: onOpenCreateProject,
    },
    {
      id: "new-note",
      label: "New Note",
      detail: selectedProjectDetail,
      shortcut: "Command/Ctrl+N",
      icon: NotebookText,
      isDisabled: !hasSelectedProject || !canEditProject,
      onSelect: onCreateNote,
    },
    {
      id: "new-task",
      label: "New Task",
      detail: selectedProjectDetail,
      shortcut: "Command/Ctrl+Shift+T",
      icon: ListChecks,
      isDisabled: !hasSelectedProject || !canEditProject,
      onSelect: onOpenCreateTask,
    },
    {
      id: "import-files",
      label: "Import Files",
      detail: selectedProjectDetail,
      shortcut: "Command/Ctrl+Shift+I",
      icon: Upload,
      isDisabled: !hasSelectedProject || !canEditProject,
      onSelect: onImportFiles,
    },
    {
      id: "toggle-session",
      label: hasActiveSession ? "End Session" : "Start Session",
      detail: hasSelectedProject ? "Track actual work time" : "Select a project first",
      shortcut: "Command/Ctrl+Enter",
      icon: hasActiveSession ? Square : Play,
      isDisabled: !hasSelectedProject || !canEditProject,
      onSelect: hasActiveSession ? onEndSession : onStartSession,
    },
    {
      id: "export-markdown",
      label: "Export Markdown",
      detail: hasSelectedProject ? "Prepare a portable project record" : "Select a project first",
      shortcut: "Command/Ctrl+E",
      icon: Download,
      isDisabled: !hasSelectedProject,
      onSelect: onPrepareMarkdownExport,
    },
    {
      id: "save-workspace-backup",
      label: "Back Up Workspace",
      detail: "Save a complete workspace backup",
      icon: Database,
      onSelect: onSaveWorkspaceBackup,
    },
    {
      id: "restore-workspace-backup",
      label: "Restore Backup",
      detail: "Review a backup before replacing local data",
      icon: Upload,
      onSelect: onRestoreWorkspaceBackup,
    },
    {
      id: "export-diagnostics",
      label: "Export Diagnostics",
      detail: "Save local paths, DB health, and app build details",
      icon: Database,
      onSelect: onExportDiagnostics,
    },
    {
      id: "project-settings",
      label: "Project Settings",
      detail: selectedProjectDetail,
      icon: Settings2,
      isDisabled: !hasSelectedProject,
      onSelect: onOpenProjectSettings,
    },
    {
      id: "toggle-project-pin",
      label: isSelectedProjectPinned ? "Unpin Project" : "Pin Project",
      detail: selectedProjectDetail,
      icon: Pin,
      isDisabled: !hasSelectedProject,
      onSelect: () => {
        if (selectedProjectId) {
          onToggleProjectPinned(selectedProjectId);
        }
      },
    },
    {
      id: "search-projects",
      label: "Search Projects",
      detail: "Focus the project list search",
      shortcut: "Command/Ctrl+K",
      icon: Search,
      onSelect: onFocusProjectSearch,
    },
    ...viewItems.map((item, index) => ({
      id: `view-${item.id}`,
      label: item.label,
      detail: hasSelectedProject ? `Open ${item.label} view` : "Select a project first",
      shortcut: `Command/Ctrl+${index + 1}`,
      icon: item.icon,
      isDisabled: !hasSelectedProject,
      onSelect: () => onSelectView(item.id),
    })),
  ];
}
