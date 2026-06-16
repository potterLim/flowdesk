import type {
  Note,
  NoteId,
  Project,
  ProjectId,
  Task,
  TimelineEvent,
  WorkSession,
  WorkspaceFile,
  WorkspaceSnapshot,
} from "../../../domain/workspace";

interface WorkspaceModelData extends WorkspaceSnapshot {
  selectedNoteId: NoteId | null;
  selectedProjectId: ProjectId | null;
}

interface ProjectRecordCollections {
  files: WorkspaceFile[];
  notes: Note[];
  sessions: WorkSession[];
  tasks: Task[];
  timelineEvents: TimelineEvent[];
}

export interface WorkspaceModelDerivations {
  activeSession: WorkSession | undefined;
  canEditProject: boolean;
  projectFiles: WorkspaceFile[];
  projectNotes: Note[];
  projectSessions: WorkSession[];
  projectTasks: Task[];
  projectTimelineEvents: TimelineEvent[];
  selectedNote: Note | undefined;
  selectedProject: Project | undefined;
  workspaceSnapshot: WorkspaceSnapshot;
}

export function deriveWorkspaceModelData({
  files,
  notes,
  projects,
  references,
  selectedNoteId,
  selectedProjectId,
  sessions,
  tasks,
  timelineEvents,
}: WorkspaceModelData): WorkspaceModelDerivations {
  const selectedProject = projects.find((project) => project.id === selectedProjectId);
  const resolvedProjectId = selectedProject?.id ?? null;
  const projectRecords = collectProjectRecords(
    {
      files,
      notes,
      sessions,
      tasks,
      timelineEvents,
    },
    resolvedProjectId,
  );
  const selectedNote =
    resolvedProjectId !== null
      ? (projectRecords.notes.find((note) => note.id === selectedNoteId) ?? projectRecords.notes[0])
      : undefined;

  return {
    activeSession: projectRecords.sessions.find((session) => session.endedAt === null),
    canEditProject: selectedProject?.status === "active",
    projectFiles: projectRecords.files,
    projectNotes: projectRecords.notes,
    projectSessions: projectRecords.sessions,
    projectTasks: projectRecords.tasks,
    projectTimelineEvents: projectRecords.timelineEvents,
    selectedNote,
    selectedProject,
    workspaceSnapshot: {
      files,
      notes,
      projects,
      references,
      sessions,
      tasks,
      timelineEvents,
    },
  };
}

function collectProjectRecords(
  records: ProjectRecordCollections,
  projectId: ProjectId | null,
): ProjectRecordCollections {
  if (projectId === null) {
    return {
      files: [],
      notes: [],
      sessions: [],
      tasks: [],
      timelineEvents: [],
    };
  }

  return {
    files: collectRecordsForProject(records.files, projectId),
    notes: collectRecordsForProject(records.notes, projectId),
    sessions: collectRecordsForProject(records.sessions, projectId),
    tasks: collectRecordsForProject(records.tasks, projectId),
    timelineEvents: collectRecordsForProject(records.timelineEvents, projectId),
  };
}

function collectRecordsForProject<ProjectScopedRecord extends { projectId: ProjectId }>(
  records: ProjectScopedRecord[],
  projectId: ProjectId,
): ProjectScopedRecord[] {
  return records.filter((record) => record.projectId === projectId);
}
