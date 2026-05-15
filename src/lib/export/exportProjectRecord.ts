import { isTauriRuntime } from "../platform/tauriRuntime";

export type ExportFormat = "markdown" | "json";

export type ExportSaveResult =
  | { status: "saved"; path: string }
  | { status: "downloaded"; fileName: string }
  | { status: "cancelled" };

interface SaveProjectRecordInput {
  projectTitle: string;
  format: ExportFormat;
  content: string;
}

function getExportExtension(format: ExportFormat): "md" | "json" {
  return format === "markdown" ? "md" : "json";
}

function getExportFilter(format: ExportFormat): { name: string; extensions: string[] } {
  return format === "markdown"
    ? { name: "Markdown", extensions: ["md"] }
    : { name: "JSON", extensions: ["json"] };
}

function slugifyFileName(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "flowdesk-project";
}

function downloadInBrowser(fileName: string, content: string, format: ExportFormat): void {
  const mimeType = format === "markdown" ? "text/markdown;charset=utf-8" : "application/json;charset=utf-8";
  const objectUrl = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export async function saveProjectRecord({
  projectTitle,
  format,
  content,
}: SaveProjectRecordInput): Promise<ExportSaveResult> {
  const extension = getExportExtension(format);
  const fileName = `${slugifyFileName(projectTitle)}.${extension}`;

  if (!isTauriRuntime()) {
    downloadInBrowser(fileName, content, format);

    return { status: "downloaded", fileName };
  }

  const [{ save }, { writeTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const selectedPath = await save({
    title: "Export FlowDesk project record",
    defaultPath: fileName,
    filters: [getExportFilter(format)],
    canCreateDirectories: true,
  });

  if (!selectedPath) {
    return { status: "cancelled" };
  }

  await writeTextFile(selectedPath, content);

  return { status: "saved", path: selectedPath };
}

export async function revealSavedProjectRecord(path: string): Promise<void> {
  if (!isTauriRuntime()) {
    return;
  }

  const { revealItemInDir } = await import("@tauri-apps/plugin-opener");

  await revealItemInDir(path);
}
