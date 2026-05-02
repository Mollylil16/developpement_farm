-- Migration 052: Fix type mismatch in search_learnings_by_keywords()
-- Evidence: Postgres error 42804 "Returned type double precision does not match expected type real in column total_score"
-- This caused 500s on /agent-learnings/similar and /agent-learnings/search

CREATE OR REPLACE FUNCTION search_learnings_by_keywords(
  p_projet_id TEXT,
  p_keywords TEXT[]
)
RETURNS TABLE (
  learning_id TEXT,
  user_message TEXT,
  detected_intent TEXT,
  correct_intent TEXT,
  total_score REAL,
  usage_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    al.id as learning_id,
    al.user_message,
    al.detected_intent,
    al.correct_intent,
    (COALESCE(SUM(aki.score), 0) + (al.usage_count * 0.1))::REAL as total_score,
    al.usage_count
  FROM agent_learnings al
  LEFT JOIN agent_keywords_index aki ON aki.learning_id = al.id
  WHERE al.projet_id = p_projet_id
    AND aki.keyword = ANY(p_keywords)
  GROUP BY al.id, al.user_message, al.detected_intent, al.correct_intent, al.usage_count
  ORDER BY total_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;


