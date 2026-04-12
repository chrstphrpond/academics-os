import { ChatInterface } from "@/components/knowledge/chat-interface";
import { CategoryGrid } from "@/components/knowledge/category-grid";
import { PageHeader } from "@/components/ui/animated";

export default function KnowledgePage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Knowledge Base"
        description="Ask questions or browse FAQ categories"
      />

      <section>
        <h2 className="mb-3 text-lg font-semibold">AI Q&amp;A</h2>
        <ChatInterface />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Browse by Category</h2>
        <CategoryGrid />
      </section>
    </div>
  );
}
