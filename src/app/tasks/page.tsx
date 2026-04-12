import { createClient } from "@/lib/supabase/server";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { TaskList } from "@/components/tasks/task-list";

export default async function TasksPage() {
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
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tasks</h1>
        <p className="text-muted-foreground mt-1">
          Manage your academic tasks and deadlines
        </p>
      </div>

      <QuickAddTask />
      <TaskList tasks={taskItems} />
    </div>
  );
}
