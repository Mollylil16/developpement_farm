-- Migration 044: Création des tables pour les opérations batch
-- Vaccinations, Gestations, Pesées, Maladies, Ventes

-- ========================================
-- 1. TABLE batch_vaccinations
-- ========================================
CREATE TABLE IF NOT EXISTS batch_vaccinations (
  id VARCHAR(255) PRIMARY KEY,
  batch_id VARCHAR(255) NOT NULL,
  
  -- Informations vaccination
  vaccine_type VARCHAR(50) NOT NULL CHECK (vaccine_type IN (
    'vitamines', 'deparasitant', 'fer', 'antibiotiques', 'autre'
  )),
  product_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100),
  vaccination_date TIMESTAMP NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (reason IN (
    'suivi_normal', 'renforcement', 'prevention', 'urgence'
  )),
  
  -- Porcs vaccinés (JSON array de pig_ids)
  vaccinated_pigs JSONB NOT NULL DEFAULT '[]',
  count INTEGER NOT NULL,
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batch_vaccinations_batch ON batch_vaccinations(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_vaccinations_date ON batch_vaccinations(vaccination_date);
CREATE INDEX IF NOT EXISTS idx_batch_vaccinations_type ON batch_vaccinations(vaccine_type);

-- ========================================
-- 2. TABLE batch_gestations
-- ========================================
CREATE TABLE IF NOT EXISTS batch_gestations (
  id VARCHAR(255) PRIMARY KEY,
  batch_id VARCHAR(255) NOT NULL,
  pig_id VARCHAR(255) NOT NULL, -- ID du porc dans batch_pigs
  
  -- Informations gestation
  mating_date TIMESTAMP NOT NULL,
  expected_delivery_date TIMESTAMP NOT NULL,
  actual_delivery_date TIMESTAMP,
  
  -- Résultats
  piglets_born_count INTEGER DEFAULT 0,
  piglets_alive_count INTEGER DEFAULT 0,
  piglets_dead_count INTEGER DEFAULT 0,
  
  -- Statut
  status VARCHAR(50) NOT NULL DEFAULT 'pregnant' CHECK (status IN (
    'pregnant', 'delivered', 'aborted', 'lost'
  )),
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (pig_id) REFERENCES batch_pigs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batch_gestations_batch ON batch_gestations(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_gestations_pig ON batch_gestations(pig_id);
CREATE INDEX IF NOT EXISTS idx_batch_gestations_status ON batch_gestations(status);
CREATE INDEX IF NOT EXISTS idx_batch_gestations_delivery_date ON batch_gestations(expected_delivery_date);

-- ========================================
-- 3. TABLE batch_weighings
-- ========================================
CREATE TABLE IF NOT EXISTS batch_weighings (
  id VARCHAR(255) PRIMARY KEY,
  batch_id VARCHAR(255) NOT NULL,
  
  -- Informations pesée
  weighing_date TIMESTAMP NOT NULL,
  average_weight_kg REAL NOT NULL,
  min_weight_kg REAL,
  max_weight_kg REAL,
  
  -- Porcs pesés (JSON array de pig_ids)
  weighed_pigs JSONB NOT NULL DEFAULT '[]',
  count INTEGER NOT NULL,
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batch_weighings_batch ON batch_weighings(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_weighings_date ON batch_weighings(weighing_date);

-- ========================================
-- 4. TABLE batch_diseases
-- ========================================
CREATE TABLE IF NOT EXISTS batch_diseases (
  id VARCHAR(255) PRIMARY KEY,
  batch_id VARCHAR(255) NOT NULL,
  pig_id VARCHAR(255) NOT NULL, -- ID du porc dans batch_pigs
  
  -- Informations maladie
  disease_name VARCHAR(255) NOT NULL,
  symptoms TEXT,
  diagnosis_date TIMESTAMP NOT NULL,
  recovery_date TIMESTAMP,
  
  -- Statut
  status VARCHAR(50) NOT NULL DEFAULT 'sick' CHECK (status IN (
    'sick', 'treatment', 'recovered', 'dead'
  )),
  
  -- Traitement
  treatment_description TEXT,
  treatment_start_date TIMESTAMP,
  treatment_end_date TIMESTAMP,
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE,
  FOREIGN KEY (pig_id) REFERENCES batch_pigs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batch_diseases_batch ON batch_diseases(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_diseases_pig ON batch_diseases(pig_id);
CREATE INDEX IF NOT EXISTS idx_batch_diseases_status ON batch_diseases(status);
CREATE INDEX IF NOT EXISTS idx_batch_diseases_date ON batch_diseases(diagnosis_date);

-- ========================================
-- 5. TABLE batch_sales
-- ========================================
CREATE TABLE IF NOT EXISTS batch_sales (
  id VARCHAR(255) PRIMARY KEY,
  batch_id VARCHAR(255) NOT NULL,
  
  -- Informations vente
  sale_date TIMESTAMP NOT NULL,
  buyer_name VARCHAR(255),
  buyer_contact VARCHAR(255),
  
  -- Porcs vendus (JSON array de pig_ids)
  sold_pigs JSONB NOT NULL DEFAULT '[]',
  count INTEGER NOT NULL,
  
  -- Prix et poids
  total_weight_kg REAL NOT NULL,
  price_per_kg REAL,
  total_price REAL NOT NULL,
  
  -- Métadonnées
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (batch_id) REFERENCES batches(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_batch_sales_batch ON batch_sales(batch_id);
CREATE INDEX IF NOT EXISTS idx_batch_sales_date ON batch_sales(sale_date);

-- ========================================
-- 6. MODIFICATIONS batch_pigs
-- Ajouter colonnes de suivi
-- ========================================
ALTER TABLE batch_pigs
ADD COLUMN IF NOT EXISTS gestation_status VARCHAR(50) DEFAULT 'not_pregnant' CHECK (gestation_status IN (
  'not_pregnant', 'pregnant', 'delivered', 'aborted'
));

ALTER TABLE batch_pigs
ADD COLUMN IF NOT EXISTS last_weighing_date TIMESTAMP;

ALTER TABLE batch_pigs
ADD COLUMN IF NOT EXISTS last_vaccination_date TIMESTAMP;

ALTER TABLE batch_pigs
ADD COLUMN IF NOT EXISTS last_vaccination_type VARCHAR(50);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_batch_pigs_gestation_status ON batch_pigs(gestation_status);
CREATE INDEX IF NOT EXISTS idx_batch_pigs_health_status ON batch_pigs(health_status);
CREATE INDEX IF NOT EXISTS idx_batch_pigs_last_weighing ON batch_pigs(last_weighing_date);
CREATE INDEX IF NOT EXISTS idx_batch_pigs_last_vaccination ON batch_pigs(last_vaccination_date);

-- Commentaires pour documentation
COMMENT ON TABLE batch_vaccinations IS 'Vaccinations effectuées par batch';
COMMENT ON TABLE batch_gestations IS 'Gestations des truies par batch';
COMMENT ON TABLE batch_weighings IS 'Pesées collectives par batch';
COMMENT ON TABLE batch_diseases IS 'Maladies enregistrées par batch';
COMMENT ON TABLE batch_sales IS 'Ventes de porcs par batch';


