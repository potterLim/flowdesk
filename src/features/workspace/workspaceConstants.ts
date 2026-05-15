import {
  CheckSquare,
  Clock3,
  Download,
  FileText,
  NotebookText,
  PanelLeft,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Project, Task, TaskPriority, TaskStatus, WorkspaceView } from "../../domain/workspace";

export const viewItems: Array<{ id: WorkspaceView; label: string; icon: LucideIcon }> = [
  { id: "overview", label: "Overview", icon: PanelLeft },
  { id: "notes", label: "Notes", icon: NotebookText },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "sessions", label: "Sessions", icon: Timer },
  { id: "files", label: "Files", icon: FileText },
  { id: "timeline", label: "Timeline", icon: Clock3 },
  { id: "exports", label: "Exports", icon: Download },
];

export const accentClasses: Record<Project["accent"], string> = {
  teal: "bg-[#007c78] text-white",
  blue: "bg-[#256fba] text-white",
  violet: "bg-[#7653c9] text-white",
  amber: "bg-[#a15c00] text-white",
  rose: "bg-[#b8325f] text-white",
};

export const taskStatusLabels: Record<TaskStatus, string> = {
  todo: "Todo",
  in_progress: "In Progress",
  done: "Done",
  archived: "Archived",
};

export const priorityClasses: Record<TaskPriority, string> = {
  low: "border-slate-200 bg-slate-50 text-slate-600",
  medium: "border-blue-200 bg-blue-50 text-blue-700",
  high: "border-amber-200 bg-amber-50 text-amber-700",
  urgent: "border-red-200 bg-red-50 text-red-700",
};
