import { type FileSystemPath, toFileSystemPath } from "../platform/fileSystemPath";
import { isTauriRuntime } from "../platform/tauriRuntime";

export type DiagnosticsSaveResult =
  | { status: "saved"; path: FileSystemPath }
  | { status: "downloaded"; fileName: string }
  | { status: "cancelled" };

export interface ReleaseDiagnostics {
  generatedAt: string;
  productName: string;
  version: string;
  buildProfile: string;
  operatingSystem: string;
  architecture: string | null;
  appConfigDir: string | null;
  appDataDir: string | null;
  appLogDir: string | null;
  databasePath: string | null;
  databaseExists: boolean | null;
  databaseIntegrity: { status: string; detail?: string } | null;
}

interface NativeReleaseDiagnostics {
  product_name: string;
  version: string;
  build_profile: string;
  operating_system: string;
  architecture: string;
  app_config_dir: string | null;
  app_data_dir: string | null;
  app_log_dir: string | null;
  database_path: string;
  database_exists: boolean;
  database_integrity: { status: string; detail?: string };
}

function getDiagnosticsFileName(): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  return `flowdesk-diagnostics-${timestamp}.json`;
}

function normalizeNativeDiagnostics(value: NativeReleaseDiagnostics): ReleaseDiagnostics {
  return {
    generatedAt: new Date().toISOString(),
    productName: value.product_name,
    version: value.version,
    buildProfile: value.build_profile,
    operatingSystem: value.operating_system,
    architecture: value.architecture,
    appConfigDir: value.app_config_dir,
    appDataDir: value.app_data_dir,
    appLogDir: value.app_log_dir,
    databasePath: value.database_path,
    databaseExists: value.database_exists,
    databaseIntegrity: value.database_integrity,
  };
}

function createBrowserDiagnostics(): ReleaseDiagnostics {
  return {
    generatedAt: new Date().toISOString(),
    productName: "FlowDesk",
    version: "browser-preview",
    buildProfile: "browser",
    operatingSystem: navigator.platform || "browser",
    architecture: null,
    appConfigDir: null,
    appDataDir: null,
    appLogDir: null,
    databasePath: null,
    databaseExists: null,
    databaseIntegrity: null,
  };
}

function downloadDiagnosticsInBrowser(fileName: string, content: string): void {
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

export async function collectReleaseDiagnostics(): Promise<ReleaseDiagnostics> {
  if (!isTauriRuntime()) {
    return createBrowserDiagnostics();
  }

  const { invoke } = await import("@tauri-apps/api/core");
  const databaseUrl = await invoke<string>("get_workspace_database_url");
  const diagnostics = await invoke<NativeReleaseDiagnostics>("get_release_diagnostics", { databaseUrl });

  return normalizeNativeDiagnostics(diagnostics);
}

export async function saveReleaseDiagnostics(): Promise<DiagnosticsSaveResult> {
  const fileName = getDiagnosticsFileName();
  const content = JSON.stringify(await collectReleaseDiagnostics(), null, 2);

  if (!isTauriRuntime()) {
    downloadDiagnosticsInBrowser(fileName, content);

    return { status: "downloaded", fileName };
  }

  const [{ save }, { writeTextFile }] = await Promise.all([
    import("@tauri-apps/plugin-dialog"),
    import("@tauri-apps/plugin-fs"),
  ]);
  const selectedPath = await save({
    title: "Export FlowDesk diagnostics",
    defaultPath: fileName,
    filters: [{ name: "FlowDesk Diagnostics", extensions: ["json"] }],
    canCreateDirectories: true,
  });

  if (!selectedPath) {
    return { status: "cancelled" };
  }

  await writeTextFile(selectedPath, content);

  return { status: "saved", path: toFileSystemPath(selectedPath) };
}
