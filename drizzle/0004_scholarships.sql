ALTER TABLE scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY scholarships_read_all ON scholarships
  FOR SELECT USING (true);
