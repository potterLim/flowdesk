import { afterEach, describe, expect, it } from "vitest";
import type { Project, TimelineEvent } from "../domain/workspace";
import { useWorkspaceStore } from "./workspaceStore";

const initialStoreState = useWorkspaceStore.getInitialState();

const project: Project = {
  id: "project-1",
  title: "Retina Organoid",
  description: "Structured research workspace fixture.",
  createdAt: "2026-05-15T00:00:00.000Z",
  updatedAt: "2026-05-15T00:00:00.000Z",
  tags: ["research"],
  status: "active",
  isPinned: false,
  accent: "teal",
  icon: "RO",
};

const timelineEvent: TimelineEvent = {
  id: "event-1",
  projectId: project.id,
  title: "Note created",
  description: "Created an initial research note.",
  type: "note_created",
  createdAt: "2026-05-15T00:00:00.000Z",
};

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
    selectedNoteId: "",
    activeView: "overview",
    exportPreview: "",
  });
}

describe("workspaceStore export preparation", () => {
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

    expect(JSON.parse(json ?? "{}").project.title).toBe("Retina Organoid");
    expect(afterJsonPreview.exportPreview).toBe(json);
    expect(afterJsonPreview.timelineEvents).toHaveLength(1);
    expect(afterJsonPreview.timelineEvents[0]?.id).toBe(timelineEvent.id);
  });
});
