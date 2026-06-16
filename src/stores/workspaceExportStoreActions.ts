import {
  buildProjectRecordJson,
  buildProjectRecordMarkdown,
  getProjectRecordSnapshot,
} from "../lib/export/projectRecordExport";
import { persistCurrentState } from "./workspaceStorePersistence";
import type {
  ProjectRecordExportFormat,
  WorkspaceState,
  WorkspaceStoreGet,
  WorkspaceStoreSet,
} from "./workspaceStoreTypes";
import {
  createTimelineEvent,
  getCurrentIsoDateTime,
  getSnapshotFromState,
  updateProjectTimestamp,
} from "./workspaceStoreUtils";

type ExportActionKeys = "prepareMarkdownExport" | "prepareJsonExport" | "recordProjectExport";

export function createExportStoreActions(
  set: WorkspaceStoreSet,
  get: WorkspaceStoreGet,
): Pick<WorkspaceState, ExportActionKeys> {
  return {
    prepareMarkdownExport() {
      return prepareProjectExport(get(), "markdown", set);
    },

    prepareJsonExport() {
      return prepareProjectExport(get(), "json", set);
    },

    recordProjectExport(format) {
      const state = get();
      const project = state.projects.find((candidateProject) => candidateProject.id === state.selectedProjectId);

      if (!project) {
        return;
      }

      const now = getCurrentIsoDateTime();
      const formatLabel = format === "markdown" ? "Markdown" : "JSON";

      set({
        timelineEvents: [
          createTimelineEvent(
            project.id,
            "Export generated",
            `Saved ${formatLabel} project record.`,
            "export_generated",
          ),
          ...state.timelineEvents,
        ],
        projects: updateProjectTimestamp(state.projects, project.id, now),
      });
      persistCurrentState(set, get);
    },
  };
}

function prepareProjectExport(
  state: WorkspaceState,
  format: ProjectRecordExportFormat,
  set: WorkspaceStoreSet,
): string | null {
  const projectId = state.selectedProjectId;

  if (!projectId) {
    return null;
  }

  const project = state.projects.find((candidateProject) => candidateProject.id === projectId);

  if (!project) {
    return null;
  }

  const projectRecord = getProjectRecordSnapshot(getSnapshotFromState(state), projectId);

  if (!projectRecord) {
    return null;
  }

  const exportContent =
    format === "markdown" ? buildProjectRecordMarkdown(projectRecord) : buildProjectRecordJson(projectRecord);

  set({
    exportPreview: exportContent,
    activeView: "exports",
  });

  return exportContent;
}
