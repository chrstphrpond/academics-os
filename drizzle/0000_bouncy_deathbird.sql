CREATE TABLE "agent_actions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"agent_run_id" uuid,
	"kind" text NOT NULL,
	"input_jsonb" jsonb NOT NULL,
	"diff_jsonb" jsonb,
	"undo_input_jsonb" jsonb,
	"status" text NOT NULL,
	"error_text" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"executed_at" timestamp with time zone,
	"undone_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "agent_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid,
	"feature" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd_micros" bigint,
	"latency_ms" integer,
	"trace_id" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"severity" text NOT NULL,
	"due_date" date,
	"dismissed" boolean DEFAULT false,
	"agent_action_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"units" integer NOT NULL,
	"year" integer NOT NULL,
	"term" integer NOT NULL,
	"prerequisites" text[] DEFAULT ARRAY[]::text[],
	"corequisites" text[] DEFAULT ARRAY[]::text[],
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "courses_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "enrollments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"course_id" uuid NOT NULL,
	"term" text NOT NULL,
	"school_year" text NOT NULL,
	"grade" text,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "enrollments_uniq" UNIQUE("student_id","course_id","term","school_year")
);
--> statement-breakpoint
CREATE TABLE "knowledge_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" text NOT NULL,
	"category" text,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"url" text,
	"embedding" vector(1536),
	"embedding_vertex" vector(768),
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"roll_number" text NOT NULL,
	"degree" text NOT NULL,
	"specialization" text NOT NULL,
	"enrollment_start_term" text NOT NULL,
	"clerk_user_id" text,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "students_roll_number_unique" UNIQUE("roll_number"),
	CONSTRAINT "students_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"course_id" uuid,
	"due_date" date,
	"completed" boolean DEFAULT false,
	"created_by_agent" boolean DEFAULT false,
	"agent_action_id" uuid,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_actions" ADD CONSTRAINT "agent_actions_agent_run_id_agent_runs_id_fk" FOREIGN KEY ("agent_run_id") REFERENCES "public"."agent_runs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_runs" ADD CONSTRAINT "agent_runs_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_course_id_courses_id_fk" FOREIGN KEY ("course_id") REFERENCES "public"."courses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_actions_student_idx" ON "agent_actions" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_actions_kind_idx" ON "agent_actions" USING btree ("kind","status");--> statement-breakpoint
CREATE INDEX "agent_runs_student_idx" ON "agent_runs" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "agent_runs_feature_idx" ON "agent_runs" USING btree ("feature","created_at");--> statement-breakpoint
CREATE INDEX "alerts_student_dismissed_idx" ON "alerts" USING btree ("student_id","dismissed");--> statement-breakpoint
CREATE INDEX "enrollments_student_idx" ON "enrollments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "enrollments_course_idx" ON "enrollments" USING btree ("course_id");--> statement-breakpoint
CREATE INDEX "knowledge_chunks_embedding_idx" ON "knowledge_chunks" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "knowledge_chunks_embedding_vertex_idx" ON "knowledge_chunks" USING hnsw ("embedding_vertex" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "students_clerk_user_id_idx" ON "students" USING btree ("clerk_user_id");--> statement-breakpoint
CREATE INDEX "tasks_student_completed_idx" ON "tasks" USING btree ("student_id","completed");