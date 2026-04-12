import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { TaskList } from "@/components/tasks/task-list";
import { PageHeader } from "@/components/ui/animated";
import { TasksSkeleton } from "@/components/ui/skeleton-cards";

async function TasksContent() {
  const supabase = await createClient();

  const { data: tasks } = await supabase
    .from("tasks")
    .select("id, title, description, due_date, completed, course_id, courses(title)")
    .order("created_at", { ascending: false });

  const taskItems = (tasks ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    due_date: t.due_date,
    completed: t.completed,
    course_title: (t.courses as unknown as { title: string } | null)?.title ?? null,
  }));

  return (
    <>
      <QuickAddTask />
      <TaskList tasks={taskItems} />
    </>
  );
}

export default function TasksPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Tasks"
        description="Manage your academic tasks and deadlines"
      />

      <Suspense fallback={<TasksSkeleton />}>
        <TasksContent />
      </Suspense>
    </div>
  );
}
