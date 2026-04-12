# UI/UX Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Comprehensive UI/UX improvement across all 6 modules -- animations, loading states, chart polish, mobile navigation, knowledge base chat UX, progress visualization, and accessibility.

**Architecture:** Extend existing component library with animation wrappers, skeleton loaders, empty states, and toast feedback. Polish charts with shared theme config. Add mobile bottom nav. Upgrade knowledge chat with markdown rendering. Add accessibility attributes throughout.

**Tech Stack:** framer-motion (existing), recharts (existing), react-markdown + remark-gfm (new), shadcn/ui (existing), lucide-react (existing)

**Spec:** `docs/superpowers/specs/2026-04-12-ui-ux-overhaul-design.md`

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx                          # Modify: add skip link, page transition wrapper, bottom nav
│   ├── page.tsx                            # Modify: add Suspense + skeleton
│   ├── progress/page.tsx                   # Modify: add Suspense + skeleton, stagger
│   ├── grades/page.tsx                     # Modify: add Suspense + skeleton
│   ├── alerts/page.tsx                     # Modify: add Suspense + skeleton, toast on refresh
│   ├── tasks/page.tsx                      # Modify: add Suspense + skeleton
│   └── knowledge/page.tsx                  # Modify: add stagger to category grid
├── components/
│   ├── layout/
│   │   ├── app-sidebar.tsx                 # Modify: active indicator, notification dot, user section
│   │   ├── top-bar.tsx                     # Modify: aria-labels
│   │   ├── bottom-nav.tsx                  # Create: mobile bottom tab bar
│   │   └── command-palette.tsx             # No change
│   ├── ui/
│   │   ├── animated.tsx                    # Modify: add PageTransition component
│   │   ├── empty-state.tsx                 # Create: reusable empty state
│   │   └── skeleton-cards.tsx              # Create: page-specific skeletons
│   ├── dashboard/
│   │   ├── gpa-card.tsx                    # Modify: AnimatedNumber
│   │   ├── progress-ring.tsx               # Modify: animated stroke on mount
│   │   └── graduation-countdown.tsx        # Modify: AnimatedNumber
│   ├── progress/
│   │   ├── course-card.tsx                 # Modify: status icons, glow on hover, open Sheet
│   │   ├── curriculum-grid.tsx             # Modify: stagger, sticky year headers
│   │   └── course-detail-sheet.tsx         # Create: slide-in panel for course details
│   ├── grades/
│   │   ├── gpa-trend-chart.tsx             # Modify: gradient fill, custom tooltip, animation
│   │   ├── grade-distribution.tsx          # Modify: animated bars, hover label
│   │   ├── course-table.tsx                # Modify: alternating rows, sticky header
│   │   └── gpa-simulator.tsx              # Modify: animated projected GPA, reset button
│   ├── alerts/
│   │   ├── alert-card.tsx                  # Modify: InteractiveCard wrapper, aria-label on dismiss
│   │   └── alert-list.tsx                  # Modify: stagger, role="alert"
│   ├── knowledge/
│   │   ├── chat-interface.tsx              # Modify: markdown rendering, scroll-to-bottom, timestamps
│   │   └── category-grid.tsx              # Modify: stagger, InteractiveCard
│   └── tasks/
│       ├── task-card.tsx                   # Modify: aria-labels, toast on toggle/delete
│       ├── task-list.tsx                   # Modify: stagger
│       └── quick-add-task.tsx             # Modify: toast on create
│   ├── lib/
│   │   └── chart-theme.ts                 # Create: shared Recharts config
│   ├── actions/
│   │   ├── tasks.ts                       # Modify: return data for toast
│   │   └── alerts.ts                      # Modify: return count for toast
│   └── app/globals.css                    # Modify: focus-visible, safe area
```

---

## Batch 1: Foundation Layer

### Task 1: Skeleton Loaders + Empty States

**Files:**
- Create: `src/components/ui/skeleton-cards.tsx`
- Create: `src/components/ui/empty-state.tsx`

- [ ] **Step 1: Create skeleton components**

Create `src/components/ui/skeleton-cards.tsx`:

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Skeleton className="h-52 rounded-xl" />
        <Skeleton className="h-52 rounded-xl lg:col-span-2" />
      </div>
    </div>
  );
}

export function ProgressSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      {[1, 2, 3, 4].map((y) => (
        <div key={y} className="space-y-3">
          <Skeleton className="h-6 w-24" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((t) => (
              <div key={t} className="space-y-2">
                <Skeleton className="h-4 w-20" />
                {[1, 2, 3, 4].map((c) => (
                  <Skeleton key={c} className="h-16 rounded-lg" />
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function GradesSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}

export function AlertsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-full" />
        ))}
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

export function TasksSkeleton() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="flex gap-2">
        <Skeleton className="h-10 flex-1 rounded-lg" />
        <Skeleton className="h-10 w-40 rounded-lg" />
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

export function KnowledgeSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
      <div>
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create empty state component**

Create `src/components/ui/empty-state.tsx`:

```tsx
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-4">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="text-sm font-medium mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-[240px]">{description}</p>
      {action && (
        <Button variant="outline" size="sm" className="mt-4" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/skeleton-cards.tsx src/components/ui/empty-state.tsx
git commit -m "feat: add skeleton loaders and empty state component"
```

---

### Task 2: Apply Animations + Skeletons to All Pages

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/progress/page.tsx`
- Modify: `src/app/grades/page.tsx`
- Modify: `src/app/alerts/page.tsx`
- Modify: `src/app/tasks/page.tsx`
- Modify: `src/app/knowledge/page.tsx`
- Modify: `src/components/ui/animated.tsx`

- [ ] **Step 1: Add PageHeader component to animated.tsx**

Append to `src/components/ui/animated.tsx`:

```tsx
// Animated page header
export function PageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <FadeIn>
      <h1 className="text-2xl font-bold tracking-tight md:text-2xl text-xl">{title}</h1>
      <p className="text-muted-foreground mt-1 text-sm hidden sm:block">{description}</p>
    </FadeIn>
  );
}
```

- [ ] **Step 2: Wrap each page's async data in Suspense with skeleton fallback**

For each page file, the pattern is:
1. Import the page-specific skeleton from `skeleton-cards.tsx`
2. Extract async data fetching into a separate async component
3. Wrap in `<Suspense fallback={<PageSkeleton />}>`
4. Replace the hardcoded `<h1>` header with `<PageHeader title="..." description="..." />`
5. Wrap grid/list areas with `<StaggerList>` and `<StaggerItem>`

Apply this pattern to all 6 pages. Read each page file first, then modify it. The dashboard page (`src/app/page.tsx`) already uses `DashboardHeader` and `DashboardGrid` -- just add Suspense around the data-fetching parts.

For `src/app/alerts/page.tsx`, also wrap the alert list in `<StaggerList>`.
For `src/app/tasks/page.tsx`, wrap task list in stagger.
For `src/app/knowledge/page.tsx`, wrap CategoryGrid items in stagger.

- [ ] **Step 3: Apply InteractiveCard to clickable elements**

Wrap these components with `<InteractiveCard>`:
- `src/components/alerts/alert-card.tsx` -- wrap the outer Card
- `src/components/knowledge/category-grid.tsx` -- wrap each Link card
- `src/components/progress/course-card.tsx` -- wrap the button element

- [ ] **Step 4: Apply AnimatedNumber to dashboard stats**

In `src/components/dashboard/gpa-card.tsx`, replace the GPA number display with `<AnimatedNumber value={gpa.gpa} decimals={2} />`.

In `src/components/dashboard/graduation-countdown.tsx`, replace the terms number with `<AnimatedNumber value={estimatedTerms} />`.

- [ ] **Step 5: Animate progress ring on mount**

In `src/components/dashboard/progress-ring.tsx`, add framer-motion to animate the SVG circle's `strokeDashoffset` from `circumference` (empty) to the calculated value on mount. Use `motion.circle` with `initial={{ strokeDashoffset: circumference }}` and `animate={{ strokeDashoffset }}` with `transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}`.

- [ ] **Step 6: Verify and commit**

```bash
pnpm build
git add src/
git commit -m "feat: add animations, skeletons, and stagger effects to all pages"
```

---

### Task 3: Toast Feedback System

**Files:**
- Modify: `src/actions/tasks.ts`
- Modify: `src/actions/alerts.ts`
- Modify: `src/components/tasks/quick-add-task.tsx`
- Modify: `src/components/tasks/task-card.tsx`
- Modify: `src/components/alerts/alert-card.tsx`
- Modify: `src/app/alerts/page.tsx`

- [ ] **Step 1: Update server actions to return status**

In `src/actions/tasks.ts`, make `createTask` return `{ success: true }`, `toggleTask` return `{ success: true, completed }`, and `deleteTask` return `{ success: true }`.

In `src/actions/alerts.ts`, make `refreshAlerts` return `{ count: number }` (the number of alerts generated) and `dismissAlert` return `{ success: true }`.

- [ ] **Step 2: Add toast calls to task components**

In `src/components/tasks/quick-add-task.tsx`:
```tsx
import { toast } from "sonner";
// After createTask call:
toast.success("Task added");
```

In `src/components/tasks/task-card.tsx`:
```tsx
import { toast } from "sonner";
// After toggleTask: toast.success(completed ? "Task completed" : "Task reopened");
// After deleteTask: toast("Task deleted");
```

- [ ] **Step 3: Add toast calls to alert components**

In `src/components/alerts/alert-card.tsx`:
```tsx
import { toast } from "sonner";
// After dismissAlert: toast("Alert dismissed");
```

In `src/app/alerts/page.tsx`, update the refresh button to show toast with alert count after `refreshAlerts` completes. This requires converting the form to a client component or using `useActionState`.

- [ ] **Step 4: Apply empty states**

In `src/components/tasks/task-list.tsx`, replace the "No tasks yet" text with `<EmptyState icon={CheckSquare} title="No tasks yet" description="Add your first task above" />`.

In `src/components/alerts/alert-list.tsx`, replace "No alerts" text with `<EmptyState icon={Bell} title="All clear" description="No active alerts right now" />`.

- [ ] **Step 5: Verify and commit**

```bash
pnpm build
git add src/
git commit -m "feat: add toast feedback on mutations and designed empty states"
```

---

## Batch 2: Data & Charts

### Task 4: Chart Theme + GPA Trend Polish

**Files:**
- Create: `src/lib/chart-theme.ts`
- Modify: `src/components/grades/gpa-trend-chart.tsx`

- [ ] **Step 1: Create shared chart theme**

Create `src/lib/chart-theme.ts`:

```ts
export const chartTheme = {
  grid: { stroke: "hsl(var(--border))", strokeDasharray: "3 3" },
  axis: {
    fontSize: 11,
    fill: "hsl(var(--muted-foreground))",
    tickLine: false,
    axisLine: false,
  },
  tooltip: {
    contentStyle: {
      backgroundColor: "hsl(var(--card))",
      border: "1px solid hsl(var(--border))",
      borderRadius: "8px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      fontSize: "12px",
    },
  },
};
```

- [ ] **Step 2: Upgrade GPA trend chart**

In `src/components/grades/gpa-trend-chart.tsx`:
- Import chart theme
- Add `<defs>` with `<linearGradient>` for area fill under the line (primary color, top 30% opacity to bottom 0%)
- Add `<Area>` component below the `<Line>` using the gradient fill
- Use chart theme for grid, axes, tooltip styling
- Add `animationDuration={1000}` and `animationEasing="ease-out"` to the Line

- [ ] **Step 3: Verify and commit**

```bash
pnpm build
git add src/lib/chart-theme.ts src/components/grades/gpa-trend-chart.tsx
git commit -m "feat: add chart theme and polish GPA trend chart with gradient fill"
```

---

### Task 5: Grade Distribution + Course Table + Simulator Polish

**Files:**
- Modify: `src/components/grades/grade-distribution.tsx`
- Modify: `src/components/grades/course-table.tsx`
- Modify: `src/components/grades/gpa-simulator.tsx`

- [ ] **Step 1: Polish grade distribution chart**

In `src/components/grades/grade-distribution.tsx`:
- Import and apply chart theme
- Add `animationDuration={800}` to Bar
- Add `animationBegin={200}` for staggered entrance feel

- [ ] **Step 2: Polish course table**

In `src/components/grades/course-table.tsx`:
- Add alternating row styling: `className="even:bg-muted/5"` on `<TableRow>`
- Make course code use `font-mono text-xs` for scan-ability
- Add `sticky top-0 bg-card z-10` to `<TableHeader>` for sticky header

- [ ] **Step 3: Polish GPA simulator**

In `src/components/grades/gpa-simulator.tsx`:
- Replace the projected GPA display with `<AnimatedNumber>` from animated.tsx
- Add color indicator: compare projected to current GPA -- green text if better (lower), amber if same, red if worse
- Add a "Reset" button that clears all hypothetical grade selections

- [ ] **Step 4: Verify and commit**

```bash
pnpm build
git add src/components/grades/
git commit -m "feat: polish charts, course table, and GPA simulator"
```

---

## Batch 3: Navigation & Mobile

### Task 6: Bottom Navigation Bar (Mobile)

**Files:**
- Create: `src/components/layout/bottom-nav.tsx`
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Create bottom nav component**

Create `src/components/layout/bottom-nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Map,
  GraduationCap,
  BookOpen,
  CheckSquare,
} from "lucide-react";

const tabs = [
  { label: "Home", href: "/", icon: LayoutDashboard },
  { label: "Progress", href: "/progress", icon: Map },
  { label: "Grades", href: "/grades", icon: GraduationCap },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Tasks", href: "/tasks", icon: CheckSquare },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/80 backdrop-blur-md md:hidden">
      <div className="flex h-14 items-center justify-around pb-safe">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 text-[10px] transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

- [ ] **Step 2: Add safe area CSS**

Append to `src/app/globals.css` in the `@layer base` block:

```css
.pb-safe {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}
```

- [ ] **Step 3: Add bottom nav to layout and add bottom padding to main**

In `src/app/layout.tsx`:
- Import `BottomNav` from `@/components/layout/bottom-nav`
- Add `<BottomNav />` after the SidebarProvider (inside ThemeProvider)
- Add `pb-16 md:pb-0` to the `<main>` className to prevent content being hidden behind bottom nav on mobile

- [ ] **Step 4: Verify on mobile viewport and commit**

```bash
pnpm build
git add src/components/layout/bottom-nav.tsx src/app/layout.tsx src/app/globals.css
git commit -m "feat: add mobile bottom navigation bar"
```

---

### Task 7: Sidebar Polish

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`
- Modify: `src/components/layout/top-bar.tsx`

- [ ] **Step 1: Add notification dot and user section to sidebar**

In `src/components/layout/app-sidebar.tsx`:
- Add a small red dot next to the Alerts nav item label when there are unread alerts. Since this is a client component, you can fetch alert count client-side or pass it as a prop. For simplicity, add a static dot that's always visible (we can make it dynamic later).
- Add a `SidebarFooter` section at the bottom with the student name and roll number in small text.

```tsx
// In the Alerts nav item, after the span:
{item.title === "Alerts" && (
  <span className="ml-auto h-2 w-2 rounded-full bg-destructive" />
)}

// Add SidebarFooter:
import { SidebarFooter } from "@/components/ui/sidebar";

<SidebarFooter className="border-t border-sidebar-border px-4 py-3">
  <div className="text-xs text-muted-foreground">
    <p className="font-medium text-sidebar-foreground">Christopher Pond</p>
    <p>2024370558</p>
  </div>
</SidebarFooter>
```

- [ ] **Step 2: Add aria-labels to top bar buttons**

In `src/components/layout/top-bar.tsx`:
- Add `aria-label="View notifications"` to the bell button
- Add `aria-label="Quick add task"` to the plus button
- The theme toggle already has an sr-only span

- [ ] **Step 3: Verify and commit**

```bash
pnpm build
git add src/components/layout/
git commit -m "feat: polish sidebar with notification dot, user section, and aria-labels"
```

---

## Batch 4: Feature UX

### Task 8: Knowledge Base Chat -- Markdown + UX

**Files:**
- Modify: `src/components/knowledge/chat-interface.tsx`

- [ ] **Step 1: Install react-markdown**

```bash
pnpm add react-markdown remark-gfm
```

- [ ] **Step 2: Update chat interface**

In `src/components/knowledge/chat-interface.tsx`:
- Import `ReactMarkdown` from `react-markdown` and `remarkGfm` from `remark-gfm`
- Replace the plain text rendering in the AI message part with:
```tsx
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  components={{
    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
    ul: ({ children }) => <ul className="list-disc pl-4 mb-2">{children}</ul>,
    ol: ({ children }) => <ol className="list-decimal pl-4 mb-2">{children}</ol>,
    li: ({ children }) => <li className="mb-0.5">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    code: ({ children }) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{children}</code>
    ),
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2">
        {children}
      </a>
    ),
  }}
>
  {part.text}
</ReactMarkdown>
```

- Add auto-scroll: Use a `useRef` on the message container and `useEffect` that scrolls to bottom when messages change.
- Add relative timestamps: Create a small helper `function timeAgo(date: Date): string` and show it under each message.

- [ ] **Step 3: Verify and commit**

```bash
pnpm build
git add src/components/knowledge/chat-interface.tsx pnpm-lock.yaml package.json
git commit -m "feat: add markdown rendering and UX polish to knowledge base chat"
```

---

### Task 9: Progress Tracker -- Course Detail Sheet + Status Icons

**Files:**
- Create: `src/components/progress/course-detail-sheet.tsx`
- Modify: `src/components/progress/course-card.tsx`

- [ ] **Step 1: Create course detail sheet**

Create `src/components/progress/course-detail-sheet.tsx`:

```tsx
"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, Lock, Clock, AlertTriangle, Circle, XCircle, Minus } from "lucide-react";
import type { CourseStatus } from "@/lib/types";

// Status icon mapping
const statusConfig: Record<CourseStatus, { icon: typeof CheckCircle; label: string; className: string }> = {
  passed: { icon: CheckCircle, label: "Passed", className: "text-emerald-500" },
  in_progress: { icon: Clock, label: "In Progress", className: "text-blue-500" },
  available: { icon: Circle, label: "Available", className: "text-amber-500" },
  locked: { icon: Lock, label: "Locked", className: "text-muted-foreground" },
  inc: { icon: AlertTriangle, label: "Incomplete", className: "text-red-500" },
  drp: { icon: Minus, label: "Dropped", className: "text-muted-foreground" },
  failed: { icon: XCircle, label: "Failed", className: "text-red-500" },
  not_taken: { icon: Circle, label: "Not Taken", className: "text-muted-foreground" },
};

interface CourseDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: {
    code: string;
    title: string;
    units: number;
    type: string;
    status: CourseStatus;
    grade?: string | null;
    prerequisites: string[];
    unlocks: string[];
  } | null;
}

export function CourseDetailSheet({ open, onOpenChange, course }: CourseDetailSheetProps) {
  if (!course) return null;

  const config = statusConfig[course.status];
  const StatusIcon = config.icon;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="text-left">{course.title}</SheetTitle>
          <SheetDescription className="text-left font-mono">{course.code}</SheetDescription>
        </SheetHeader>
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-2">
            <StatusIcon className={`h-4 w-4 ${config.className}`} />
            <span className="text-sm">{config.label}</span>
            {course.grade && <Badge variant="outline" className="ml-auto">{course.grade}</Badge>}
          </div>
          <Separator />
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Units</p>
              <p className="font-medium">{course.units}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Type</p>
              <p className="font-medium">{course.type}</p>
            </div>
          </div>
          {course.prerequisites.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Prerequisites</p>
              <div className="flex flex-wrap gap-1.5">
                {course.prerequisites.map((p) => (
                  <Badge key={p} variant="secondary" className="font-mono text-xs">{p}</Badge>
                ))}
              </div>
            </div>
          )}
          {course.unlocks.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Unlocks</p>
              <div className="flex flex-wrap gap-1.5">
                {course.unlocks.map((u) => (
                  <Badge key={u} variant="outline" className="font-mono text-xs">{u}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Add status icons to course cards**

In `src/components/progress/course-card.tsx`:
- Import status icons (CheckCircle, Lock, Clock, AlertTriangle, Circle)
- Add a small icon next to the course code that indicates status (same mapping as the sheet)
- This ensures color-not-only accessibility: each status has an icon + color

- [ ] **Step 3: Connect course cards to the detail sheet**

In `src/components/progress/curriculum-grid.tsx` or its parent page:
- Add state: `const [selectedCourse, setSelectedCourse] = useState(null)`
- Pass an `onSelect` callback to CourseCard
- Render `<CourseDetailSheet>` at the bottom of the page
- On card click, set selected course and open the sheet

- [ ] **Step 4: Verify and commit**

```bash
pnpm build
git add src/components/progress/
git commit -m "feat: add course detail sheet with status icons for progress tracker"
```

---

## Batch 5: Accessibility

### Task 10: Accessibility Pass

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Modify: `src/components/alerts/alert-card.tsx`
- Modify: `src/components/alerts/alert-list.tsx`
- Modify: `src/components/tasks/task-card.tsx`
- Modify: `src/components/knowledge/chat-interface.tsx`
- Modify: `src/components/grades/gpa-trend-chart.tsx`
- Modify: `src/components/grades/grade-distribution.tsx`

- [ ] **Step 1: Add skip link to layout**

In `src/app/layout.tsx`, add as the first child inside `<body>`:

```tsx
<a
  href="#main-content"
  className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:p-3 focus:bg-background focus:text-foreground focus:border focus:border-border focus:rounded-md focus:top-2 focus:left-2"
>
  Skip to main content
</a>
```

Add `id="main-content"` to the `<main>` element.

- [ ] **Step 2: Add focus-visible styles to globals.css**

In `src/app/globals.css`, add to the `@layer base` block:

```css
:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

- [ ] **Step 3: Add aria-labels to interactive elements**

In `src/components/alerts/alert-card.tsx`:
- Add `aria-label="Dismiss alert"` to the dismiss button

In `src/components/tasks/task-card.tsx`:
- Add `aria-label={`Mark "${title}" as ${completed ? "incomplete" : "complete"}`}` to the checkbox
- Add `aria-label="Delete task"` to the delete button

In `src/components/knowledge/chat-interface.tsx`:
- Add `aria-label="Send message"` to the send button

- [ ] **Step 4: Add role="alert" and chart accessibility**

In `src/components/alerts/alert-list.tsx`:
- Wrap the alerts container in `<div role="region" aria-label="Alert notifications">`

In `src/components/grades/gpa-trend-chart.tsx`:
- Add `aria-label` to the card describing the chart insight: `aria-label="GPA trend chart showing performance across terms"`

In `src/components/grades/grade-distribution.tsx`:
- Add `aria-label="Grade distribution showing count of each grade earned"`

- [ ] **Step 5: Verify and commit**

```bash
pnpm build
pnpm lint
git add src/
git commit -m "feat: add accessibility improvements -- skip link, aria-labels, focus styles"
```

---

## Final Verification

### Task 11: Build Check + Final Polish

- [ ] **Step 1: Run full build**

```bash
pnpm build
```

Fix any TypeScript or build errors.

- [ ] **Step 2: Run lint**

```bash
pnpm lint
```

Fix any lint errors.

- [ ] **Step 3: Commit any fixes**

```bash
git add -A
git commit -m "chore: fix build and lint issues from UI/UX overhaul"
```

Only create this commit if there were actual changes.
