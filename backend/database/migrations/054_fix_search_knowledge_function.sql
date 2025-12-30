-- Migration 054: Fix search_knowledge() errors
-- Evidence in runtime logs:
-- - 42809: "op ANY/ALL (array) requires operator to yield boolean" (bad ANY usage in keyword LIKE clause)
-- - Potential type mismatch risk for relevance_score (keep it explicitly REAL)

CREATE OR REPLACE FUNCTION search_knowledge(
  p_query TEXT,
  p_category TEXT DEFAULT NULL,
  p_projet_id TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 5
)
RETURNS TABLE (
  id TEXT,
  category TEXT,
  title TEXT,
  content TEXT,
  summary TEXT,
  keywords TEXT[],
  relevance_score REAL
) AS $$
DECLARE
  search_terms TEXT[];
  normalized_query TEXT;
  patterns TEXT[];
BEGIN
  -- Normaliser la requête
  normalized_query := lower(unaccent(p_query));
  search_terms := regexp_split_to_array(normalized_query, '\s+');
  patterns := ARRAY(SELECT '%' || term || '%' FROM unnest(search_terms) AS term);

  RETURN QUERY
  SELECT
    kb.id,
    kb.category,
    kb.title,
    kb.content,
    kb.summary,
    kb.keywords,
    (
      -- Score basé sur les mots-clés (match exact)
      COALESCE((
        SELECT COUNT(*)::REAL
        FROM unnest(kb.keywords) AS kw
        WHERE lower(unaccent(kw)) = ANY(search_terms)
      ), 0) * 3.0
      +
      -- Score basé sur le titre
      CASE WHEN lower(unaccent(kb.title)) LIKE '%' || normalized_query || '%' THEN 5.0 ELSE 0 END
      +
      -- Score basé sur le contenu
      CASE WHEN lower(unaccent(kb.content)) LIKE '%' || normalized_query || '%' THEN 2.0 ELSE 0 END
      +
      -- Bonus de priorité
      (kb.priority::REAL / 10.0)
      +
      -- Bonus de popularité
      (kb.view_count::REAL / 100.0)
    )::REAL AS relevance_score
  FROM knowledge_base kb
  WHERE kb.is_active = true
    AND (p_category IS NULL OR kb.category = p_category)
    AND (
      kb.visibility = 'global'
      OR (kb.visibility = 'projet' AND kb.projet_id = p_projet_id)
    )
    AND (
      -- Au moins un mot-clé correspond (LIKE sur patterns) OU titre/contenu contiennent la requête
      EXISTS (
        SELECT 1
        FROM unnest(kb.keywords) AS kw
        WHERE lower(unaccent(kw)) LIKE ANY(patterns)
      )
      OR lower(unaccent(kb.title)) LIKE '%' || normalized_query || '%'
      OR lower(unaccent(kb.content)) LIKE '%' || normalized_query || '%'
    )
  ORDER BY relevance_score DESC, kb.priority DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;


