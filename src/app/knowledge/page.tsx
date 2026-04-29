import { ChatInterface } from "@/components/knowledge/chat-interface";
import { CategoryGrid } from "@/components/knowledge/category-grid";
import { PageHeader } from "@/components/ui/animated";

export default function KnowledgePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <PageHeader
        title="Atlas"
        description="Your academic copilot — ask about courses, GPA, policies, or anything else."
      />

      <ChatInterface />

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Browse the handbook
        </h2>
        <CategoryGrid />
      </section>
    </div>
  );
}
