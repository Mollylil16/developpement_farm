-- Migration: Création de la table vaccinations
-- Date: 2025-01-09
-- Description: Table pour stocker les vaccinations effectuées

CREATE TABLE IF NOT EXISTS vaccinations (
  id TEXT PRIMARY KEY,
  projet_id TEXT NOT NULL REFERENCES projets(id) ON DELETE CASCADE,
  calendrier_id TEXT REFERENCES calendrier_vaccinations(id) ON DELETE SET NULL,
  animal_id TEXT REFERENCES production_animaux(id) ON DELETE SET NULL,
  lot_id TEXT,
  vaccin TEXT,
  nom_vaccin TEXT,
  date_vaccination TIMESTAMP NOT NULL,
  date_rappel TIMESTAMP,
  numero_lot_vaccin TEXT,
  veterinaire TEXT,
  cout NUMERIC CHECK (cout IS NULL OR cout >= 0),
  statut TEXT NOT NULL CHECK (statut IN ('planifie', 'effectue', 'en_retard', 'annule')) DEFAULT 'effectue',
  effets_secondaires TEXT,
  notes TEXT,
  date_creation TIMESTAMP DEFAULT NOW(),
  derniere_modification TIMESTAMP DEFAULT NOW(),
  animal_ids TEXT, -- JSON array
  type_prophylaxie TEXT DEFAULT 'vitamine',
  produit_administre TEXT,
  photo_flacon TEXT,
  dosage TEXT,
  unite_dosage TEXT DEFAULT 'ml',
  raison_traitement TEXT DEFAULT 'suivi_normal',
  raison_autre TEXT,
  CHECK (date_rappel IS NULL OR date_rappel >= date_vaccination)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_vaccinations_projet_id ON vaccinations(projet_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_calendrier_id ON vaccinations(calendrier_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_animal_id ON vaccinations(animal_id);
CREATE INDEX IF NOT EXISTS idx_vaccinations_date_vaccination ON vaccinations(date_vaccination);
CREATE INDEX IF NOT EXISTS idx_vaccinations_statut ON vaccinations(statut);

-- Commentaires pour documentation
COMMENT ON TABLE vaccinations IS 'Table pour stocker les vaccinations effectuées';
COMMENT ON COLUMN vaccinations.animal_ids IS 'JSON array des IDs des animaux vaccinés';

