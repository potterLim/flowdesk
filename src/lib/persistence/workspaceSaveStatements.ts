import type { WorkspaceSnapshot } from "../../domain/workspace";
import type { SqliteBindValue, SqliteStatement, WorkspaceStatementKind } from "./workspaceRepositoryTypes";

interface WorkspaceStatementSpec {
  bindCount: number;
}

const workspaceStatementSpecs = {
  delete_timeline_events: {
    bindCount: 0,
  },
  delete_files: {
    bindCount: 0,
  },
  delete_references: {
    bindCount: 0,
  },
  delete_tasks: {
    bindCount: 0,
  },
  delete_notes: {
    bindCount: 0,
  },
  delete_sessions: {
    bindCount: 0,
  },
  delete_projects: {
    bindCount: 0,
  },
  insert_project: {
    bindCount: 10,
  },
  insert_session: {
    bindCount: 7,
  },
  insert_note: {
    bindCount: 7,
  },
  insert_task: {
    bindCount: 10,
  },
  insert_reference: {
    bindCount: 8,
  },
  insert_file: {
    bindCount: 10,
  },
  insert_timeline_event: {
    bindCount: 6,
  },
} as const satisfies Record<WorkspaceStatementKind, WorkspaceStatementSpec>;

export function getWorkspaceStatementBindCount(kind: WorkspaceStatementKind): number {
  return workspaceStatementSpecs[kind].bindCount;
}

export function buildWorkspaceSaveStatements(snapshot: WorkspaceSnapshot): SqliteStatement[] {
  const statements: SqliteStatement[] = [
    createWorkspaceStatement("delete_timeline_events"),
    createWorkspaceStatement("delete_files"),
    createWorkspaceStatement("delete_references"),
    createWorkspaceStatement("delete_tasks"),
    createWorkspaceStatement("delete_notes"),
    createWorkspaceStatement("delete_sessions"),
    createWorkspaceStatement("delete_projects"),
  ];

  for (const project of snapshot.projects) {
    statements.push(
      createWorkspaceStatement("insert_project", [
        project.id,
        project.title,
        project.description,
        project.createdAt,
        project.updatedAt,
        JSON.stringify(project.tags),
        project.status,
        project.isPinned ? 1 : 0,
        project.accent,
        project.icon,
      ]),
    );
  }

  for (const session of snapshot.sessions) {
    statements.push(
      createWorkspaceStatement("insert_session", [
        session.id,
        session.projectId,
        session.title,
        session.notes,
        session.startedAt,
        session.endedAt,
        session.durationMinutes,
      ]),
    );
  }

  for (const note of snapshot.notes) {
    statements.push(
      createWorkspaceStatement("insert_note", [
        note.id,
        note.projectId,
        note.title,
        note.folder,
        note.content,
        note.createdAt,
        note.updatedAt,
      ]),
    );
  }

  for (const task of snapshot.tasks) {
    statements.push(
      createWorkspaceStatement("insert_task", [
        task.id,
        task.projectId,
        task.title,
        task.status,
        task.priority,
        task.dueDate,
        JSON.stringify(task.tags),
        task.linkedSessionId,
        task.createdAt,
        task.updatedAt,
      ]),
    );
  }

  for (const reference of snapshot.references) {
    statements.push(
      createWorkspaceStatement("insert_reference", [
        reference.id,
        reference.projectId,
        reference.title,
        reference.type,
        reference.source,
        reference.summary,
        JSON.stringify(reference.tags),
        reference.createdAt,
      ]),
    );
  }

  for (const file of snapshot.files) {
    statements.push(
      createWorkspaceStatement("insert_file", [
        file.id,
        file.projectId,
        file.name,
        file.fileType,
        file.sizeLabel,
        file.path,
        file.sourcePath,
        file.storageMode,
        JSON.stringify(file.tags),
        file.importedAt,
      ]),
    );
  }

  for (const event of snapshot.timelineEvents) {
    statements.push(
      createWorkspaceStatement("insert_timeline_event", [
        event.id,
        event.projectId,
        event.type,
        event.title,
        event.description,
        event.createdAt,
      ]),
    );
  }

  return statements;
}

function createWorkspaceStatement(kind: WorkspaceStatementKind, values: SqliteBindValue[] = []): SqliteStatement {
  const expectedBindCount = getWorkspaceStatementBindCount(kind);

  if (values.length !== expectedBindCount) {
    throw new Error(`FlowDesk expected ${expectedBindCount} bind values for ${kind}.`);
  }

  return values.length > 0 ? { kind, values } : { kind };
}
