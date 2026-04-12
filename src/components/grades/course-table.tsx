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
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
    case "blue":
      return "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25";
    case "amber":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/25";
    case "orange":
      return "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/25";
    case "red":
      return "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/25";
    default:
      return "bg-zinc-500/15 text-zinc-700 dark:text-zinc-400 border-zinc-500/25";
  }
}

export function CourseTable({ courses }: CourseTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader className="sticky top-0 bg-card z-10">
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Term</TableHead>
            <TableHead className="text-center">Units</TableHead>
            <TableHead className="text-center">Grade</TableHead>
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
                <TableRow key={`${course.code}-${course.term}-${course.schoolYear}`} className="even:bg-muted/5">
                  <TableCell className="font-mono text-xs font-medium">
                    {course.code}
                  </TableCell>
                  <TableCell>{course.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {course.term} {course.schoolYear}
                  </TableCell>
                  <TableCell className="text-center">{course.units}</TableCell>
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
