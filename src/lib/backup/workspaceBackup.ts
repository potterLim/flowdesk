import type { WorkspaceSnapshot } from "../../domain/workspace";
import { normalizeWorkspaceSnapshot } from "../persistence/workspaceRepository";
import { type FileSystemPath, toFileSystemPath } from "../platform/fileSystemPath";
import { isTauriRuntime } from "../platform/tauriRuntime";

export type WorkspaceBackupSaveResult =
  | { status: "saved"; path: FileSystemPath }
  | { status: "downloaded"; fileName: string }
  | { status: "cancelled" };

function getBackupFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return `flowdesk-backup-${timestamp}.json`;
}

function downloadBackupInBrowser(fileName: string, content: string): void {
  const objectUrl = URL.createObjectURL(new Blob([content], { type: "application/json;charset=utf-8" }));
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

function selectBrowserBackupFile(): Promise<WorkspaceSnapshot | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];

      input.remove();

      if (!file) {
        resolve(null);
        return;
      }

      const reader = new FileReader();

      reader.onerror = () => reject(new Error("FlowDesk could not read the selected backup file."));
      reader.onload = () => {
        try {
          if (typeof reader.result !== "string") {
            throw new Error("FlowDesk expected a text backup file.");
          }

          resolve(readWorkspaceBackup(reader.result));
        } catch (error) {
          reject(error instanceof Error ? error : new Error("FlowDesk could not parse the selected backup file."));
        }
      };
      reader.readAsText(file);
    };
    input.oncancel = () => {
      input.remove();
      resolve(null);
    };
    input.click();
  });
}

export function readWorkspaceBackup(content: string): WorkspaceSnapshot {
  const parsedSnapshot: unknown = JSON.parse(content);
  const snapshot = normalizeWorkspaceSnapshot(parsedSnapshot);

  if (!snapshot) {
    throw new Error("The selected file is not a valid FlowDesk backup.");
  }

  return snapshot;
}

export async function saveWorkspaceBackup(snapshot: WorkspaceSnapshot): Promise<WorkspaceBackupSaveResult> {
  const fileName = getBackupFileName();
  const content = JSON.stringify(snapshot, null, 2);

  if (!isTauriRuntime()) {
    downloadBackupInBrowser(fileName, content);

    return { status: "downloaded", fileName };
  }

  const [{ save }, { writeTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const selectedPath = await save({
    title: "Back up FlowDesk workspace",
    defaultPath: fileName,
    filters: [{ name: "FlowDesk Backup", extensions: ["json"] }],
    canCreateDirectories: true,
  });

  if (!selectedPath) {
    return { status: "cancelled" };
  }

  await writeTextFile(selectedPath, content);

  return { status: "saved", path: toFileSystemPath(selectedPath) };
}

export async function selectWorkspaceBackup(): Promise<WorkspaceSnapshot | null> {
  if (!isTauriRuntime()) {
    return selectBrowserBackupFile();
  }

  const [{ open }, { readTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const selectedPath = await open({
    title: "Restore FlowDesk backup",
    multiple: false,
    filters: [{ name: "FlowDesk Backup", extensions: ["json"] }],
  });

  if (!selectedPath || Array.isArray(selectedPath)) {
    return null;
  }

  return readWorkspaceBackup(await readTextFile(selectedPath));
}
