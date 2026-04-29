import {
  pgTable,
  uuid,
  text,
  integer,
  bigint,
  boolean,
  timestamp,
  date,
  jsonb,
  unique,
  index,
  vector,
} from "drizzle-orm/pg-core";
import { sql, relations } from "drizzle-orm";

// ---------- Domain enums (kept as TEXT + CHECK at the SQL level for now) ----------

export const ENROLLMENT_STATUSES = ["passed", "inc", "drp", "in_progress", "failed"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export const ALERT_TYPES = [
  "inc_deadline",
  "prerequisite_blocker",
  "enrollment_window",
  "graduation_risk",
  "cascade_warning",
] as const;
export type AlertType = (typeof ALERT_TYPES)[number];

export const ALERT_SEVERITIES = ["critical", "warning", "info"] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const KNOWLEDGE_SOURCES = ["faq", "handbook"] as const;
export type KnowledgeSource = (typeof KNOWLEDGE_SOURCES)[number];

export const AGENT_ACTION_STATUSES = [
  "proposed",
  "approved",
  "executed",
  "undone",
  "failed",
] as const;
export type AgentActionStatus = (typeof AGENT_ACTION_STATUSES)[number];

// ---------- Tables ----------

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    rollNumber: text("roll_number").notNull().unique(),
    degree: text("degree").notNull(),
    specialization: text("specialization").notNull(),
    enrollmentStartTerm: text("enrollment_start_term").notNull(),
    clerkUserId: text("clerk_user_id").unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    clerkUserIdx: index("students_clerk_user_id_idx").on(t.clerkUserId),
  })
);

export const courses = pgTable("courses", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  units: integer("units").notNull(),
  year: integer("year").notNull(),
  term: integer("term").notNull(),
  prerequisites: text("prerequisites").array().default(sql`ARRAY[]::text[]`),
  corequisites: text("corequisites").array().default(sql`ARRAY[]::text[]`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    courseId: uuid("course_id")
      .notNull()
      .references(() => courses.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    schoolYear: text("school_year").notNull(),
    grade: text("grade"),
    status: text("status", { enum: ENROLLMENT_STATUSES }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    studentIdx: index("enrollments_student_idx").on(t.studentId),
    courseIdx: index("enrollments_course_idx").on(t.courseId),
    uniqEnrollment: unique("enrollments_uniq").on(
      t.studentId,
      t.courseId,
      t.term,
      t.schoolYear
    ),
  })
);

export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    type: text("type", { enum: ALERT_TYPES }).notNull(),
    title: text("title").notNull(),
    message: text("message").notNull(),
    severity: text("severity", { enum: ALERT_SEVERITIES }).notNull(),
    dueDate: date("due_date"),
    dismissed: boolean("dismissed").default(false),
    agentActionId: uuid("agent_action_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    studentDismissedIdx: index("alerts_student_dismissed_idx").on(
      t.studentId,
      t.dismissed
    ),
  })
);

export const knowledgeChunks = pgTable(
  "knowledge_chunks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: text("source", { enum: KNOWLEDGE_SOURCES }).notNull(),
    category: text("category"),
    title: text("title").notNull(),
    content: text("content").notNull(),
    url: text("url"),
    embedding: vector("embedding", { dimensions: 1536 }),
    embeddingVertex: vector("embedding_vertex", { dimensions: 768 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    embeddingHnsw: index("knowledge_chunks_embedding_idx")
      .using("hnsw", t.embedding.op("vector_cosine_ops")),
    embeddingVertexHnsw: index("knowledge_chunks_embedding_vertex_idx")
      .using("hnsw", t.embeddingVertex.op("vector_cosine_ops")),
  })
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    courseId: uuid("course_id").references(() => courses.id, {
      onDelete: "set null",
    }),
    dueDate: date("due_date"),
    completed: boolean("completed").default(false),
    createdByAgent: boolean("created_by_agent").default(false),
    agentActionId: uuid("agent_action_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    studentCompletedIdx: index("tasks_student_completed_idx").on(
      t.studentId,
      t.completed
    ),
  })
);

export const agentRuns = pgTable(
  "agent_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id").references(() => students.id, {
      onDelete: "cascade",
    }),
    feature: text("feature").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsdMicros: bigint("cost_usd_micros", { mode: "number" }),
    latencyMs: integer("latency_ms"),
    traceId: text("trace_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    studentCreatedIdx: index("agent_runs_student_idx").on(
      t.studentId,
      t.createdAt
    ),
    featureCreatedIdx: index("agent_runs_feature_idx").on(
      t.feature,
      t.createdAt
    ),
  })
);

export const agentActions = pgTable(
  "agent_actions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    agentRunId: uuid("agent_run_id").references(() => agentRuns.id, {
      onDelete: "set null",
    }),
    kind: text("kind").notNull(),
    inputJsonb: jsonb("input_jsonb").notNull(),
    diffJsonb: jsonb("diff_jsonb"),
    undoInputJsonb: jsonb("undo_input_jsonb"),
    status: text("status", { enum: AGENT_ACTION_STATUSES }).notNull(),
    errorText: text("error_text"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    executedAt: timestamp("executed_at", { withTimezone: true }),
    undoneAt: timestamp("undone_at", { withTimezone: true }),
  },
  (t) => ({
    studentCreatedIdx: index("agent_actions_student_idx").on(
      t.studentId,
      t.createdAt
    ),
    kindStatusIdx: index("agent_actions_kind_idx").on(t.kind, t.status),
  })
);

export const agentConversations = pgTable(
  "agent_conversations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    title: text("title"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
  },
  (t) => ({
    studentLastMsgIdx: index("agent_conversations_student_idx").on(
      t.studentId,
      t.lastMessageAt
    ),
  })
);

export const agentMessages = pgTable(
  "agent_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => agentConversations.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["user", "assistant", "system", "tool"] }).notNull(),
    partsJsonb: jsonb("parts_jsonb").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    conversationCreatedIdx: index("agent_messages_conversation_idx").on(
      t.conversationId,
      t.createdAt
    ),
  })
);

export const scholarships = pgTable(
  "scholarships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    minGpa: text("min_gpa").notNull(), // stored as text to preserve "1.00" formatting
    maxGpa: text("max_gpa").notNull(),
    note: text("note"),
    sourceChunkId: uuid("source_chunk_id").references(() => knowledgeChunks.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  }
);

// Inferred select/insert types for ergonomic use elsewhere
export type Student = typeof students.$inferSelect;
export type NewStudent = typeof students.$inferInsert;
export type Course = typeof courses.$inferSelect;
export type Enrollment = typeof enrollments.$inferSelect;
export type Alert = typeof alerts.$inferSelect;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type AgentRun = typeof agentRuns.$inferSelect;
export type NewAgentRun = typeof agentRuns.$inferInsert;
export type AgentAction = typeof agentActions.$inferSelect;
export type NewAgentAction = typeof agentActions.$inferInsert;
export type AgentConversation = typeof agentConversations.$inferSelect;
export type NewAgentConversation = typeof agentConversations.$inferInsert;
export type AgentMessage = typeof agentMessages.$inferSelect;
export type NewAgentMessage = typeof agentMessages.$inferInsert;
export type Scholarship = typeof scholarships.$inferSelect;
export type NewScholarship = typeof scholarships.$inferInsert;

// ---------- Relations (for Drizzle relational queries) ----------

export const enrollmentsRelations = relations(enrollments, ({ one }) => ({
  student: one(students, { fields: [enrollments.studentId], references: [students.id] }),
  course: one(courses, { fields: [enrollments.courseId], references: [courses.id] }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  student: one(students, { fields: [tasks.studentId], references: [students.id] }),
  course: one(courses, { fields: [tasks.courseId], references: [courses.id] }),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  student: one(students, { fields: [alerts.studentId], references: [students.id] }),
}));

export const agentConversationsRelations = relations(agentConversations, ({ many, one }) => ({
  student: one(students, { fields: [agentConversations.studentId], references: [students.id] }),
  messages: many(agentMessages),
}));

export const agentMessagesRelations = relations(agentMessages, ({ one }) => ({
  conversation: one(agentConversations, {
    fields: [agentMessages.conversationId],
    references: [agentConversations.id],
  }),
}));
