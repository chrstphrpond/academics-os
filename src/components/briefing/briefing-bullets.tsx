export function BriefingBullets({ bullets }: { bullets: string[] }) {
  if (bullets.length === 0) return null;
  return (
    <ul className="space-y-1 text-sm text-foreground/85">
      {bullets.map((b, i) => (
        <li key={i} className="flex gap-2">
          <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-foreground/40" />
          <span>{b}</span>
        </li>
      ))}
    </ul>
  );
}
