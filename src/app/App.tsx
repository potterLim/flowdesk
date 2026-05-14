import { useEffect } from "react";
import { Navigate, Route, Routes, HashRouter } from "react-router-dom";
import { WorkspaceScreen } from "../features/workspace/WorkspaceScreen";
import { useWorkspaceStore } from "../stores/workspaceStore";

export function App() {
  const hydrateWorkspace = useWorkspaceStore((state) => state.hydrateWorkspace);

  useEffect(() => {
    hydrateWorkspace();
  }, [hydrateWorkspace]);

  return (
    <HashRouter>
      <Routes>
        <Route path="/workspace" element={<WorkspaceScreen />} />
        <Route path="*" element={<Navigate to="/workspace" replace />} />
      </Routes>
    </HashRouter>
  );
}
