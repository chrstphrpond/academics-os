import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { db, schema } from "@/lib/db";
import { sql } from "drizzle-orm";
import { ArticleList } from "@/components/knowledge/article-list";
import { PageHeader } from "@/components/ui/animated";
import { Button } from "@/components/ui/button";

const categorySearchTerms: Record<string, string> = {
  "getting-started": "getting started onboarding welcome orientation",
  "enrollment-and-admissions": "enrollment admission enroll registration",
  "academic-programs-and-policies": "academic program policy curriculum course",
  "college-resources": "resource library e-book database",
  "student-services": "student service advising counseling",
  "tech-tips-troubleshooting": "tech tip troubleshoot google camu",
  "tuition-scholarships-and-financial-aid": "tuition fee payment scholarship financial",
  "internship-graduation": "internship practicum graduation capstone",
  "career-development-services": "career development job employment",
  "student-engagement-clubs-orgs": "club organization student engagement activity",
  "faqs": "faq frequently asked question",
  "feedback-sentiments": "feedback suggestion sentiment",
  "news-and-announcements": "news announcement update calendar",
};

export function generateStaticParams() {
  return [{ category: "general" }];
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const title = category.replace(/-/g, " ");
  const searchTerms = categorySearchTerms[category] || category.replace(/-/g, " ");

  // Build FTS query using OR (|) for category page (matches any of the terms)
  const tsQuery = searchTerms.split(" ").join(" | ");

  const fts = sql`to_tsvector('english', ${schema.knowledgeChunks.title} || ' ' || ${schema.knowledgeChunks.content}) @@ to_tsquery('english', ${tsQuery})`;

  const articles = await db
    .select({
      id: schema.knowledgeChunks.id,
      title: schema.knowledgeChunks.title,
      content: schema.knowledgeChunks.content,
      url: schema.knowledgeChunks.url,
      source: schema.knowledgeChunks.source,
    })
    .from(schema.knowledgeChunks)
    .where(fts)
    .limit(30);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/knowledge" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title={title} description={`${articles.length} articles found`} />
      </div>
      <ArticleList articles={articles} />
    </div>
  );
}
