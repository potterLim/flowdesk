import { useEffect } from "react";
import { isTauriRuntime } from "../../../lib/tauriRuntime";

export type NativeWorkspaceMenuCommand =
  | "new_project"
  | "new_note"
  | "new_task"
  | "import_files"
  | "export_markdown"
  | "open_command_palette"
  | "search_projects";

function isNativeWorkspaceMenuCommand(value: unknown): value is NativeWorkspaceMenuCommand {
  return (
    value === "new_project" ||
    value === "new_note" ||
    value === "new_task" ||
    value === "import_files" ||
    value === "export_markdown" ||
    value === "open_command_palette" ||
    value === "search_projects"
  );
}

export function useNativeMenuEvents(onCommand: (command: NativeWorkspaceMenuCommand) => void): void {
  useEffect(() => {
    if (!isTauriRuntime()) {
      return undefined;
    }

    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen<unknown>("flowdesk://menu", (event) => {
        if (isNativeWorkspaceMenuCommand(event.payload)) {
          onCommand(event.payload);
        }
      }).then((unlisten) => {
        if (isMounted) {
          unsubscribe = unlisten;
          return;
        }

        unlisten();
      }),
    );

    return () => {
      isMounted = false;
      unsubscribe?.();
    };
  }, [onCommand]);
}
