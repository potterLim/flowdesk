import { useEffect } from "react";
import { Navigate, Route, Routes, HashRouter } from "react-router-dom";
import { WorkspaceScreen } from "../features/workspace/WorkspaceScreen";
import { useWorkspaceStore } from "../stores/workspaceStore";

export function App() {
  const flushWorkspacePersistence = useWorkspaceStore((state) => state.flushWorkspacePersistence);
  const hydrateWorkspace = useWorkspaceStore((state) => state.hydrateWorkspace);

  useEffect(() => {
    hydrateWorkspace();
  }, [hydrateWorkspace]);

  useEffect(() => {
    const flushPendingChanges = () => flushWorkspacePersistence();
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") {
        flushWorkspacePersistence();
      }
    };

    window.addEventListener("pagehide", flushPendingChanges);
    document.addEventListener("visibilitychange", flushWhenHidden);

    return () => {
      window.removeEventListener("pagehide", flushPendingChanges);
      document.removeEventListener("visibilitychange", flushWhenHidden);
    };
  }, [flushWorkspacePersistence]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/workspace" element={<WorkspaceScreen />} />
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </HashRouter>
  );
}
