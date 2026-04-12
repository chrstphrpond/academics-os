"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { uploadTranscript } from "@/actions/transcript";

interface ParsedRow {
  courseCode: string;
  courseTitle: string;
  credits: string;
  grade: string;
  status: string;
}

function gradeToStatus(grade: string): string {
  if (!grade || grade.trim() === "") return "in_progress";
  const g = grade.trim().toUpperCase();
  if (g === "INC") return "inc";
  if (g === "DRP") return "drp";
  if (g === "F" || g === "5.00") return "failed";
  return "passed";
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

function parseFile(text: string): ParsedRow[] {
  const lines = text.split("\n").map((l) => l.trim());

  // Find header row
  let headerIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].toLowerCase().startsWith("term,course code")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) return [];

  const rows: ParsedRow[] = [];
  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const fields = parseCsvLine(line);
    const courseCode = (fields[1] || "").trim();
    const courseTitle = (fields[2] || "").trim();
    const credits = (fields[3] || "").trim();
    const grade = (fields[4] || "").trim();

    if (!courseCode) continue;

    rows.push({
      courseCode,
      courseTitle,
      credits,
      grade,
      status: gradeToStatus(grade),
    });
  }

  return rows;
}

const statusColors: Record<string, string> = {
  passed: "text-emerald-600 dark:text-emerald-400",
  in_progress: "text-blue-600 dark:text-blue-400",
  inc: "text-amber-600 dark:text-amber-400",
  drp: "text-zinc-500",
  failed: "text-red-600 dark:text-red-400",
};

export function TranscriptUpload() {
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<ParsedRow[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setFile(selected);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseFile(text);
      setPreview(rows);
    };
    reader.readAsText(selected);
  }

  function handleImport() {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    startTransition(async () => {
      const result = await uploadTranscript(formData);
      if (result.success) {
        toast.success(`Imported ${result.count} enrollments`);
        if (result.unmatched && result.unmatched.length > 0) {
          toast.warning(`${result.unmatched.length} courses not found: ${result.unmatched.join(", ")}`);
        }
        setOpen(false);
        setPreview([]);
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      setPreview([]);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" />
        }
      >
        <Upload className="h-4 w-4 mr-1.5" />
        Update Transcript
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Transcript CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-dashed border-muted-foreground/30 p-4 hover:border-muted-foreground/50 transition-colors">
            <FileUp className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground">
              {file ? file.name : "Choose a .csv file..."}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="sr-only"
            />
          </label>

          {preview.length > 0 && (
            <div className="max-h-60 overflow-auto rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="text-left p-2 font-medium">Code</th>
                    <th className="text-left p-2 font-medium">Grade</th>
                    <th className="text-left p-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t border-border/50">
                      <td className="p-2 font-mono">{row.courseCode}</td>
                      <td className="p-2">{row.grade || "-"}</td>
                      <td className={`p-2 font-medium ${statusColors[row.status] ?? ""}`}>
                        {row.status.replace("_", " ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {preview.length} courses found. This will replace all existing enrollment records.
            </p>
          )}
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" size="sm" />}>
            Cancel
          </DialogClose>
          <Button
            size="sm"
            disabled={preview.length === 0 || isPending}
            onClick={handleImport}
          >
            {isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {isPending ? "Importing..." : `Import ${preview.length} courses`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
