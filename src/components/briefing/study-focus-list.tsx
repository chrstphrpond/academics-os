import type { StudyFocus } from "@/lib/briefing/schema";

export function StudyFocusList({ items }: { items: StudyFocus[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Study focus
      </h3>
      <ul className="space-y-1.5 text-sm">
        {items.map((s, i) => (
          <li key={i} className="rounded-md border border-border/60 bg-muted/30 px-3 py-2">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-xs text-muted-foreground">{s.course}</span>
              <span className="font-medium text-foreground">{s.topic}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{s.why}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
