import type { Task, TaskId, TaskStatus } from "../../../domain/workspace";
import { EmptyState, PanelHeader } from "../components/WorkspacePrimitives";
import { taskStatusLabels } from "../workspaceConstants";
import { TaskCard } from "./TaskPanels";

export function TasksView({
  tasks,
  canEditProject,
  onCreateTask,
  onUpdateTaskStatus,
  onDeleteTask,
}: {
  tasks: Task[];
  canEditProject: boolean;
  onCreateTask: () => void;
  onUpdateTaskStatus: (taskId: TaskId, status: TaskStatus) => void;
  onDeleteTask: (taskId: TaskId) => void;
}) {
  const groupedStatuses: TaskStatus[] = ["todo", "in_progress", "done", "archived"];

  return (
    <div className="grid h-auto min-h-0 grid-cols-1 gap-4 pt-5 md:grid-cols-2 xl:h-full xl:grid-cols-4">
      {groupedStatuses.map((status) => (
        <section
          key={status}
          className="min-h-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-soft)]"
        >
          <PanelHeader
            title={taskStatusLabels[status]}
            detail={`${tasks.filter((task) => task.status === status).length} tasks`}
          />
          <div className="space-y-3 p-3">
            {tasks.filter((task) => task.status === status).length === 0 ? (
              <EmptyState
                title={status === "todo" ? "No tasks yet" : "Empty"}
                detail={
                  status === "todo"
                    ? canEditProject
                      ? "Add a task when the next step is clear."
                      : "Restore the project before adding tasks."
                    : "Tasks appear here as their state changes."
                }
                actionLabel={status === "todo" && canEditProject ? "New Task" : undefined}
                onAction={status === "todo" && canEditProject ? onCreateTask : undefined}
              />
            ) : (
              tasks
                .filter((task) => task.status === status)
                .map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    canEditProject={canEditProject}
                    onUpdateTaskStatus={onUpdateTaskStatus}
                    onDeleteTask={onDeleteTask}
                  />
                ))
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
