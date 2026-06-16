import { describe, expect, it } from "vitest";
import type { WorkspaceSnapshot } from "../../domain/workspace";
import {
  toIsoDateTimeString,
  toNoteId,
  toProjectId,
  toReferenceId,
  toTaskId,
  toTimelineEventId,
  toWorkSessionId,
  toWorkspaceFileId,
  toWorkspaceFilePath,
} from "../../domain/workspaceValues";
import { readWorkspaceBackup } from "../backup/workspaceBackup";
import {
  buildProjectRecordJson,
  buildProjectRecordMarkdown,
  getProjectRecordSnapshot,
  type ProjectRecordSnapshot,
} from "./projectRecordExport";

const runtimeProcess = (globalThis as { process?: { platform?: string } }).process;
const fixturePathSeparator = runtimeProcess?.platform === "win32" ? "\\" : "/";
const fixtureProjectAccents = ["teal", "blue", "violet", "amber", "rose"] as const;
const fixtureTaskStatuses = ["todo", "in_progress", "done", "archived"] as const;
const fixtureTaskPriorities = ["low", "medium", "high", "urgent"] as const;
const fixtureReferenceTypes = ["paper", "website", "video", "documentation", "book"] as const;
const fixtureTimelineEventTypes = [
  "note_created",
  "task_completed",
  "session_finished",
  "file_imported",
  "export_generated",
] as const;

function createFixturePath(...segments: string[]) {
  return toWorkspaceFilePath(segments.join(fixturePathSeparator));
}

function selectFixtureValue<const Value>(values: readonly Value[], index: number): Value {
  const value = values[index % values.length];

  if (value === undefined) {
    throw new Error("FlowDesk expected a non-empty fixture value list.");
  }

  return value;
}

function createStressWorkspace(): WorkspaceSnapshot {
  const now = toIsoDateTimeString("2026-05-15T00:00:00.000Z");
  const endedAt = toIsoDateTimeString("2026-05-15T00:45:00.000Z");
  const projects = Array.from({ length: 12 }, (_, projectIndex) => ({
    id: toProjectId(`project-${projectIndex}`),
    title: `Research Program ${projectIndex + 1}`,
    description: `Long-running workspace stress fixture ${projectIndex + 1}`,
    createdAt: now,
    updatedAt: now,
    tags: ["research", "stress", `program-${projectIndex + 1}`],
    status: "active" as const,
    isPinned: projectIndex < 2,
    accent: selectFixtureValue(fixtureProjectAccents, projectIndex),
    icon: `P${projectIndex}`,
  }));

  return {
    projects,
    notes: projects.flatMap((project) =>
      Array.from({ length: 42 }, (_, noteIndex) => ({
        id: toNoteId(`${project.id}-note-${noteIndex}`),
        projectId: project.id,
        title: `Experiment note ${noteIndex + 1}`,
        folder: noteIndex % 3 === 0 ? "Experiments" : "Reading",
        content: `# Observation ${noteIndex + 1}\n\n- Signal quality: ${noteIndex % 5}\n- Follow-up: repeat import/export.`,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    tasks: projects.flatMap((project) =>
      Array.from({ length: 64 }, (_, taskIndex) => ({
        id: toTaskId(`${project.id}-task-${taskIndex}`),
        projectId: project.id,
        title: `Validate workflow ${taskIndex + 1}`,
        status: selectFixtureValue(fixtureTaskStatuses, taskIndex),
        priority: selectFixtureValue(fixtureTaskPriorities, taskIndex),
        dueDate: null,
        tags: ["qa", `batch-${taskIndex % 8}`],
        linkedSessionId: null,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    sessions: projects.flatMap((project) =>
      Array.from({ length: 28 }, (_, sessionIndex) => ({
        id: toWorkSessionId(`${project.id}-session-${sessionIndex}`),
        projectId: project.id,
        title: `Focus block ${sessionIndex + 1}`,
        notes: "Repeated desktop workflow validation.",
        startedAt: now,
        endedAt,
        durationMinutes: 45,
      })),
    ),
    references: projects.flatMap((project) =>
      Array.from({ length: 18 }, (_, referenceIndex) => ({
        id: toReferenceId(`${project.id}-reference-${referenceIndex}`),
        projectId: project.id,
        title: `Reference ${referenceIndex + 1}`,
        type: selectFixtureValue(fixtureReferenceTypes, referenceIndex),
        source: `https://example.test/reference/${referenceIndex + 1}`,
        summary: "Stress fixture reference.",
        tags: ["source"],
        createdAt: now,
      })),
    ),
    files: projects.flatMap((project) =>
      Array.from({ length: 36 }, (_, fileIndex) => ({
        id: toWorkspaceFileId(`${project.id}-file-${fileIndex}`),
        projectId: project.id,
        name: `dataset-${fileIndex + 1}.csv`,
        fileType: "csv" as const,
        sizeLabel: `${fileIndex + 1}.0 MB`,
        path: createFixturePath("flowdesk-stress", `dataset-${fileIndex + 1}.csv`),
        sourcePath: createFixturePath("import-source", `dataset-${fileIndex + 1}.csv`),
        storageMode: "managed" as const,
        tags: ["dataset"],
        importedAt: now,
      })),
    ),
    timelineEvents: projects.flatMap((project) =>
      Array.from({ length: 90 }, (_, eventIndex) => ({
        id: toTimelineEventId(`${project.id}-event-${eventIndex}`),
        projectId: project.id,
        type: selectFixtureValue(fixtureTimelineEventTypes, eventIndex),
        title: `Timeline event ${eventIndex + 1}`,
        description: "Long-term project history entry.",
        createdAt: now,
      })),
    ),
  };
}

function requireProjectRecord(record: ProjectRecordSnapshot | null): ProjectRecordSnapshot {
  if (!record) {
    throw new Error("FlowDesk expected the stress workspace project record to exist.");
  }

  return record;
}

function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readArrayFieldLength(value: Record<string, unknown>, fieldName: "files" | "notes" | "tasks"): number {
  const fieldValue = value[fieldName];

  if (!Array.isArray(fieldValue)) {
    throw new Error(`FlowDesk expected project record field "${fieldName}" to be an array.`);
  }

  return fieldValue.length;
}

function readProjectRecordCollectionCounts(value: unknown) {
  if (!isRecordObject(value)) {
    throw new Error("FlowDesk expected project record JSON to parse into an object.");
  }

  return {
    files: readArrayFieldLength(value, "files"),
    notes: readArrayFieldLength(value, "notes"),
    tasks: readArrayFieldLength(value, "tasks"),
  };
}

describe("project record export stress", () => {
  it("round-trips large backups and repeated project exports without dropping records", () => {
    const snapshot = createStressWorkspace();
    const serializedBackup = JSON.stringify(snapshot);

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const restoredBackup = readWorkspaceBackup(serializedBackup);

      expect(restoredBackup.projects).toHaveLength(12);
      expect(restoredBackup.files).toHaveLength(432);
      expect(restoredBackup.timelineEvents).toHaveLength(1080);
    }

    const record = requireProjectRecord(getProjectRecordSnapshot(snapshot, toProjectId("project-6")));

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const markdown = buildProjectRecordMarkdown(record);
      const json = buildProjectRecordJson(record);
      const parsed: unknown = JSON.parse(json);
      const collectionCounts = readProjectRecordCollectionCounts(parsed);

      expect(markdown).toContain("# Research Program 7");
      expect(markdown).toContain("## References");
      expect(markdown).toContain("## Timeline");
      expect(collectionCounts.notes).toBe(42);
      expect(collectionCounts.tasks).toBe(64);
      expect(collectionCounts.files).toBe(36);
    }
  });
});
