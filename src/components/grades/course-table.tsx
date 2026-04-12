import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getGradeColor } from "@/lib/constants";

export interface CourseGradeRow {
  code: string;
  title: string;
  term: string;
  schoolYear: string;
  units: number;
  grade: string | null;
  status: string;
}

interface CourseTableProps {
  courses: CourseGradeRow[];
}

function gradeBadgeClass(color: string): string {
  switch (color) {
    case "emerald":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "blue":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "amber":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "orange":
      return "bg-orange-500/10 text-orange-400 border-orange-500/20";
    case "red":
      return "bg-red-500/10 text-red-400 border-red-500/20";
    default:
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
  }
}

export function CourseTable({ courses }: CourseTableProps) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden backdrop-blur-sm">
      <Table>
        <TableHeader className="sticky top-0 z-10">
          <TableRow className="border-b border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.03]">
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Code</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Title</TableHead>
            <TableHead className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Term</TableHead>
            <TableHead className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Units</TableHead>
            <TableHead className="text-center text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Grade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No enrolled courses found.
              </TableCell>
            </TableRow>
          ) : (
            courses.map((course) => {
              const color = course.grade
                ? getGradeColor(course.grade)
                : "zinc";
              return (
                <TableRow
                  key={`${course.code}-${course.term}-${course.schoolYear}`}
                  className="border-b border-white/[0.04] even:bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {course.code}
                  </TableCell>
                  <TableCell className="text-sm">{course.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {course.term} {course.schoolYear}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{course.units}</TableCell>
                  <TableCell className="text-center">
                    {course.grade ? (
                      <Badge
                        variant="outline"
                        className={gradeBadgeClass(color)}
                      >
                        {course.grade}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">
                        {course.status === "in_progress" ? "In Progress" : "--"}
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
