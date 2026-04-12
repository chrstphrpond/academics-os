"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, FileText } from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  url: string | null;
  source: string;
}

function cleanContent(content: string): string {
  return content
    // Remove navigation-style markdown links on their own line
    .replace(/^\[Skip to .*?\].*$/gm, "")
    .replace(/^\[.*?\]\(https:\/\/support\.mmdc.*?\)$/gm, "")
    // Remove lines that are just URLs
    .replace(/^https?:\/\/\S+$/gm, "")
    // Remove "URL: ..." lines
    .replace(/^URL:.*$/gm, "")
    // Remove repeated # headers that are just site navigation
    .replace(/^#{1,2}\s*(MMDC|Search|Categories|Recent activity)\s*$/gm, "")
    // Clean up excessive blank lines
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function isNavigationChunk(article: Article): boolean {
  const content = article.content.toLowerCase();
  // Skip chunks that are mostly navigation links or very short
  if (content.length < 80) return true;
  const linkCount = (content.match(/\[.*?\]\(.*?\)/g) || []).length;
  const lineCount = content.split("\n").filter((l) => l.trim()).length;
  // If more than 60% of lines are links, it's navigation
  if (lineCount > 0 && linkCount / lineCount > 0.6) return true;
  return false;
}

export function ArticleList({ articles }: { articles: Article[] }) {
  const filtered = articles.filter((a) => !isNavigationChunk(a));

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mb-4">
          <FileText className="h-6 w-6 text-muted-foreground" />
        </div>
        <p className="text-sm font-medium mb-1">No articles found</p>
        <p className="text-xs text-muted-foreground">Try a different category</p>
      </div>
    );
  }

  return (
    <Accordion multiple className="space-y-2">
      {filtered.map((article) => (
        <AccordionItem
          key={article.id}
          value={article.id}
          className="bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 overflow-hidden"
        >
          <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
            <div className="flex items-center gap-2 mr-2">
              <span className="line-clamp-1">{article.title}</span>
              <Badge variant="outline" className="text-[10px] shrink-0 bg-white/[0.03] border-white/[0.08]">
                {article.source}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-sm text-muted-foreground leading-relaxed prose prose-invert prose-sm max-w-none
              prose-headings:text-foreground prose-headings:font-semibold prose-headings:text-sm
              prose-p:text-muted-foreground prose-p:leading-relaxed
              prose-a:text-primary prose-a:no-underline hover:prose-a:underline
              prose-li:text-muted-foreground
              prose-strong:text-foreground prose-strong:font-medium
            ">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cleanContent(article.content)}
              </ReactMarkdown>
            </div>
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary mt-4 mb-2 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full hover:bg-primary/15 transition-colors"
              >
                View on MMDC <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}
