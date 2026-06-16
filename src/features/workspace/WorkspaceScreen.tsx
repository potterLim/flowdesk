import { ProjectSidebar } from "./components/ProjectSidebar";
import { WorkspaceDialogStack } from "./components/WorkspaceDialogStack";
import { FirstRunView, WorkspaceBootView } from "./components/WorkspaceOnboarding";
import { WorkspaceProjectContent } from "./components/WorkspaceProjectContent";
import { useWorkspaceScreenController } from "./hooks/useWorkspaceScreenController";
import { PersistenceAlert } from "./views/PersistenceAlert";

export function WorkspaceScreen() {
  const screen = useWorkspaceScreenController();

  if (screen.isHydrating) {
    return <WorkspaceBootView />;
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--color-app-bg)] text-[var(--color-ink)] lg:h-screen lg:min-h-[720px] lg:flex-row lg:overflow-hidden">
      <ProjectSidebar {...screen.sidebarProps} />
      <main id="flowdesk-main" className="flex min-w-0 flex-1 flex-col">
        {screen.projectContentProps ? (
          <WorkspaceProjectContent {...screen.projectContentProps} />
        ) : (
          <>
            {screen.persistenceAlertProps && (
              <div className="px-5 sm:px-8 lg:px-10">
                <PersistenceAlert {...screen.persistenceAlertProps} />
              </div>
            )}
            <FirstRunView {...screen.firstRunProps} />
          </>
        )}
      </main>
      <WorkspaceDialogStack {...screen.dialogStackProps} />
    </div>
  );
}
