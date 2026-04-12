"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Calendar, Check } from "lucide-react";
import { motion } from "framer-motion";
import { toggleTask, deleteTask } from "@/actions/tasks";
import { toast } from "sonner";

export interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  due_date: string | null;
  completed: boolean | null;
  course_title: string | null;
}

export function TaskCard({ task }: { task: TaskItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    const newCompleted = !task.completed;
    startTransition(async () => {
      await toggleTask(task.id, newCompleted);
      router.refresh();
      toast.success(newCompleted ? "Task completed" : "Task reopened");
    });
  }

  function handleDelete() {
    startTransition(async () => {
      await deleteTask(task.id);
      router.refresh();
      toast("Task deleted");
    });
  }

  return (
    <div
      className={`group bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3 transition-colors hover:bg-white/[0.04] ${task.completed ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className="mt-0.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
          aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
        >
          {task.completed ? (
            <motion.span
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              className="h-5 w-5 rounded-full bg-primary flex items-center justify-center"
            >
              <Check className="h-3 w-3 text-primary-foreground" />
            </motion.span>
          ) : (
            <span className="h-5 w-5 rounded-full border-2 border-white/20 hover:border-primary transition-colors flex items-center justify-center" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}
          >
            {task.title}
          </p>
          {task.description && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {task.description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {task.due_date && (
              <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 tabular-nums">
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {task.course_title && (
              <span className="bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 text-[10px] font-medium">
                {task.course_title}
              </span>
            )}
          </div>
        </div>
        <button
          className="h-7 w-7 shrink-0 flex items-center justify-center rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
