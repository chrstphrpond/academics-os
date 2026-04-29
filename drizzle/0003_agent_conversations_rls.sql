ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_conversations_owner ON agent_conversations
  FOR ALL
  USING (student_id = current_student_id())
  WITH CHECK (student_id = current_student_id());

CREATE POLICY agent_messages_owner ON agent_messages
  FOR ALL
  USING (
    conversation_id IN (
      SELECT id FROM agent_conversations WHERE student_id = current_student_id()
    )
  )
  WITH CHECK (
    conversation_id IN (
      SELECT id FROM agent_conversations WHERE student_id = current_student_id()
    )
  );
