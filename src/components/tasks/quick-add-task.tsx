"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { motion } from "framer-motion";
import { createTask } from "@/actions/tasks";
import { toast } from "sonner";

export function QuickAddTask() {
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [hasText, setHasText] = useState(false);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      await createTask(formData);
      formRef.current?.reset();
      setHasText(false);
      router.refresh();
      toast.success("Task added");
    });
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="flex items-center gap-2 bg-white/[0.02] backdrop-blur-sm border border-white/[0.06] rounded-xl px-3 py-2"
    >
      <input
        name="title"
        placeholder="Add a task..."
        required
        disabled={isPending}
        onChange={(e) => setHasText(e.target.value.length > 0)}
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-50"
      />
      <input
        name="due_date"
        type="date"
        disabled={isPending}
        className="w-32 bg-transparent text-xs text-muted-foreground/70 outline-none [color-scheme:dark] disabled:opacity-50"
      />
      <motion.button
        type="submit"
        disabled={isPending}
        whileTap={{ scale: 0.9 }}
        className={`h-7 w-7 flex items-center justify-center rounded-lg transition-colors shrink-0 disabled:opacity-50 ${
          hasText
            ? "bg-primary text-primary-foreground"
            : "bg-white/[0.05] text-muted-foreground"
        }`}
        aria-label="Add task"
      >
        <Plus className="h-4 w-4" />
      </motion.button>
    </form>
  );
}
