"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTask } from "@/actions/tasks";
import { toast } from "sonner";

export function QuickAddTask() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createTask(formData);
      formRef.current?.reset();
      router.refresh();
      toast.success("Task added");
    });
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex gap-2">
      <Input
        name="title"
        placeholder="Add a task..."
        required
        className="flex-1"
        disabled={isPending}
      />
      <Input
        name="due_date"
        type="date"
        className="w-40"
        disabled={isPending}
      />
      <Button type="submit" size="icon" disabled={isPending} aria-label="Add task">
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
