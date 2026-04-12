# UI/UX Overhaul -- Design Spec

Comprehensive UI/UX improvement pass across all 6 modules of Academics OS, covering animations, loading states, data visualization, mobile responsiveness, accessibility, and interaction feedback.

## Scope

10 improvement areas organized into 5 implementation batches:

1. Foundation Layer (animations, loading, empty states, feedback)
2. Data & Charts (chart polish, data density, visual hierarchy)
3. Navigation & Mobile (bottom tab bar, sidebar polish, touch targets)
4. Feature UX (knowledge base chat, progress visualization)
5. Accessibility (a11y audit + fixes)

## Batch 1: Foundation Layer

### Page Transitions & Micro-animations

Extend existing `src/components/ui/animated.tsx` and apply across all pages:

- **StaggerList/StaggerItem**: Apply to every grid/list page (dashboard cards, progress grid rows, alerts list, tasks list, knowledge category grid, grades table rows)
- **FadeIn**: All page headers (`h1` + description) fade up on mount
- **InteractiveCard**: All clickable cards (course cards, category cards, alert cards) scale 1.01 on hover, 0.98 on tap
- **AnimatedNumber**: GPA display, unit counts, term counts -- animate on value change
- **Page transition**: Wrap `{children}` in layout.tsx with a fade transition on route change using framer-motion `AnimatePresence`
- **Progress ring**: Animate stroke-dashoffset on mount (currently instant)
- **`prefers-reduced-motion`**: All animations wrapped in a motion-safe check. Framer-motion respects this natively via `useReducedMotion`

### Skeleton Loaders

Create `src/components/ui/skeleton-cards.tsx` with reusable skeletons:

- **DashboardSkeleton**: 3 stat cards (pulse rectangles) + 2 bottom cards
- **ProgressSkeleton**: Grid of pulse rectangles matching 4-year x 3-term layout
- **GradesSkeleton**: 2 chart placeholders + table rows
- **AlertsSkeleton**: 3 card-shaped pulse blocks
- **TasksSkeleton**: Input bar + 3 task rows
- **KnowledgeSkeleton**: Chat area + category grid

Each page wraps its async data in `<Suspense fallback={<PageSkeleton />}>`.

### Empty States

Create `src/components/ui/empty-state.tsx`:

```tsx
interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}
```

Apply to:
- Tasks page: `CheckSquare` icon, "No tasks yet", "Add your first task above"
- Alerts page (no alerts): `Bell` icon, "All clear", "No active alerts right now"
- Knowledge chat (no messages): `Bot` icon, "Ask me anything about MMDC" (already has this, keep it)

### Toast Feedback

Use shadcn `sonner` (already installed) for all mutations:
- Task created: `toast.success("Task added")`
- Task completed: `toast.success("Task completed")`
- Task deleted: `toast("Task deleted", { action: { label: "Undo", onClick: undoDelete } })`
- Alert dismissed: `toast("Alert dismissed")`
- Alerts refreshed: `toast.success("Alerts refreshed", { description: "Found N alerts" })`

## Batch 2: Data & Charts

### Chart Theme

Create `src/lib/chart-theme.ts` with shared Recharts config:

```ts
export const chartTheme = {
  grid: { stroke: "hsl(var(--border))", strokeDasharray: "3 3" },
  axis: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
  tooltip: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: 8,
    boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
  },
  colors: {
    primary: "hsl(var(--primary))",
    emerald: "#10b981",
    amber: "#f59e0b",
    red: "#ef4444",
    blue: "#6366f1",
    violet: "#8b5cf6",
  },
};
```

### GPA Trend Chart Improvements
- Gradient fill under the line (primary color, fading to transparent)
- Animated line draw on mount
- Custom tooltip showing term, GPA, descriptor, unit count
- Dot glow effect on hover

### Grade Distribution Improvements
- Rounded bar corners (already have radius)
- Animated bar entrance (grow from bottom)
- Hover: bar brightens + exact count label appears

### Course Table Improvements
- Subtle alternating row tints (`even:bg-muted/5`)
- Course codes in `font-mono text-xs` for scan-ability
- Grade badges: add subtle background tint matching grade color at 10% opacity
- Sticky header on scroll
- Sort indicators on column headers

### GPA Simulator
- Animated projected GPA number when hypothetical grades change
- Color indicator: green if projected GPA improves, amber if same, red if drops
- "Reset" button to clear all selections

### Card System
- Consistent card styling across all pages: `border-border/[6%]` hairline border
- Hover state: `border-border/[12%]` + subtle `shadow-sm`
- Transition: `transition-all duration-150`

## Batch 3: Navigation & Mobile

### Bottom Tab Bar (mobile < 768px)

Create `src/components/layout/bottom-nav.tsx`:

5 tabs: Dashboard, Progress, Grades, Knowledge, Tasks
- Icons from lucide-react (same as sidebar)
- Active tab: filled icon + primary color label
- Inactive: muted icon + text
- Fixed bottom, safe-area-bottom padding
- 56px height + safe area
- Alerts accessible via bell icon in top bar (not in bottom nav)

Show bottom nav only on `< 768px`. Hide sidebar on mobile.

### Sidebar Polish (desktop)

- **Active indicator**: Animated left border (2px primary, slides to active item)
- **Notification dot**: Red dot on Alerts nav item when unread alerts > 0 (fetch count)
- **Collapse mode**: On medium screens (768-1024px), collapse to icon-only with tooltips on hover
- **User section**: Bottom of sidebar shows student name + roll number (small text)

### Touch & Responsive

- All interactive elements: minimum 44px tap target
- Cards: `p-4` on mobile, `p-6` on desktop
- Grid breakpoints: 1 col mobile, 2 col tablet, 3 col desktop (already mostly done)
- No horizontal scroll: audit all pages
- `min-h-dvh` on html (already set)
- Safe area: `pb-safe` on bottom-nav

### Mobile Page Headers
- Smaller heading on mobile: `text-xl` instead of `text-2xl`
- Description hidden on mobile to save space

## Batch 4: Feature UX

### Knowledge Base Chat

Install `react-markdown` and `remark-gfm`:

- **Markdown rendering**: AI responses rendered as markdown (headings, lists, bold, code blocks)
- **Source citations**: After AI response, show source cards: `[FAQ: Article Title](url)` rendered as clickable chips
- **Typing indicator**: Three bouncing dots (already exists, keep it)
- **Conversation starters**: 3 suggested question cards (already exists, refine styling to match new theme)
- **Chat scroll**: Auto-scroll to latest message, scroll-to-bottom button if user scrolls up
- **Message timestamps**: Small relative time under each message ("just now", "2m ago")

### Progress Tracker Visualization

- **Prerequisite lines**: SVG lines connecting prerequisite courses to their dependents. Color: muted for met, red for blocked. Only visible when a course is hovered/selected.
- **Course detail sheet**: Replace popover with a Sheet (slide-in panel) showing full course info: title, code, units, type, prerequisites list, courses it unlocks, current status, grade if taken.
- **Status glow**: On hover, course card gets a subtle glow matching its status color (emerald glow for passed, red for INC, amber for available)
- **Year section headers**: Sticky headers as you scroll through the curriculum
- **Animated status**: When alert refresh changes a course status (e.g., INC completed), the card color transitions smoothly

## Batch 5: Accessibility

### Skip Link
Add to `layout.tsx` before sidebar:
```tsx
<a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:bg-background focus:text-foreground">
  Skip to main content
</a>
```
Add `id="main-content"` to the `<main>` element.

### ARIA Labels

Every icon-only button gets `aria-label`:
- Sidebar toggle: "Toggle sidebar"
- Theme toggle: "Toggle theme" (already has sr-only span)
- Bell button: "View notifications"
- Plus button: "Quick add task"
- Alert dismiss (X): "Dismiss alert"
- Task delete: "Delete task"
- Task checkbox: "Mark {title} as complete/incomplete"
- Send button (knowledge): "Send message"

### Focus Visibility

Update `globals.css` base layer:
```css
*:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

Remove any `outline-none` that removes focus rings from interactive elements (keep on non-interactive containers).

### Keyboard Navigation

- Tab order matches visual order (verify all pages)
- Command palette: already keyboard accessible (Cmd+K, arrow keys, Enter)
- Alert dismiss: Enter/Space to dismiss
- Task toggle: Enter/Space to toggle
- Course card: Enter to open detail sheet
- Escape closes all modals/sheets/command palette

### Screen Reader

- Alert feed: `role="alert"` wrapper so new alerts are announced
- Toast: sonner already uses `aria-live` (verify)
- Charts: Add `aria-label` describing the chart's key insight (e.g., "GPA trend chart showing improvement from 1.5 to 1.3 over 3 terms")
- Empty states: meaningful text (not just visual)

### Color-Not-Only

Status indicators must not rely on color alone:
- Course status: Add text label or icon alongside color (checkmark for passed, lock for locked, clock for in-progress, warning triangle for INC)
- Alert severity: Already has icons (AlertTriangle, AlertCircle, Info) -- good
- Grade badges: Already show numeric value -- good

## Dependencies

New packages needed:
- `react-markdown` + `remark-gfm` (for knowledge base chat markdown rendering)

Everything else uses existing packages (framer-motion, recharts, lucide-react, shadcn).

## Design Tokens Reference

From persisted design system (`design-system/academics-os/MASTER.md`):
- Easing: `cubic-bezier(0.16, 1, 0.3, 1)` (expo.out)
- Micro-interaction duration: 150-200ms
- Page transition: 300-400ms
- Scale on press: 0.97-0.98
- Scale on hover: 1.01-1.02
- Border: `oklch(1 0 0 / 6%)` default, `oklch(1 0 0 / 12%)` hover
- Glow: `0 0 0 1px {color}20` (status color at 12% opacity)
- Touch target: 44px minimum
- Bottom nav height: 56px + safe area
- Skeleton: `animate-pulse` with `bg-muted/50`
