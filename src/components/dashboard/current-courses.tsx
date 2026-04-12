import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Enrollment {
  grade: string | null;
  status: string;
  course: {
    code: string;
    title: string;
    units: number;
  };
}

export function CurrentCourses({ enrollments }: { enrollments: Enrollment[] }) {
  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur-sm col-span-full lg:col-span-2">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Current Term Courses</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {enrollments.map((e) => (
            <div key={e.course.code} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{e.course.title}</p>
                <p className="text-xs text-muted-foreground">{e.course.code} · {e.course.units} units</p>
              </div>
              {e.grade ? (
                <Badge variant="outline">{e.grade}</Badge>
              ) : (
                <Badge variant="outline" className="text-muted-foreground">In Progress</Badge>
              )}
            </div>
          ))}
          {enrollments.length === 0 && (
            <p className="text-sm text-muted-foreground">No courses enrolled this term</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
