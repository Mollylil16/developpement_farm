-- Migration 051: Création de la table knowledge_base pour Kouakou
-- Stocke le contenu éducatif sur l'élevage porcin

-- ============================================
-- TABLE: knowledge_base
-- Base de connaissances principale
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_base (
  id TEXT PRIMARY KEY,
  
  -- Catégorie du contenu
  category TEXT NOT NULL CHECK (category IN (
    'types_elevage',
    'objectifs', 
    'races',
    'emplacement',
    'eau',
    'alimentation',
    'sante',
    'finance',
    'commerce',
    'reglementation',
    'general'
  )),
  
  -- Titre du sujet
  title TEXT NOT NULL,
  
  -- Mots-clés pour la recherche (array)
  keywords TEXT[] NOT NULL DEFAULT '{}',
  
  -- Contenu formaté (markdown supporté)
  content TEXT NOT NULL,
  
  -- Résumé court pour réponses rapides
  summary TEXT,
  
  -- Niveau de priorité pour l'affichage (1-10)
  priority INTEGER DEFAULT 5,
  
  -- Visibilité: global (tous les projets) ou spécifique
  visibility TEXT DEFAULT 'global' CHECK (visibility IN ('global', 'projet')),
  
  -- Projet spécifique (si visibility = 'projet')
  projet_id TEXT REFERENCES projets(id) ON DELETE CASCADE,
  
  -- Métadonnées
  is_active BOOLEAN DEFAULT true,
  view_count INTEGER DEFAULT 0,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by TEXT
);

-- ============================================
-- TABLE: knowledge_questions
-- Questions fréquentes associées à chaque sujet
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_questions (
  id TEXT PRIMARY KEY,
  knowledge_id TEXT NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  
  -- Question exemple
  question TEXT NOT NULL,
  
  -- Réponse courte spécifique (optionnel)
  short_answer TEXT,
  
  -- Compteur d'utilisation
  usage_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: knowledge_feedback
-- Feedback utilisateur sur les réponses
-- ============================================
CREATE TABLE IF NOT EXISTS knowledge_feedback (
  id TEXT PRIMARY KEY,
  knowledge_id TEXT NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  projet_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  
  -- Type de feedback
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('helpful', 'not_helpful', 'incomplete', 'incorrect')),
  
  -- Commentaire optionnel
  comment TEXT,
  
  -- Question originale de l'utilisateur
  original_question TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- INDEX pour améliorer les performances
-- ============================================
CREATE INDEX IF NOT EXISTS idx_knowledge_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_visibility ON knowledge_base(visibility);
CREATE INDEX IF NOT EXISTS idx_knowledge_projet ON knowledge_base(projet_id) WHERE projet_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_active ON knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_keywords ON knowledge_base USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_knowledge_priority ON knowledge_base(priority DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_questions_knowledge ON knowledge_questions(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_knowledge ON knowledge_feedback(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_feedback_projet ON knowledge_feedback(projet_id);

-- ============================================
-- TRIGGER: Mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_knowledge_base_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_knowledge_base_timestamp ON knowledge_base;
CREATE TRIGGER trigger_update_knowledge_base_timestamp
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_timestamp();

-- ============================================
-- FONCTION: Recherche full-text dans la base
-- ============================================
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
BEGIN
  -- Normaliser la requête
  normalized_query := lower(unaccent(p_query));
  search_terms := regexp_split_to_array(normalized_query, '\s+');
  
  RETURN QUERY
  SELECT 
    kb.id,
    kb.category,
    kb.title,
    kb.content,
    kb.summary,
    kb.keywords,
    (
      -- Score basé sur les mots-clés
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
    ) AS relevance_score
  FROM knowledge_base kb
  WHERE kb.is_active = true
    AND (p_category IS NULL OR kb.category = p_category)
    AND (
      kb.visibility = 'global' 
      OR (kb.visibility = 'projet' AND kb.projet_id = p_projet_id)
    )
    AND (
      -- Au moins un mot-clé correspond
      EXISTS (
        SELECT 1 FROM unnest(kb.keywords) AS kw 
        WHERE lower(unaccent(kw)) LIKE '%' || ANY(search_terms) || '%'
      )
      OR lower(unaccent(kb.title)) LIKE '%' || normalized_query || '%'
      OR lower(unaccent(kb.content)) LIKE '%' || normalized_query || '%'
    )
  ORDER BY relevance_score DESC, kb.priority DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- EXTENSION unaccent (pour recherche sans accents)
-- ============================================
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================
-- COMMENTAIRES
-- ============================================
COMMENT ON TABLE knowledge_base IS 'Base de connaissances de Kouakou sur l''élevage porcin';
COMMENT ON TABLE knowledge_questions IS 'Questions fréquentes associées aux sujets';
COMMENT ON TABLE knowledge_feedback IS 'Feedback utilisateur sur les réponses';
COMMENT ON FUNCTION search_knowledge IS 'Recherche full-text avec scoring de pertinence';

