-- Vector similarity search index (using HNSW which works on empty tables)
CREATE INDEX ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);

-- Full-text search on knowledge chunks
ALTER TABLE knowledge_chunks ADD COLUMN fts TSVECTOR
  GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || content)) STORED;
CREATE INDEX ON knowledge_chunks USING gin(fts);

-- Enrollment lookups
CREATE INDEX ON enrollments (student_id);
CREATE INDEX ON enrollments (course_id);

-- Alert lookups
CREATE INDEX ON alerts (student_id, dismissed);

-- Task lookups
CREATE INDEX ON tasks (student_id, completed);
