import { getCurrentStudentId } from "@/lib/db/auth";
import { getCachedBriefing } from "@/lib/briefing/cache";
import { BriefingHeadline } from "./briefing-headline";
import { BriefingBullets } from "./briefing-bullets";
import { RiskList } from "./risk-list";
import { StudyFocusList } from "./study-focus-list";
import { CtaActions } from "./cta-actions";
import { BriefingError } from "./briefing-error";
import { RefreshButton } from "./refresh-button";
import type { Briefing } from "@/lib/briefing/schema";

export async function BriefingHero() {
  const studentId = await getCurrentStudentId();
  if (!studentId) {
    return <BriefingError message="Sign in to see your briefing." />;
  }

  let briefing: Briefing;
  try {
    briefing = await getCachedBriefing(studentId);
  } catch (err) {
    return (
      <BriefingError
        message={
          err instanceof Error
            ? `Briefing unavailable: ${err.message}`
            : undefined
        }
      />
    );
  }

  const isEmpty =
    briefing.bullets.length === 0 &&
    briefing.risks.length === 0 &&
    briefing.studyFocus.length === 0 &&
    briefing.ctaActions.length === 0;

  return (
    <section
      aria-labelledby="briefing-headline"
      className="relative overflow-hidden rounded-lg border border-border bg-card/60 p-5 backdrop-blur"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Today&apos;s briefing
          </p>
          <BriefingHeadline>
            <span id="briefing-headline">{briefing.headline}</span>
          </BriefingHeadline>
        </div>
        <RefreshButton />
      </div>

      {isEmpty ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nothing pressing today. Enjoy the calm.
        </p>
      ) : (
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <div className="space-y-4">
            <BriefingBullets bullets={briefing.bullets} />
            <RiskList risks={briefing.risks} />
          </div>
          <div className="space-y-4">
            <StudyFocusList items={briefing.studyFocus} />
            <CtaActions actions={briefing.ctaActions} />
          </div>
        </div>
      )}
    </section>
  );
}
