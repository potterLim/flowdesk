import type { WorkspaceFileType } from "../../domain/workspace";
import { isTauriRuntime } from "./tauriRuntime";

export interface SelectedWorkspaceFile {
  name: string;
  fileType: WorkspaceFileType;
  sizeLabel: string;
  path: string;
  sourcePath: string | null;
  storageMode: "managed" | "linked";
}

const supportedExtensions = ["pdf", "png", "jpg", "jpeg", "csv", "txt", "md", "markdown"];
const managedFilesDirectory = "workspace-files";

function getFileName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path;
}

function getFileExtension(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase();

  return extension && extension !== name.toLowerCase() ? extension : "file";
}

function getSafeFileStem(name: string): string {
  const extension = getFileExtension(name);
  const stem = name.slice(0, Math.max(0, name.length - extension.length - 1));
  const safeStem = stem
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return safeStem || "flowdesk-file";
}

function getManagedRelativePath(name: string): string {
  return `${managedFilesDirectory}/${getSafeFileStem(name)}-${crypto.randomUUID()}.${getFileExtension(name)}`;
}

export function getWorkspaceFileType(name: string): WorkspaceFileType {
  const extension = name.split(".").pop()?.toLowerCase();

  if (extension === "png") {
    return "png";
  }

  if (extension === "jpg" || extension === "jpeg") {
    return "jpg";
  }

  if (extension === "csv") {
    return "csv";
  }

  if (extension === "txt") {
    return "txt";
  }

  if (extension === "md" || extension === "markdown") {
    return "markdown";
  }

  return "pdf";
}

export function formatFileSize(sizeInBytes: number | null | undefined): string {
  if (!sizeInBytes || sizeInBytes <= 0) {
    return "Unknown size";
  }

  if (sizeInBytes < 1024) {
    return `${sizeInBytes} B`;
  }

  const sizeInKilobytes = sizeInBytes / 1024;

  if (sizeInKilobytes < 1024) {
    return `${sizeInKilobytes.toFixed(sizeInKilobytes >= 100 ? 0 : 1)} KB`;
  }

  const sizeInMegabytes = sizeInKilobytes / 1024;

  return `${sizeInMegabytes.toFixed(sizeInMegabytes >= 100 ? 0 : 1)} MB`;
}

function selectBrowserFiles(): Promise<SelectedWorkspaceFile[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");

    input.type = "file";
    input.multiple = true;
    input.accept = supportedExtensions.map((extension) => `.${extension}`).join(",");
    input.onchange = () => {
      const files = Array.from(input.files ?? []).map((file) => ({
        name: file.name,
        fileType: getWorkspaceFileType(file.name),
        sizeLabel: formatFileSize(file.size),
        path: file.name,
        sourcePath: null,
        storageMode: "linked" as const,
      }));

      input.remove();
      resolve(files);
    };
    input.oncancel = () => {
      input.remove();
      resolve([]);
    };
    input.click();
  });
}

export async function selectWorkspaceFiles(): Promise<SelectedWorkspaceFile[]> {
  if (!isTauriRuntime()) {
    return selectBrowserFiles();
  }

  const [{ open }, { appDataDir, join }, { BaseDirectory, copyFile, mkdir, stat }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/api/path"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const selectedPaths = await open({
    title: "Import FlowDesk files",
    multiple: true,
    filters: [
      {
        name: "Supported Files",
        extensions: supportedExtensions,
      },
    ],
  });

  if (!selectedPaths || !Array.isArray(selectedPaths)) {
    return [];
  }

  await mkdir(managedFilesDirectory, { baseDir: BaseDirectory.AppData, recursive: true });
  const appDataPath = await appDataDir();

  return Promise.all(
    selectedPaths.map(async (path) => {
      const name = getFileName(path);
      const managedRelativePath = getManagedRelativePath(name);

      await copyFile(path, managedRelativePath, { toPathBaseDir: BaseDirectory.AppData });

      const [managedPath, fileInfo] = await Promise.all([
        join(appDataPath, managedRelativePath),
        stat(managedRelativePath, { baseDir: BaseDirectory.AppData }).catch(() => null),
      ]);

      return {
        name,
        fileType: getWorkspaceFileType(name),
        sizeLabel: formatFileSize(fileInfo?.size),
        path: managedPath,
        sourcePath: path,
        storageMode: "managed" as const,
      };
    }),
  );
}

export async function revealWorkspaceFile(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");

  await revealItemInDir(path);
}

export async function openWorkspaceFile(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  const { openPath } = await import("@tauri-apps/plugin-opener");

  await openPath(path);
}
