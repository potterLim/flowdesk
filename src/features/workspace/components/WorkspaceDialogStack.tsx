import type {
  IsoDateTimeString,
  NoteId,
  Project,
  ProjectId,
  TaskId,
  WorkspaceSnapshot,
} from "../../../domain/workspace";
import type { CreateProjectInput, CreateTaskInput, UpdateProjectInput } from "../../../stores/workspaceStore";
import type { CommandPaletteItem } from "./CommandPalette";
import { CommandPalette } from "./CommandPalette";
import { ConfirmDialog } from "./dialogs/ConfirmDialog";
import { CreateProjectDialog } from "./dialogs/CreateProjectDialog";
import { CreateTaskDialog } from "./dialogs/CreateTaskDialog";
import { ProjectSettingsDialog } from "./dialogs/ProjectSettingsDialog";
import { WorkspaceSettingsDialog } from "./dialogs/WorkspaceSettingsDialog";
import type { DiagnosticsExportState, ThemeMode, WorkspaceBackupState } from "../workspaceTypes";
import type { PersistenceStatus } from "../../../stores/workspaceStore";
import type { WorkspacePersistenceMode } from "../../../lib/persistence/workspaceRepository";

interface WorkspaceDialogStackProps {
  commandPaletteItems: CommandPaletteItem[];
  diagnosticsExportState: DiagnosticsExportState | null;
  isCommandPaletteOpen: boolean;
  isCreateProjectDialogOpen: boolean;
  isCreateTaskDialogOpen: boolean;
  isProjectSettingsOpen: boolean;
  isStorageRepairConfirmOpen: boolean;
  isWorkspaceSettingsOpen: boolean;
  lastPersistedAt: IsoDateTimeString | null;
  pendingNoteDeleteId: NoteId | null;
  pendingProjectDeleteId: ProjectId | null;
  pendingTaskDeleteId: TaskId | null;
  pendingWorkspaceRestore: WorkspaceSnapshot | null;
  persistenceError: string | null;
  persistenceMode: WorkspacePersistenceMode;
  persistenceStatus: PersistenceStatus;
  selectedProject: Project | undefined;
  themeMode: ThemeMode;
  workspaceBackupState: WorkspaceBackupState | null;
  onCancelNoteDelete: () => void;
  onCancelProjectDelete: () => void;
  onCancelStorageRepair: () => void;
  onCancelTaskDelete: () => void;
  onCancelWorkspaceRestore: () => void;
  onChangeTheme: (themeMode: ThemeMode) => void;
  onCloseCommandPalette: () => void;
  onCloseCreateProject: () => void;
  onCloseCreateTask: () => void;
  onCloseProjectSettings: () => void;
  onCloseWorkspaceSettings: () => void;
  onConfirmNoteDelete: () => void;
  onConfirmProjectDelete: () => void | Promise<void>;
  onConfirmStorageRepair: () => void;
  onConfirmTaskDelete: () => void;
  onConfirmWorkspaceRestore: () => void;
  onCreateProject: (input: CreateProjectInput) => void;
  onCreateTask: (input: CreateTaskInput) => void;
  onExportDiagnostics: () => void;
  onRequestProjectDelete: () => void;
  onRequestStorageRepair: () => void;
  onSaveWorkspaceBackup: () => void;
  onSelectWorkspaceBackup: () => void;
  onUpdateProject: (input: UpdateProjectInput) => void;
}

export function WorkspaceDialogStack({
  commandPaletteItems,
  diagnosticsExportState,
  isCommandPaletteOpen,
  isCreateProjectDialogOpen,
  isCreateTaskDialogOpen,
  isProjectSettingsOpen,
  isStorageRepairConfirmOpen,
  isWorkspaceSettingsOpen,
  lastPersistedAt,
  pendingNoteDeleteId,
  pendingProjectDeleteId,
  pendingTaskDeleteId,
  pendingWorkspaceRestore,
  persistenceError,
  persistenceMode,
  persistenceStatus,
  selectedProject,
  themeMode,
  workspaceBackupState,
  onCancelNoteDelete,
  onCancelProjectDelete,
  onCancelStorageRepair,
  onCancelTaskDelete,
  onCancelWorkspaceRestore,
  onChangeTheme,
  onCloseCommandPalette,
  onCloseCreateProject,
  onCloseCreateTask,
  onCloseProjectSettings,
  onCloseWorkspaceSettings,
  onConfirmNoteDelete,
  onConfirmProjectDelete,
  onConfirmStorageRepair,
  onConfirmTaskDelete,
  onConfirmWorkspaceRestore,
  onCreateProject,
  onCreateTask,
  onExportDiagnostics,
  onRequestProjectDelete,
  onRequestStorageRepair,
  onSaveWorkspaceBackup,
  onSelectWorkspaceBackup,
  onUpdateProject,
}: WorkspaceDialogStackProps) {
  return (
    <>
      <CreateProjectDialog
        isOpen={isCreateProjectDialogOpen}
        onClose={onCloseCreateProject}
        onCreateProject={onCreateProject}
      />
      <CreateTaskDialog isOpen={isCreateTaskDialogOpen} onClose={onCloseCreateTask} onCreateTask={onCreateTask} />
      <WorkspaceSettingsDialog
        isOpen={isWorkspaceSettingsOpen}
        themeMode={themeMode}
        persistenceMode={persistenceMode}
        persistenceStatus={persistenceStatus}
        persistenceError={persistenceError}
        lastPersistedAt={lastPersistedAt}
        workspaceBackupState={workspaceBackupState}
        diagnosticsExportState={diagnosticsExportState}
        onChangeTheme={onChangeTheme}
        onSaveWorkspaceBackup={onSaveWorkspaceBackup}
        onSelectWorkspaceBackup={onSelectWorkspaceBackup}
        onExportDiagnostics={onExportDiagnostics}
        onRequestRepair={onRequestStorageRepair}
        onClose={onCloseWorkspaceSettings}
      />
      {selectedProject && (
        <ProjectSettingsDialog
          project={selectedProject}
          isOpen={isProjectSettingsOpen}
          onClose={onCloseProjectSettings}
          onUpdateProject={onUpdateProject}
          onRequestDelete={onRequestProjectDelete}
        />
      )}
      <ConfirmDialog
        isOpen={pendingProjectDeleteId !== null}
        title="Delete Project"
        detail="This permanently removes the project and every attached note, task, session, timeline event, and local record from FlowDesk."
        confirmLabel="Delete Project"
        onCancel={onCancelProjectDelete}
        onConfirm={onConfirmProjectDelete}
      />
      <ConfirmDialog
        isOpen={pendingNoteDeleteId !== null}
        title="Delete Note"
        detail="This permanently removes the selected note from the project record."
        confirmLabel="Delete Note"
        onCancel={onCancelNoteDelete}
        onConfirm={onConfirmNoteDelete}
      />
      <ConfirmDialog
        isOpen={pendingTaskDeleteId !== null}
        title="Delete Task"
        detail="This permanently removes the task from the project record."
        confirmLabel="Delete Task"
        onCancel={onCancelTaskDelete}
        onConfirm={onConfirmTaskDelete}
      />
      <ConfirmDialog
        isOpen={pendingWorkspaceRestore !== null}
        title="Restore Workspace Backup"
        detail={`FlowDesk will replace the current local workspace with ${pendingWorkspaceRestore?.projects.length ?? 0} projects from the selected backup. Save a fresh backup first if you need to keep the current workspace.`}
        confirmLabel="Restore Backup"
        variant="warning"
        onCancel={onCancelWorkspaceRestore}
        onConfirm={onConfirmWorkspaceRestore}
      />
      <ConfirmDialog
        isOpen={isStorageRepairConfirmOpen}
        title="Repair Local Storage"
        detail="FlowDesk will move the current storage files into a recovery folder and open a clean local workspace. Managed files and saved backups are left in place."
        confirmLabel="Repair Storage"
        variant="warning"
        onCancel={onCancelStorageRepair}
        onConfirm={onConfirmStorageRepair}
      />
      <CommandPalette isOpen={isCommandPaletteOpen} commands={commandPaletteItems} onClose={onCloseCommandPalette} />
    </>
  );
}
