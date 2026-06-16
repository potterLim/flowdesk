import { getWorkspaceRepository, resetWorkspaceRepositoryStorage } from "../lib/persistence/workspaceRepository";
import type { WorkspaceState, WorkspaceStoreGet, WorkspaceStoreSet } from "./workspaceStoreTypes";
import {
  createEmptyWorkspace,
  getCurrentIsoDateTime,
  getErrorMessage,
  getInitialSelection,
  getSnapshotFromState,
} from "./workspaceStoreUtils";

interface WorkspacePersistenceJob {
  get: WorkspaceStoreGet;
  revision: number;
  set: WorkspaceStoreSet;
}

let persistenceQueue: Promise<void> = Promise.resolve();
let persistenceRevision = 0;
let deferredPersistenceTimer: ReturnType<typeof globalThis.setTimeout> | null = null;
let isWorkspacePersistenceDrainQueued = false;
let pendingWorkspacePersistenceJob: WorkspacePersistenceJob | null = null;

const deferredPersistenceDelayMs = 500;

export interface WorkspacePersistenceRequest {
  priority?: "immediate" | "deferred";
}

export function persistCurrentState(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
  request: WorkspacePersistenceRequest = {},
): void {
  const revision = markWorkspacePersistencePending(set);

  if (request.priority === "deferred") {
    scheduleDeferredWorkspacePersistence(set, get, revision);
    return;
  }

  cancelDeferredWorkspacePersistence();
  queueWorkspacePersistence(set, get, revision);
}

export function flushPendingWorkspacePersistence(set: WorkspaceStoreSet, get: WorkspaceStoreGet): void {
  if (!deferredPersistenceTimer) {
    return;
  }

  const revision = markWorkspacePersistencePending(set);

  cancelDeferredWorkspacePersistence();
  queueWorkspacePersistence(set, get, revision);
}

function markWorkspacePersistencePending(set: WorkspaceStoreSet): number {
  const revision = ++persistenceRevision;

  set({ persistenceStatus: "saving", persistenceError: null });

  return revision;
}

function scheduleDeferredWorkspacePersistence(set: WorkspaceStoreSet, get: WorkspaceStoreGet, revision: number): void {
  cancelDeferredWorkspacePersistence();

  deferredPersistenceTimer = globalThis.setTimeout(() => {
    deferredPersistenceTimer = null;
    queueWorkspacePersistence(set, get, revision);
  }, deferredPersistenceDelayMs);
}

function cancelDeferredWorkspacePersistence(): void {
  if (!deferredPersistenceTimer) {
    return;
  }

  globalThis.clearTimeout(deferredPersistenceTimer);
  deferredPersistenceTimer = null;
}

function queueWorkspacePersistence(set: WorkspaceStoreSet, get: WorkspaceStoreGet, revision: number): void {
  pendingWorkspacePersistenceJob = { get, revision, set };

  if (isWorkspacePersistenceDrainQueued) {
    return;
  }

  isWorkspacePersistenceDrainQueued = true;
  persistenceQueue = persistenceQueue.catch(() => undefined).then(drainWorkspacePersistenceQueue);
}

async function drainWorkspacePersistenceQueue(): Promise<void> {
  while (pendingWorkspacePersistenceJob) {
    const job = pendingWorkspacePersistenceJob;

    pendingWorkspacePersistenceJob = null;
    await saveWorkspacePersistenceJob(job);
  }

  isWorkspacePersistenceDrainQueued = false;
}

async function saveWorkspacePersistenceJob({ get, revision, set }: WorkspacePersistenceJob): Promise<void> {
  try {
    const repository = await getWorkspaceRepository();
    const snapshot = getSnapshotFromState(get());

    await repository.saveWorkspace(snapshot);

    if (revision === persistenceRevision) {
      set({
        persistenceMode: repository.mode,
        persistenceStatus: "saved",
        persistenceError: null,
        lastPersistedAt: getCurrentIsoDateTime(),
      });
    }
  } catch (error: unknown) {
    console.error("Failed to persist FlowDesk workspace", error);

    if (revision === persistenceRevision) {
      set({
        persistenceStatus: "error",
        persistenceError: getErrorMessage(error),
      });
    }
  }
}

export function createPersistenceActions(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
): Pick<WorkspaceState, "flushWorkspacePersistence" | "hydrateWorkspace" | "repairWorkspaceStorage"> {
  return {
    flushWorkspacePersistence() {
      flushPendingWorkspacePersistence(set, get);
    },

    hydrateWorkspace() {
      void getWorkspaceRepository()
        .then(async (repository) => {
          const storedSnapshot = await repository.loadWorkspace();
          const now = getCurrentIsoDateTime();

          if (storedSnapshot) {
            const selection = getInitialSelection(storedSnapshot);

            set({
              ...storedSnapshot,
              selectedProjectId: selection.projectId,
              selectedNoteId: selection.noteId,
              activeView: "overview",
              exportPreview: "",
              persistenceMode: repository.mode,
              persistenceStatus: "saved",
              persistenceError: null,
              lastPersistedAt: now,
            });

            return;
          }

          set({ persistenceMode: repository.mode, persistenceStatus: "saving", persistenceError: null });
          await repository.saveWorkspace(getSnapshotFromState(get()));
          set({
            persistenceStatus: "saved",
            persistenceError: null,
            lastPersistedAt: getCurrentIsoDateTime(),
          });
        })
        .catch((error: unknown) => {
          console.error("Failed to hydrate FlowDesk workspace", error);
          set({
            persistenceStatus: "error",
            persistenceError: getErrorMessage(error),
          });
        });
    },

    repairWorkspaceStorage() {
      cancelDeferredWorkspacePersistence();
      pendingWorkspacePersistenceJob = null;

      const revision = ++persistenceRevision;

      set({ persistenceStatus: "saving", persistenceError: null });

      persistenceQueue = persistenceQueue
        .catch(() => undefined)
        .then(async () => {
          await resetWorkspaceRepositoryStorage();

          const repository = await getWorkspaceRepository();
          const cleanWorkspace = createEmptyWorkspace();

          await repository.saveWorkspace(cleanWorkspace);

          if (revision === persistenceRevision) {
            set({
              ...cleanWorkspace,
              activeView: "overview",
              selectedProjectId: null,
              selectedNoteId: null,
              exportPreview: "",
              persistenceMode: repository.mode,
              persistenceStatus: "saved",
              persistenceError: null,
              lastPersistedAt: getCurrentIsoDateTime(),
            });
          }
        })
        .catch((error: unknown) => {
          console.error("Failed to rebuild FlowDesk workspace storage", error);

          if (revision === persistenceRevision) {
            set({
              persistenceStatus: "error",
              persistenceError: getErrorMessage(error),
            });
          }
        });
    },
  };
}
