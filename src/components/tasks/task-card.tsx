"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
    <Card className={task.completed ? "opacity-60" : ""}>
      <CardContent className="flex items-start gap-3 py-3">
        <input
          type="checkbox"
          checked={task.completed ?? false}
          onChange={handleToggle}
          disabled={isPending}
          className="mt-1 h-4 w-4 rounded border-border accent-primary cursor-pointer"
          aria-label={`Mark "${task.title}" as ${task.completed ? "incomplete" : "complete"}`}
        />
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
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {task.due_date && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(task.due_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            )}
            {task.course_title && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                {task.course_title}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Delete task"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
