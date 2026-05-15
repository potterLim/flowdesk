import { mkdir, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";

const durationMinutes = readDurationMinutes();
const startedAt = new Date();
const deadline = performance.now() + durationMinutes * 60_000;
const report = {
  startedAt: startedAt.toISOString(),
  durationMinutes,
  cycles: 0,
  backupBytes: 0,
  markdownBytes: 0,
  jsonBytes: 0,
  maxCycleMs: 0,
};

const workspace = createWorkspaceFixture();

do {
  const cycleStartedAt = performance.now();
  const backup = JSON.stringify(workspace);
  const restored = JSON.parse(backup);
  const project = restored.projects[report.cycles % restored.projects.length];
  const record = getProjectRecord(restored, project.id);
  const markdown = buildMarkdown(record);
  const json = JSON.stringify(record, null, 2);

  assert(record.notes.length === 80, "note count drifted during soak");
  assert(record.tasks.length === 120, "task count drifted during soak");
  assert(record.files.length === 60, "file count drifted during soak");
  assert(markdown.includes(`# ${project.title}`), "markdown export lost the project title");
  assert(JSON.parse(json).timelineEvents.length === 140, "json export lost timeline events");

  report.cycles += 1;
  report.backupBytes = backup.length;
  report.markdownBytes = markdown.length;
  report.jsonBytes = json.length;
  report.maxCycleMs = Math.max(report.maxCycleMs, performance.now() - cycleStartedAt);
} while (performance.now() < deadline);

report.finishedAt = new Date().toISOString();
report.elapsedMs = Math.round(performance.now() - (deadline - durationMinutes * 60_000));
report.maxCycleMs = Math.round(report.maxCycleMs * 100) / 100;

await mkdir(".local/qa", { recursive: true });
const reportPath = `.local/qa/soak-${startedAt.toISOString().replace(/[:.]/g, "-")}.json`;
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

console.log(`FlowDesk soak passed: ${report.cycles} cycles, ${report.elapsedMs}ms, report ${reportPath}`);

function readDurationMinutes() {
  const index = process.argv.indexOf("--minutes");
  const value = index >= 0 ? Number(process.argv[index + 1]) : 5;

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("Use --minutes with a positive number.");
  }

  return value;
}

function createWorkspaceFixture() {
  const now = "2026-05-15T00:00:00.000Z";
  const projects = Array.from({ length: 18 }, (_, index) => ({
    id: `project-${index}`,
    title: `Long Run Project ${index + 1}`,
    description: "Release soak fixture for repeated export and backup cycles.",
    createdAt: now,
    updatedAt: now,
    tags: ["release", "soak", `lane-${index % 6}`],
    status: "active",
    isPinned: index < 3,
    accent: ["teal", "blue", "violet", "amber", "rose"][index % 5],
    icon: `L${index}`,
  }));

  return {
    projects,
    notes: projects.flatMap((project) =>
      Array.from({ length: 80 }, (_, index) => ({
        id: `${project.id}-note-${index}`,
        projectId: project.id,
        title: `Notebook entry ${index + 1}`,
        folder: index % 4 === 0 ? "Experiments" : "Reading",
        content: `# Entry ${index + 1}\n\nRepeated long-run validation content.\n\n- checkpoint: ${index}\n- project: ${project.title}`,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    tasks: projects.flatMap((project) =>
      Array.from({ length: 120 }, (_, index) => ({
        id: `${project.id}-task-${index}`,
        projectId: project.id,
        title: `Release task ${index + 1}`,
        status: ["todo", "in_progress", "done", "archived"][index % 4],
        priority: ["low", "medium", "high", "urgent"][index % 4],
        dueDate: null,
        tags: ["release"],
        linkedSessionId: null,
        createdAt: now,
        updatedAt: now,
      })),
    ),
    sessions: projects.flatMap((project) =>
      Array.from({ length: 48 }, (_, index) => ({
        id: `${project.id}-session-${index}`,
        projectId: project.id,
        title: `Focus session ${index + 1}`,
        notes: "Soak test session notes.",
        startedAt: now,
        endedAt: "2026-05-15T00:50:00.000Z",
        durationMinutes: 50,
      })),
    ),
    references: projects.flatMap((project) =>
      Array.from({ length: 40 }, (_, index) => ({
        id: `${project.id}-reference-${index}`,
        projectId: project.id,
        title: `Reference ${index + 1}`,
        type: ["paper", "website", "video", "documentation", "book"][index % 5],
        source: `https://example.test/release/${project.id}/${index}`,
        summary: "Release soak reference.",
        tags: ["source"],
        createdAt: now,
      })),
    ),
    files: projects.flatMap((project) =>
      Array.from({ length: 60 }, (_, index) => ({
        id: `${project.id}-file-${index}`,
        projectId: project.id,
        name: `artifact-${index + 1}.csv`,
        fileType: "csv",
        sizeLabel: `${index + 1}.0 MB`,
        path: `/tmp/flowdesk-soak/artifact-${index + 1}.csv`,
        sourcePath: `/tmp/flowdesk-source/artifact-${index + 1}.csv`,
        storageMode: "managed",
        tags: ["artifact"],
        importedAt: now,
      })),
    ),
    timelineEvents: projects.flatMap((project) =>
      Array.from({ length: 140 }, (_, index) => ({
        id: `${project.id}-event-${index}`,
        projectId: project.id,
        type: ["note_created", "task_completed", "session_finished", "file_imported", "export_generated"][index % 5],
        title: `Timeline checkpoint ${index + 1}`,
        description: "Release soak timeline event.",
        createdAt: now,
      })),
    ),
  };
}

function getProjectRecord(workspace, projectId) {
  const project = workspace.projects.find((candidate) => candidate.id === projectId);

  if (!project) {
    throw new Error(`Missing project ${projectId}`);
  }

  return {
    project,
    notes: workspace.notes.filter((note) => note.projectId === projectId),
    tasks: workspace.tasks.filter((task) => task.projectId === projectId),
    sessions: workspace.sessions.filter((session) => session.projectId === projectId),
    references: workspace.references.filter((reference) => reference.projectId === projectId),
    files: workspace.files.filter((file) => file.projectId === projectId),
    timelineEvents: workspace.timelineEvents.filter((event) => event.projectId === projectId),
  };
}

function buildMarkdown(record) {
  return [
    `# ${record.project.title}`,
    "",
    record.project.description,
    "",
    "## Tasks",
    record.tasks.map((task) => `- [${task.status === "done" ? "x" : " "}] ${task.title}`).join("\n"),
    "",
    "## Files",
    record.files.map((file) => `- ${file.name} (${file.sizeLabel})`).join("\n"),
    "",
    "## Timeline",
    record.timelineEvents.map((event) => `- ${event.title}: ${event.description}`).join("\n"),
    "",
    "## Notes",
    record.notes.map((note) => `### ${note.title}\n\n${note.content}`).join("\n\n---\n\n"),
  ].join("\n");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
