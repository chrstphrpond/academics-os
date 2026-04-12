"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface Article {
  id: string;
  title: string;
  content: string;
  url: string | null;
  source: string;
}

export function ArticleList({ articles }: { articles: Article[] }) {
  if (articles.length === 0) {
    return (
      <p className="text-muted-foreground text-sm py-8 text-center">
        No articles found for this category.
      </p>
    );
  }

  return (
    <Accordion multiple className="space-y-2">
      {articles.map((article) => (
        <AccordionItem
          key={article.id}
          value={article.id}
          className="border border-border/50 rounded-lg px-4"
        >
          <AccordionTrigger className="text-sm font-medium text-left hover:no-underline">
            <div className="flex items-center gap-2 mr-2">
              <span>{article.title}</span>
              <Badge variant="outline" className="text-[10px] shrink-0">
                {article.source}
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {article.content}
            </div>
            {article.url && (
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary mt-3 hover:underline"
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
