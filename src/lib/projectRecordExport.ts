import type {
  Note,
  Project,
  ReferenceRecord,
  Task,
  TimelineEvent,
  WorkSession,
  WorkspaceFile,
  WorkspaceSnapshot,
} from "../domain/workspace";
import { getElapsedMinutes } from "./date";

export interface ProjectRecordSnapshot {
  project: Project;
  notes: Note[];
  tasks: Task[];
  sessions: WorkSession[];
  references: ReferenceRecord[];
  files: WorkspaceFile[];
  timelineEvents: TimelineEvent[];
}

export function getProjectRecordSnapshot(snapshot: WorkspaceSnapshot, projectId: string): ProjectRecordSnapshot | null {
  const project = snapshot.projects.find((candidateProject) => candidateProject.id === projectId);

  if (!project) {
    return null;
  }

  return {
    project,
    notes: snapshot.notes.filter((note) => note.projectId === projectId),
    tasks: snapshot.tasks.filter((task) => task.projectId === projectId),
    sessions: snapshot.sessions.filter((session) => session.projectId === projectId),
    references: snapshot.references.filter((reference) => reference.projectId === projectId),
    files: snapshot.files.filter((file) => file.projectId === projectId),
    timelineEvents: snapshot.timelineEvents.filter((event) => event.projectId === projectId),
  };
}

export function buildProjectRecordMarkdown(record: ProjectRecordSnapshot): string {
  const { project, notes, tasks, sessions, references, files, timelineEvents } = record;
  const taskLines = tasks.map((task) => `- [${task.status === "done" ? "x" : " "}] ${task.title} (${task.priority})`);
  const sessionLines = sessions.map((session) => {
    const duration = session.durationMinutes ?? getElapsedMinutes(session.startedAt, session.endedAt);

    return `- ${session.title}: ${duration} minutes`;
  });
  const referenceLines = references.map((reference) => `- ${reference.title} (${reference.type}) - ${reference.source}`);
  const fileLines = files.map((file) => `- ${file.name} (${file.fileType}, ${file.sizeLabel}, ${file.storageMode})`);
  const timelineLines = timelineEvents.map((event) => `- ${event.title}: ${event.description}`);
  const noteSections = notes.map((note) => `### ${note.title}\n\n${note.content || "_No content recorded._"}`);

  return [
    `# ${project.title}`,
    "",
    project.description || "_No summary recorded._",
    "",
    `Tags: ${project.tags.length > 0 ? project.tags.join(", ") : "None"}`,
    "",
    "## Tasks",
    taskLines.join("\n") || "No tasks recorded.",
    "",
    "## Sessions",
    sessionLines.join("\n") || "No sessions recorded.",
    "",
    "## References",
    referenceLines.join("\n") || "No references recorded.",
    "",
    "## Files",
    fileLines.join("\n") || "No files imported.",
    "",
    "## Timeline",
    timelineLines.join("\n") || "No timeline events recorded.",
    "",
    "## Notes",
    noteSections.join("\n\n---\n\n") || "No notes recorded.",
  ].join("\n");
}

export function buildProjectRecordJson(record: ProjectRecordSnapshot): string {
  return JSON.stringify(record, null, 2);
}
