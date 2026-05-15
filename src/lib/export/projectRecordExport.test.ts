import { describe, expect, it } from "vitest";
import type { WorkspaceSnapshot } from "../../domain/workspace";
import { readWorkspaceBackup } from "../backup/workspaceBackup";
import {
  buildProjectRecordJson,
  buildProjectRecordMarkdown,
  getProjectRecordSnapshot,
} from "./projectRecordExport";

function createStressWorkspace(): WorkspaceSnapshot {
  const now = "2026-05-15T00:00:00.000Z";
  const projects = Array.from({ length: 12 }, (_, projectIndex) => ({
    id: `project-${projectIndex}`,
    title: `Research Program ${projectIndex + 1}`,
    description: `Long-running workspace stress fixture ${projectIndex + 1}`,
    createdAt: now,
    updatedAt: now,
    tags: ["research", "stress", `program-${projectIndex + 1}`],
    status: "active" as const,
    isPinned: projectIndex < 2,
    accent: (["teal", "blue", "violet", "amber", "rose"] as const)[projectIndex % 5],
    icon: `P${projectIndex}`,
  }));

  return {
    projects,
    notes: projects.flatMap((project) =>
      Array.from({ length: 42 }, (_, noteIndex) => ({
        id: `${project.id}-note-${noteIndex}`,
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
        id: `${project.id}-task-${taskIndex}`,
        projectId: project.id,
        title: `Validate workflow ${taskIndex + 1}`,
        status: (["todo", "in_progress", "done", "archived"] as const)[taskIndex % 4],
        priority: (["low", "medium", "high", "urgent"] as const)[taskIndex % 4],
        dueDate: null,
        tags: ["qa", `batch-${taskIndex % 8}`],
        linkedSessionId: null,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    sessions: projects.flatMap((project) =>
      Array.from({ length: 28 }, (_, sessionIndex) => ({
        id: `${project.id}-session-${sessionIndex}`,
        projectId: project.id,
        title: `Focus block ${sessionIndex + 1}`,
        notes: "Repeated desktop workflow validation.",
        startedAt: now,
        endedAt: "2026-05-15T00:45:00.000Z",
        durationMinutes: 45,
      })),
    ),
    references: projects.flatMap((project) =>
      Array.from({ length: 18 }, (_, referenceIndex) => ({
        id: `${project.id}-reference-${referenceIndex}`,
        projectId: project.id,
        title: `Reference ${referenceIndex + 1}`,
        type: (["paper", "website", "video", "documentation", "book"] as const)[referenceIndex % 5],
        source: `https://example.test/reference/${referenceIndex + 1}`,
        summary: "Stress fixture reference.",
        tags: ["source"],
        createdAt: now,
      })),
    ),
    files: projects.flatMap((project) =>
      Array.from({ length: 36 }, (_, fileIndex) => ({
        id: `${project.id}-file-${fileIndex}`,
        projectId: project.id,
        name: `dataset-${fileIndex + 1}.csv`,
        fileType: "csv" as const,
        sizeLabel: `${fileIndex + 1}.0 MB`,
        path: `/tmp/flowdesk-stress/dataset-${fileIndex + 1}.csv`,
        sourcePath: `/tmp/import-source/dataset-${fileIndex + 1}.csv`,
        storageMode: "managed" as const,
        tags: ["dataset"],
        importedAt: now,
      })),
    ),
    timelineEvents: projects.flatMap((project) =>
      Array.from({ length: 90 }, (_, eventIndex) => ({
        id: `${project.id}-event-${eventIndex}`,
        projectId: project.id,
        type: (["note_created", "task_completed", "session_finished", "file_imported", "export_generated"] as const)[
          eventIndex % 5
        ],
        title: `Timeline event ${eventIndex + 1}`,
        description: "Long-term project history entry.",
        createdAt: now,
      })),
    ),
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

    const record = getProjectRecordSnapshot(snapshot, "project-6");

    expect(record).not.toBeNull();

    for (let attempt = 0; attempt < 24; attempt += 1) {
      const markdown = buildProjectRecordMarkdown(record!);
      const json = buildProjectRecordJson(record!);
      const parsed = JSON.parse(json);

      expect(markdown).toContain("# Research Program 7");
      expect(markdown).toContain("## References");
      expect(markdown).toContain("## Timeline");
      expect(parsed.notes).toHaveLength(42);
      expect(parsed.tasks).toHaveLength(64);
      expect(parsed.files).toHaveLength(36);
    }
  });
});
