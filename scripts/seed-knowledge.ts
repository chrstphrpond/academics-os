import fs from "fs";
import { db, schema } from "../src/lib/db/index";

interface KnowledgeChunkInput {
  source: "faq" | "handbook";
  category: string | null;
  title: string;
  content: string;
  url: string | null;
  embedding: null;
}

function splitLongContent(content: string, maxLen: number = 2000): string[] {
  if (content.length <= maxLen) return [content];

  const paragraphs = content.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 > maxLen && current.length > 0) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = current ? current + "\n\n" + para : para;
    }
  }
  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

function parseFaq(content: string): KnowledgeChunkInput[] {
  // Support both Unix (\n---\n) and Windows (\r\n---\r\n) line endings
  const sections = content.split(/\r?\n---\r?\n/);
  const chunks: KnowledgeChunkInput[] = [];

  for (const section of sections) {
    const trimmed = section.trim();
    if (trimmed.length < 100) continue;

    // Extract title from ## header
    const titleMatch = trimmed.match(/^##\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1].trim() : "Untitled";

    // Extract URL
    const urlMatch = trimmed.match(/^URL:\s+(.+)$/m);
    const url = urlMatch ? urlMatch[1].trim() : null;

    // Extract category from URL path
    let category: string | null = null;
    if (url) {
      const categoryMatch = url.match(/categories\/\d+-(.+?)(?:\/|$)/);
      if (categoryMatch) {
        category = categoryMatch[1].replace(/-/g, " ");
      }
    }

    const contentParts = splitLongContent(trimmed);
    for (let i = 0; i < contentParts.length; i++) {
      chunks.push({
        source: "faq",
        category,
        title: contentParts.length > 1 ? `${title} (Part ${i + 1})` : title,
        content: contentParts[i],
        url,
        embedding: null,
      });
    }
  }

  return chunks;
}

function parseHandbook(content: string): KnowledgeChunkInput[] {
  // Split by Roman numeral section headers
  const sectionPattern = /^((?:I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\.\s+.+)$/gm;
  const chunks: KnowledgeChunkInput[] = [];

  const parts: Array<{ title: string; content: string }> = [];

  // Collect all section positions
  const matches: Array<{ title: string; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = sectionPattern.exec(content)) !== null) {
    matches.push({ title: match[1].trim(), index: match.index });
  }

  for (let i = 0; i < matches.length; i++) {
    // Content before first match is intro
    if (i === 0 && matches[0].index > 0) {
      const introContent = content.slice(0, matches[0].index).trim();
      if (introContent.length >= 100) {
        parts.push({ title: "Introduction", content: introContent });
      }
    }

    const endIndex = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const sectionContent = content.slice(matches[i].index, endIndex).trim();
    if (sectionContent.length >= 100) {
      parts.push({ title: matches[i].title, content: sectionContent });
    }
  }

  // If no matches found, treat whole content as one chunk
  if (matches.length === 0 && content.trim().length >= 100) {
    parts.push({ title: "Student Handbook", content: content.trim() });
  }

  for (const part of parts) {
    const contentParts = splitLongContent(part.content);
    for (let i = 0; i < contentParts.length; i++) {
      chunks.push({
        source: "handbook",
        category: null,
        title: contentParts.length > 1 ? `${part.title} (Part ${i + 1})` : part.title,
        content: contentParts[i],
        url: null,
        embedding: null,
      });
    }
  }

  return chunks;
}

async function main() {
  // Parse FAQ
  const faqContent = fs.readFileSync("data/mmdc-faq.md", "utf-8");
  const faqChunks = parseFaq(faqContent);
  console.log(`Parsed ${faqChunks.length} FAQ chunks`);

  // Parse handbook
  let handbookChunks: KnowledgeChunkInput[] = [];
  try {
    const handbookContent = fs.readFileSync("data/handbook.txt", "utf-8");
    handbookChunks = parseHandbook(handbookContent);
    console.log(`Parsed ${handbookChunks.length} handbook chunks`);
  } catch {
    console.log("No handbook.txt found, skipping handbook seeding");
  }

  const allChunks = [...faqChunks, ...handbookChunks];

  // Truncate existing chunks so re-runs are idempotent (no natural unique key on this table)
  await db.delete(schema.knowledgeChunks);
  console.log("Cleared existing knowledge_chunks");

  // Insert in batches via Drizzle (embedding stays NULL — Phase 6 re-embeds with Vertex)
  const batchSize = 50;
  let inserted = 0;
  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    await db.insert(schema.knowledgeChunks).values(
      batch.map((c) => ({
        source: c.source,
        category: c.category,
        title: c.title,
        content: c.content,
        url: c.url,
        // embedding omitted — DB defaults to NULL
      }))
    );
    inserted += batch.length;
  }

  console.log(
    `\nSuccessfully seeded ${inserted} knowledge chunks (${faqChunks.length} FAQ + ${handbookChunks.length} handbook)`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
