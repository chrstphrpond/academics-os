import { Suspense } from "react";
import { db, schema, getCurrentStudentIdLegacy } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { QuickAddTask } from "@/components/tasks/quick-add-task";
import { TaskList } from "@/components/tasks/task-list";
import { CalendarEvents } from "@/components/tasks/calendar-events";
import { PageHeader } from "@/components/ui/animated";
import { TasksSkeleton } from "@/components/ui/skeleton-cards";

async function TasksContent() {
  const studentId = await getCurrentStudentIdLegacy().catch(() => null);

  const taskRows = studentId
    ? await db.query.tasks.findMany({
        where: eq(schema.tasks.studentId, studentId),
        with: { course: true },
        orderBy: [desc(schema.tasks.createdAt)],
      })
    : [];

  const taskItems = taskRows.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description,
    due_date: t.dueDate ?? null,
    completed: t.completed,
    course_title: t.course?.title ?? null,
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
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <PageHeader
          title="Tasks"
          description="Manage your academic tasks and deadlines"
        />

        <Suspense fallback={<TasksSkeleton />}>
          <TasksContent />
        </Suspense>
      </div>
      <CalendarEvents />
    </div>
  );
}
