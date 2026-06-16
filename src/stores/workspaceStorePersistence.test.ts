import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Project, WorkspaceSnapshot } from "../domain/workspace";
import { toIsoDateTimeString, toProjectId } from "../domain/workspaceValues";
import { useWorkspaceStore } from "./workspaceStore";
import { flushPendingWorkspacePersistence, persistCurrentState } from "./workspaceStorePersistence";
import type { WorkspaceStoreGet, WorkspaceStoreSet } from "./workspaceStoreTypes";

const saveWorkspace = vi.fn((snapshot: WorkspaceSnapshot): Promise<void> => {
  void snapshot;

  return Promise.resolve();
});

vi.mock("../lib/persistence/workspaceRepository", () => ({
  getWorkspaceRepository: vi.fn(() =>
    Promise.resolve({
      loadWorkspace: vi.fn(() => Promise.resolve(null)),
      mode: "browser",
      saveWorkspace,
    }),
  ),
  resetWorkspaceRepositoryStorage: vi.fn(() => Promise.resolve(undefined)),
}));

const timestamp = toIsoDateTimeString("2026-05-15T00:00:00.000Z");

function createProject(title: string): Project {
  return {
    id: toProjectId(`project-${title.toLowerCase().replaceAll(" ", "-")}`),
    title,
    description: "Persistence scheduler fixture.",
    createdAt: timestamp,
    updatedAt: timestamp,
    tags: ["test"],
    status: "active",
    isPinned: false,
    accent: "teal",
    icon: "PS",
  };
}

function createSnapshot(title: string): WorkspaceSnapshot {
  return {
    projects: [createProject(title)],
    notes: [],
    tasks: [],
    sessions: [],
    references: [],
    files: [],
    timelineEvents: [],
  };
}

function createWorkspaceAccessors(initialSnapshot: WorkspaceSnapshot): {
  get: WorkspaceStoreGet;
  set: WorkspaceStoreSet;
  setSnapshot: (snapshot: WorkspaceSnapshot) => void;
} {
  let snapshot = initialSnapshot;

  return {
    get: () => ({
      ...useWorkspaceStore.getInitialState(),
      ...snapshot,
    }),
    set: vi.fn(),
    setSnapshot(nextSnapshot) {
      snapshot = nextSnapshot;
    },
  };
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("workspace persistence scheduling", () => {
  beforeEach(() => {
    saveWorkspace.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("defers typing-driven persistence and saves the latest snapshot", async () => {
    vi.useFakeTimers();

    const workspaceAccessors = createWorkspaceAccessors(createSnapshot("Draft One"));

    persistCurrentState(workspaceAccessors.set, workspaceAccessors.get, { priority: "deferred" });
    workspaceAccessors.setSnapshot(createSnapshot("Draft Two"));
    persistCurrentState(workspaceAccessors.set, workspaceAccessors.get, { priority: "deferred" });

    await vi.advanceTimersByTimeAsync(499);

    expect(saveWorkspace).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await flushMicrotasks();

    expect(saveWorkspace).toHaveBeenCalledTimes(1);
    expect(saveWorkspace.mock.calls[0]?.[0].projects[0]?.title).toBe("Draft Two");
  });

  it("coalesces writes that arrive while a save is already running", async () => {
    let finishFirstSave: (() => void) | undefined;
    saveWorkspace.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finishFirstSave = resolve;
        }),
    );

    const workspaceAccessors = createWorkspaceAccessors(createSnapshot("Immediate One"));

    persistCurrentState(workspaceAccessors.set, workspaceAccessors.get);
    await flushMicrotasks();

    workspaceAccessors.setSnapshot(createSnapshot("Immediate Two"));
    persistCurrentState(workspaceAccessors.set, workspaceAccessors.get);
    workspaceAccessors.setSnapshot(createSnapshot("Immediate Three"));
    persistCurrentState(workspaceAccessors.set, workspaceAccessors.get);

    expect(saveWorkspace).toHaveBeenCalledTimes(1);

    if (!finishFirstSave) {
      throw new Error("FlowDesk expected the first persistence save to be running.");
    }

    finishFirstSave();
    await flushMicrotasks();

    expect(saveWorkspace).toHaveBeenCalledTimes(2);
    expect(saveWorkspace.mock.calls[1]?.[0].projects[0]?.title).toBe("Immediate Three");
  });

  it("flushes deferred persistence before the debounce window ends", async () => {
    vi.useFakeTimers();

    const workspaceAccessors = createWorkspaceAccessors(createSnapshot("Blur Commit"));

    persistCurrentState(workspaceAccessors.set, workspaceAccessors.get, { priority: "deferred" });
    flushPendingWorkspacePersistence(workspaceAccessors.set, workspaceAccessors.get);
    await flushMicrotasks();

    expect(saveWorkspace).toHaveBeenCalledTimes(1);
    expect(saveWorkspace.mock.calls[0]?.[0].projects[0]?.title).toBe("Blur Commit");
  });
});
