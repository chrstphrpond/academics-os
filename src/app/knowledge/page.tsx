import { ChatInterface } from "@/components/knowledge/chat-interface";
import { CategoryGrid } from "@/components/knowledge/category-grid";

export default function KnowledgePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Knowledge Base</h1>
        <p className="text-muted-foreground mt-1">
          Ask questions or browse FAQ categories
        </p>
      </div>

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
