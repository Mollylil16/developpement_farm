-- Migration 057: Table auth_logs (journal de connexion)
-- Objectif: conserver un historique persistant des connexions/refresh/logout (RAG/debug & audit simple)

CREATE TABLE IF NOT EXISTS auth_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  ip VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN NOT NULL,
  error TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id_created_at ON auth_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_logs_success ON auth_logs(success);


