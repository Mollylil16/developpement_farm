-- Migration 050: Création des tables pour l'apprentissage de l'agent Kouakou
-- Permet à l'agent d'apprendre des conversations et mémoriser les réponses

-- ============================================
-- TABLE: agent_learnings
-- Stocke les apprentissages de l'agent par projet
-- ============================================
CREATE TABLE IF NOT EXISTS agent_learnings (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  
  -- Type d'apprentissage
  learning_type TEXT NOT NULL CHECK (learning_type IN (
    'user_correction',      -- L'utilisateur a corrigé une réponse
    'successful_intent',    -- Intention détectée avec succès
    'failed_intent',        -- Intention non détectée
    'keyword_association',  -- Association mot-clé → intention
    'custom_response'       -- Réponse personnalisée mémorisée
  )),
  
  -- Message original de l'utilisateur
  user_message TEXT NOT NULL,
  
  -- Mots-clés extraits du message
  keywords TEXT[], -- Array de mots-clés
  
  -- Intention détectée (si applicable)
  detected_intent TEXT,
  
  -- Intention correcte (après correction utilisateur)
  correct_intent TEXT,
  
  -- Paramètres associés (JSON)
  params JSONB,
  
  -- Réponse mémorisée (pour custom_response)
  memorized_response TEXT,
  
  -- Confiance de l'apprentissage (0-1)
  confidence REAL DEFAULT 0.5,
  
  -- Compteur d'utilisation (pour renforcement)
  usage_count INTEGER DEFAULT 1,
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: agent_conversation_memory
-- Mémorise les conversations récentes pour contexte
-- ============================================
CREATE TABLE IF NOT EXISTS agent_conversation_memory (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  
  -- Conversation
  conversation_id TEXT NOT NULL,
  message_role TEXT NOT NULL CHECK (message_role IN ('user', 'assistant')),
  message_content TEXT NOT NULL,
  
  -- Intention et action (si applicable)
  intent TEXT,
  action_executed TEXT,
  action_success BOOLEAN,
  
  -- Métadonnées
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TABLE: agent_keywords_index
-- Index inversé pour recherche rapide par mots-clés
-- ============================================
CREATE TABLE IF NOT EXISTS agent_keywords_index (
  id TEXT PRIMARY KEY,
  keyword TEXT NOT NULL,
  learning_id TEXT NOT NULL REFERENCES agent_learnings(id) ON DELETE CASCADE,
  intent TEXT NOT NULL,
  score REAL DEFAULT 1.0, -- Poids du mot-clé pour cette intention
  
  -- Contrainte d'unicité
  UNIQUE (keyword, learning_id)
);

-- ============================================
-- INDEX pour améliorer les performances
-- ============================================
CREATE INDEX IF NOT EXISTS idx_agent_learnings_projet ON agent_learnings(projet_id);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_type ON agent_learnings(learning_type);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_intent ON agent_learnings(detected_intent);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_keywords ON agent_learnings USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_agent_learnings_updated ON agent_learnings(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_projet ON agent_conversation_memory(projet_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_conversation ON agent_conversation_memory(conversation_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_user ON agent_conversation_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_created ON agent_conversation_memory(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_keywords_keyword ON agent_keywords_index(keyword);
CREATE INDEX IF NOT EXISTS idx_agent_keywords_intent ON agent_keywords_index(intent);

-- ============================================
-- TRIGGER: Mise à jour automatique de updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_agent_learnings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_agent_learnings_timestamp ON agent_learnings;
CREATE TRIGGER trigger_update_agent_learnings_timestamp
  BEFORE UPDATE ON agent_learnings
  FOR EACH ROW
  EXECUTE FUNCTION update_agent_learnings_timestamp();

-- ============================================
-- FONCTION: Recherche par mots-clés avec score
-- ============================================
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
    al.id,
    al.user_message,
    al.detected_intent,
    al.correct_intent,
    COALESCE(SUM(aki.score), 0) + (al.usage_count * 0.1) as total_score,
    al.usage_count
  FROM agent_learnings al
  LEFT JOIN agent_keywords_index aki ON al.id = aki.learning_id
  WHERE al.projet_id = p_projet_id
    AND (
      al.keywords && p_keywords  -- Intersection avec les mots-clés
      OR aki.keyword = ANY(p_keywords)
    )
  GROUP BY al.id, al.user_message, al.detected_intent, al.correct_intent, al.usage_count
  ORDER BY total_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- COMMENTAIRES
-- ============================================
COMMENT ON TABLE agent_learnings IS 'Apprentissages de l''agent Kouakou par projet';
COMMENT ON TABLE agent_conversation_memory IS 'Mémoire des conversations pour contexte';
COMMENT ON TABLE agent_keywords_index IS 'Index inversé mots-clés → apprentissages';
COMMENT ON FUNCTION search_learnings_by_keywords IS 'Recherche les apprentissages par mots-clés avec score de pertinence';

