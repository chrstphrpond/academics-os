-- Helper: resolve current Clerk user → student id via the app.clerk_user_id session var
CREATE OR REPLACE FUNCTION current_student_id() RETURNS UUID
LANGUAGE SQL STABLE AS $$
  SELECT id FROM students
  WHERE clerk_user_id = current_setting('app.clerk_user_id', true)
$$;

-- Enable RLS on user-scoped tables
ALTER TABLE students        ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks           ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_actions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_runs      ENABLE ROW LEVEL SECURITY;

-- Students: read your own row only (self-discovery for getCurrentStudentId)
CREATE POLICY students_self_read ON students
  FOR SELECT
  USING (clerk_user_id = current_setting('app.clerk_user_id', true));

-- Enrollments / tasks / alerts / agent_actions: read+write your own
CREATE POLICY enrollments_owner ON enrollments
  FOR ALL
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

CREATE POLICY tasks_owner ON tasks
  FOR ALL
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

CREATE POLICY alerts_owner ON alerts
  FOR ALL
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

CREATE POLICY agent_actions_owner ON agent_actions
  FOR ALL
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

-- Agent runs may have NULL student_id (test pings). Allow read for own runs and unscoped runs.
CREATE POLICY agent_runs_owner_or_global ON agent_runs
  FOR ALL
  USING (student_id = current_student_id() OR student_id IS NULL)
  WITH CHECK (student_id = current_student_id() OR student_id IS NULL);

-- Reference tables stay readable to anyone authenticated. RLS not enabled on them by default,
-- but enable + permissive policy for a uniform stance.
ALTER TABLE courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks  ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_read_all ON courses
  FOR SELECT USING (true);

CREATE POLICY knowledge_chunks_read_all ON knowledge_chunks
  FOR SELECT USING (true);
