import { describe, expect, it } from "vitest";
import type { WorkspaceSnapshot } from "../../domain/workspace";
import { toIsoDateTimeString, toNoteId, toProjectId, toTimelineEventId } from "../../domain/workspaceValues";
import { buildWorkspaceSaveStatements, getWorkspaceStatementBindCount } from "./workspaceSaveStatements";

const timestamp = toIsoDateTimeString("2026-05-15T00:00:00.000Z");
const projectId = toProjectId("project-1");

function createMinimalWorkspace(): WorkspaceSnapshot {
  return {
    projects: [
      {
        id: projectId,
        title: "Retina Organoid",
        description: "Long-running research workspace.",
        createdAt: timestamp,
        updatedAt: timestamp,
        tags: ["research"],
        status: "active",
        isPinned: true,
        accent: "teal",
        icon: "R",
      },
    ],
    notes: [
      {
        id: toNoteId("note-1"),
        projectId,
        title: "Culture protocol",
        folder: "Experiments",
        content: "Prepare media and document timing.",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ],
    tasks: [],
    sessions: [],
    references: [],
    files: [],
    timelineEvents: [
      {
        id: toTimelineEventId("event-1"),
        projectId,
        type: "project_created",
        title: "Project created",
        description: "Workspace initialized.",
        createdAt: timestamp,
      },
    ],
  };
}

describe("workspace save statements", () => {
  it("uses closed statement kinds instead of sending raw SQL through Tauri payloads", () => {
    const statements = buildWorkspaceSaveStatements(createMinimalWorkspace());

    expect(statements.map((statement) => statement.kind)).toEqual([
      "delete_timeline_events",
      "delete_files",
      "delete_references",
      "delete_tasks",
      "delete_notes",
      "delete_sessions",
      "delete_projects",
      "insert_project",
      "insert_note",
      "insert_timeline_event",
    ]);
    expect(statements.every((statement) => !("query" in statement))).toBe(true);
  });

  it("keeps statement bind counts beside the statement kind contract", () => {
    const statements = buildWorkspaceSaveStatements(createMinimalWorkspace());

    expect(getWorkspaceStatementBindCount("delete_projects")).toBe(0);
    expect(getWorkspaceStatementBindCount("insert_project")).toBe(10);
    expect(
      statements.every(
        (statement) => (statement.values?.length ?? 0) === getWorkspaceStatementBindCount(statement.kind),
      ),
    ).toBe(true);
  });
});
