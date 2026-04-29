CREATE TABLE "scholarships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"min_gpa" text NOT NULL,
	"max_gpa" text NOT NULL,
	"note" text,
	"source_chunk_id" uuid,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "scholarships_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "scholarships" ADD CONSTRAINT "scholarships_source_chunk_id_knowledge_chunks_id_fk" FOREIGN KEY ("source_chunk_id") REFERENCES "public"."knowledge_chunks"("id") ON DELETE set null ON UPDATE no action;