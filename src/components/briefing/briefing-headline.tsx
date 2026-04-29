export function BriefingHeadline({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground">
      {children}
    </h2>
  );
}
