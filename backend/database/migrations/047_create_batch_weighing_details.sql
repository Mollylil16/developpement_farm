-- Migration 047: historiser les affectations de poids par porc lors des pesées collectives

CREATE TABLE IF NOT EXISTS batch_weighing_details (
  id VARCHAR(255) PRIMARY KEY,
  weighing_id VARCHAR(255) NOT NULL REFERENCES batch_weighings(id) ON DELETE CASCADE,
  pig_id VARCHAR(255) NOT NULL REFERENCES batch_pigs(id) ON DELETE CASCADE,
  weight_kg REAL NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_batch_weighing_details_weighing ON batch_weighing_details(weighing_id);
CREATE INDEX IF NOT EXISTS idx_batch_weighing_details_pig ON batch_weighing_details(pig_id);

