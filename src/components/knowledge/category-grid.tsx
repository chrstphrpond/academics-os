import Link from "next/link";
import { Card } from "@/components/ui/card";
import {
  Rocket,
  ClipboardList,
  GraduationCap,
  Library,
  HeartHandshake,
  MonitorSmartphone,
  Wallet,
  Briefcase,
  TrendingUp,
  Users,
  HelpCircle,
  MessageSquare,
  Newspaper,
} from "lucide-react";

const CATEGORIES = [
  { name: "Getting Started", slug: "getting-started", icon: Rocket },
  { name: "Enrollment & Admissions", slug: "enrollment-admissions", icon: ClipboardList },
  { name: "Academic Programs", slug: "academic-programs", icon: GraduationCap },
  { name: "College Resources", slug: "college-resources", icon: Library },
  { name: "Student Services", slug: "student-services", icon: HeartHandshake },
  { name: "Tech Tips", slug: "tech-tips", icon: MonitorSmartphone },
  { name: "Tuition & Aid", slug: "tuition-aid", icon: Wallet },
  { name: "Internship & Graduation", slug: "internship-graduation", icon: Briefcase },
  { name: "Career Development", slug: "career-development", icon: TrendingUp },
  { name: "Clubs & Orgs", slug: "clubs-orgs", icon: Users },
  { name: "FAQs", slug: "faqs", icon: HelpCircle },
  { name: "Feedback", slug: "feedback", icon: MessageSquare },
  { name: "News", slug: "news", icon: Newspaper },
];

export function CategoryGrid() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        return (
          <Link key={cat.slug} href={`/knowledge/${cat.slug}`}>
            <Card className="flex flex-col items-center gap-2 p-4 text-center transition-colors hover:bg-muted/50">
              <div className="rounded-lg bg-primary/10 p-2">
                <Icon className="size-5 text-primary" />
              </div>
              <span className="text-sm font-medium">{cat.name}</span>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
