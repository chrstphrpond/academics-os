"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, CheckSquare } from "lucide-react";
import { StaggerList, StaggerItem } from "@/components/ui/animated";
import { EmptyState } from "@/components/ui/empty-state";
import { TaskCard, type TaskItem } from "./task-card";

export function TaskList({ tasks }: { tasks: TaskItem[] }) {
  const [showCompleted, setShowCompleted] = useState(false);

  const pending = tasks.filter((t) => !t.completed);
  const completed = tasks.filter((t) => t.completed);

  return (
    <div className="space-y-3">
      {pending.length === 0 && completed.length === 0 && (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Add your first task above to get started" />
      )}

      <StaggerList className="space-y-3">
        {pending.map((task) => (
          <StaggerItem key={task.id}>
            <TaskCard task={task} />
          </StaggerItem>
        ))}
      </StaggerList>

      {completed.length > 0 && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? (
              <ChevronDown className="h-4 w-4 mr-1" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-1" />
            )}
            Show completed ({completed.length})
          </Button>

          {showCompleted && (
            <div className="space-y-3 mt-3">
              {completed.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
