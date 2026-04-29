"use client";

import { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { WhatIfView } from "./whatif-view";
import { TargetsView } from "./targets-view";
import { BandsView } from "./bands-view";
import { computeWhatIf, type GradeOverride } from "@/lib/simulator/whatif";
import type { EnrollmentWithCourse } from "@/lib/gpa";
import type { ScholarshipBand } from "@/lib/simulator/scholarships";

export interface SimulatorPanelProps {
  enrollments: EnrollmentWithCourse[];
  upcomingCourses: { code: string; title: string; units: number }[];
  bands: ScholarshipBand[];
  termHint?: string;
}

export function SimulatorPanel({
  enrollments,
  upcomingCourses,
  bands,
  termHint,
}: SimulatorPanelProps) {
  const [overrides, setOverrides] = useState<GradeOverride[]>([]);
  const result = computeWhatIf(enrollments, overrides);

  const upcomingCodes = upcomingCourses.map((c) => c.code);

  return (
    <section className="rounded-lg border border-border bg-card/60 p-4">
      <header className="mb-3">
        <h2 className="text-sm font-semibold tracking-tight">Simulator</h2>
        <p className="text-xs text-muted-foreground">
          Slide grades, ask Gemini for a target plan, or check scholarship bands.
        </p>
      </header>

      <Tabs defaultValue="whatif">
        <TabsList>
          <TabsTrigger value="whatif">What-if</TabsTrigger>
          <TabsTrigger value="targets">Targets</TabsTrigger>
          <TabsTrigger value="bands">Bands</TabsTrigger>
        </TabsList>

        <TabsContent value="whatif" className="mt-3">
          <WhatIfView
            enrollments={enrollments}
            upcomingCourses={upcomingCourses}
            overrides={overrides}
            onOverridesChange={setOverrides}
          />
        </TabsContent>

        <TabsContent value="targets" className="mt-3">
          <TargetsView
            upcomingCourseCodes={upcomingCodes}
            termHint={termHint}
            onApplyPlan={(plan) => {
              const next: GradeOverride[] = [
                ...overrides.filter(
                  (o) => !plan.picks.find((p) => p.courseCode === o.courseCode)
                ),
                ...plan.picks,
              ];
              setOverrides(next);
            }}
          />
        </TabsContent>

        <TabsContent value="bands" className="mt-3">
          <BandsView
            baselineGpa={result.baseline.gpa}
            simulatedGpa={result.simulated.gpa}
            bands={bands}
          />
        </TabsContent>
      </Tabs>
    </section>
  );
}
