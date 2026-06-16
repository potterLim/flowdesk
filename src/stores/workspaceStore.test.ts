import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, ReferenceRecord, Task, TimelineEvent, WorkSession, WorkspaceFile } from "../domain/workspace";
import {
  toIsoDateTimeString,
  toProjectId,
  toReferenceId,
  toTaskId,
  toTimelineEventId,
  toWorkSessionId,
  toWorkspaceFileId,
  toWorkspaceFilePath,
} from "../domain/workspaceValues";
import { useWorkspaceStore } from "./workspaceStore";
import type { ImportWorkspaceFileInput } from "./workspaceStoreTypes";

const initialStoreState = useWorkspaceStore.getInitialState();

const project: Project = {
  id: toProjectId("project-1"),
  title: "Retina Organoid",
  description: "Structured research workspace fixture.",
  createdAt: toIsoDateTimeString("2026-05-15T00:00:00.000Z"),
  updatedAt: toIsoDateTimeString("2026-05-15T00:00:00.000Z"),
  tags: ["research"],
  status: "active",
  isPinned: false,
  accent: "teal",
  icon: "RO",
};

const timelineEvent: TimelineEvent = {
  id: toTimelineEventId("event-1"),
  projectId: project.id,
  title: "Note created",
  description: "Created an initial research note.",
  type: "note_created",
  createdAt: toIsoDateTimeString("2026-05-15T00:00:00.000Z"),
};

const task: Task = {
  id: toTaskId("task-1"),
  projectId: project.id,
  title: "Validate differentiation protocol",
  status: "todo",
  priority: "high",
  dueDate: null,
  tags: ["experiment"],
  linkedSessionId: null,
  createdAt: project.createdAt,
  updatedAt: project.updatedAt,
};

const session: WorkSession = {
  id: toWorkSessionId("session-1"),
  projectId: project.id,
  title: "Focus Session",
  notes: "Read protocol notes.",
  startedAt: project.createdAt,
  endedAt: null,
  durationMinutes: null,
};

const reference: ReferenceRecord = {
  id: toReferenceId("reference-1"),
  projectId: project.id,
  title: "Organoid paper",
  type: "paper",
  source: "https://example.test/paper",
  summary: "Reference fixture.",
  tags: ["paper"],
  createdAt: project.createdAt,
};

const workspaceFile: WorkspaceFile = {
  id: toWorkspaceFileId("file-1"),
  projectId: project.id,
  name: "dataset.csv",
  fileType: "csv",
  sizeLabel: "12 KB",
  path: toWorkspaceFilePath("workspace-files/dataset.csv"),
  sourcePath: toWorkspaceFilePath("source/dataset.csv"),
  storageMode: "managed",
  tags: ["dataset"],
  importedAt: project.createdAt,
};

const importFileInput: ImportWorkspaceFileInput = {
  name: "figure.png",
  fileType: "png",
  sizeLabel: "42 KB",
  path: toWorkspaceFilePath("workspace-files/figure.png"),
  sourcePath: toWorkspaceFilePath("source/figure.png"),
  storageMode: "managed",
};

function createMemoryStorage(): Storage {
  const records = new Map<string, string>();

  return {
    get length() {
      return records.size;
    },
    clear() {
      records.clear();
    },
    getItem(key: string) {
      return records.get(key) ?? null;
    },
    key(index: number) {
      return Array.from(records.keys())[index] ?? null;
    },
    removeItem(key: string) {
      records.delete(key);
    },
    setItem(key: string, value: string) {
      records.set(key, value);
    },
  };
}

function loadExportFixture(): void {
  useWorkspaceStore.setState({
    ...initialStoreState,
    projects: [project],
    notes: [],
    tasks: [],
    sessions: [],
    references: [],
    files: [],
    timelineEvents: [timelineEvent],
    selectedProjectId: project.id,
    selectedNoteId: null,
    activeView: "overview",
    exportPreview: "",
  });
}

function loadProjectFixture(overrides: Partial<Project> = {}): void {
  useWorkspaceStore.setState({
    ...initialStoreState,
    projects: [{ ...project, ...overrides }],
    notes: [],
    tasks: [],
    sessions: [],
    references: [],
    files: [],
    timelineEvents: [],
    selectedProjectId: project.id,
    selectedNoteId: null,
    activeView: "overview",
    exportPreview: "",
  });
}

describe("workspaceStore", () => {
  beforeEach(() => {
    vi.stubGlobal("window", { localStorage: createMemoryStorage() });
  });

  afterEach(() => {
    useWorkspaceStore.setState(initialStoreState);
  });

  it("keeps preview generation separate from persisted export history", () => {
    loadExportFixture();

    const markdown = useWorkspaceStore.getState().prepareMarkdownExport();
    const afterMarkdownPreview = useWorkspaceStore.getState();

    expect(markdown).toContain("# Retina Organoid");
    expect(afterMarkdownPreview.activeView).toBe("exports");
    expect(afterMarkdownPreview.exportPreview).toBe(markdown);
    expect(afterMarkdownPreview.timelineEvents).toHaveLength(1);
    expect(afterMarkdownPreview.timelineEvents[0]?.id).toBe(timelineEvent.id);

    const json = useWorkspaceStore.getState().prepareJsonExport();
    const afterJsonPreview = useWorkspaceStore.getState();
    const parsedJson: unknown = JSON.parse(json ?? "{}");

    expect(parsedJson).toMatchObject({ project: { title: "Retina Organoid" } });
    expect(afterJsonPreview.exportPreview).toBe(json);
    expect(afterJsonPreview.timelineEvents).toHaveLength(1);
    expect(afterJsonPreview.timelineEvents[0]?.id).toBe(timelineEvent.id);
  });

  it("prevents active project mutations after a project is archived", () => {
    loadProjectFixture({ status: "archived" });

    useWorkspaceStore.getState().createNote();
    useWorkspaceStore.getState().createTask({
      title: "Prepare assay",
      priority: "high",
      dueDate: null,
      tags: ["blocked"],
    });
    useWorkspaceStore.getState().startSession();
    useWorkspaceStore.getState().importFiles([importFileInput]);
    useWorkspaceStore.getState().toggleProjectPinned(project.id);

    const state = useWorkspaceStore.getState();

    expect(state.notes).toHaveLength(0);
    expect(state.tasks).toHaveLength(0);
    expect(state.sessions).toHaveLength(0);
    expect(state.files).toHaveLength(0);
    expect(state.projects[0]).toMatchObject({ status: "archived", isPinned: false });
  });

  it("cascades project deletion through every project-owned record", () => {
    useWorkspaceStore.setState({
      ...initialStoreState,
      projects: [project],
      notes: [],
      tasks: [task],
      sessions: [session],
      references: [reference],
      files: [workspaceFile],
      timelineEvents: [timelineEvent],
      selectedProjectId: project.id,
      selectedNoteId: null,
      activeView: "files",
      exportPreview: "stale export",
    });

    useWorkspaceStore.getState().deleteProject(project.id);
    const state = useWorkspaceStore.getState();

    expect(state.projects).toHaveLength(0);
    expect(state.tasks).toHaveLength(0);
    expect(state.sessions).toHaveLength(0);
    expect(state.references).toHaveLength(0);
    expect(state.files).toHaveLength(0);
    expect(state.timelineEvents).toHaveLength(0);
    expect(state.selectedProjectId).toBeNull();
    expect(state.selectedNoteId).toBeNull();
    expect(state.activeView).toBe("overview");
    expect(state.exportPreview).toBe("");
  });

  it("keeps session lifecycle single-active and records one completion event", () => {
    loadProjectFixture();

    useWorkspaceStore.getState().startSession();
    useWorkspaceStore.getState().startSession();

    const startedState = useWorkspaceStore.getState();
    const activeSession = startedState.sessions[0];

    expect(startedState.sessions).toHaveLength(1);
    expect(activeSession?.endedAt).toBeNull();

    useWorkspaceStore.getState().updateActiveSessionNotes("Finished paper section 3.");
    useWorkspaceStore.getState().endActiveSession();
    useWorkspaceStore.getState().endActiveSession();

    const endedState = useWorkspaceStore.getState();

    expect(endedState.sessions).toHaveLength(1);
    expect(endedState.sessions[0]?.notes).toBe("Finished paper section 3.");
    expect(endedState.sessions[0]?.endedAt).not.toBeNull();
    expect(endedState.sessions[0]?.durationMinutes).not.toBeNull();
    expect(endedState.timelineEvents.filter((event) => event.type === "session_finished")).toHaveLength(1);
  });
});
