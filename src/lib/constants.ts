import type { GradeInfo } from "./types";

export const MMDC_GRADE_SCALE: GradeInfo[] = [
  { grade: 1.0, descriptor: "Excellent", color: "emerald" },
  { grade: 1.25, descriptor: "Superior", color: "emerald" },
  { grade: 1.5, descriptor: "Very Good", color: "blue" },
  { grade: 1.75, descriptor: "Good", color: "blue" },
  { grade: 2.0, descriptor: "Meritorious", color: "blue" },
  { grade: 2.25, descriptor: "Very Satisfactory", color: "amber" },
  { grade: 2.5, descriptor: "Satisfactory", color: "amber" },
  { grade: 2.75, descriptor: "Fairly Satisfactory", color: "amber" },
  { grade: 3.0, descriptor: "Passed", color: "orange" },
  { grade: 5.0, descriptor: "Failed", color: "red" },
];

export const TOTAL_UNITS_REQUIRED = 155;
export const MAX_UNITS_PER_TERM = 18;
export const TERMS_PER_YEAR = 3;

export function getGradeDescriptor(grade: number): GradeInfo | undefined {
  return MMDC_GRADE_SCALE.find((g) => g.grade === grade);
}

export function getGradeColor(grade: string): string {
  const num = parseFloat(grade);
  if (isNaN(num)) return "zinc";
  if (num <= 1.25) return "emerald";
  if (num <= 2.0) return "blue";
  if (num <= 2.75) return "amber";
  if (num <= 3.0) return "orange";
  return "red";
}

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: "LayoutDashboard" },
  { label: "Progress", href: "/progress", icon: "Map" },
  { label: "Grades", href: "/grades", icon: "GraduationCap" },
  { label: "Alerts", href: "/alerts", icon: "Bell" },
  { label: "Knowledge", href: "/knowledge", icon: "BookOpen" },
  { label: "Tasks", href: "/tasks", icon: "CheckSquare" },
] as const;
