-- Migration 091: Création de la table vet_appointments
-- Date: 2026-01-23
-- Description: Système de prise de rendez-vous entre producteurs et vétérinaires

-- ========================================
-- TABLE vet_appointments
-- ========================================

CREATE TABLE IF NOT EXISTS vet_appointments (
  id VARCHAR(255) PRIMARY KEY,
  
  -- Participants
  producer_id VARCHAR(255) NOT NULL,
  vet_id VARCHAR(255) NOT NULL,
  
  -- Détails du rendez-vous
  appointment_date TIMESTAMP NOT NULL,
  reason TEXT NOT NULL,
  location TEXT,
  
  -- Statut
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- En attente de réponse
    'accepted',     -- Accepté par le vétérinaire
    'rejected',     -- Refusé par le vétérinaire
    'cancelled',    -- Annulé (par producteur ou vétérinaire)
    'completed'     -- Terminé
  )),
  
  -- Réponse du vétérinaire
  vet_response TEXT,
  vet_response_at TIMESTAMP,
  
  -- Rappels
  reminder_sent BOOLEAN DEFAULT FALSE,
  reminder_sent_at TIMESTAMP,
  
  -- Dates
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Relations
  FOREIGN KEY (producer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (vet_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_appointments_producer ON vet_appointments(producer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_vet ON vet_appointments(vet_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON vet_appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON vet_appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_producer_status ON vet_appointments(producer_id, status);
CREATE INDEX IF NOT EXISTS idx_appointments_vet_status ON vet_appointments(vet_id, status);

-- Commentaires pour documentation
COMMENT ON TABLE vet_appointments IS 'Table des rendez-vous entre producteurs et vétérinaires';
COMMENT ON COLUMN vet_appointments.status IS 'Statut: pending, accepted, rejected, cancelled, completed';
COMMENT ON COLUMN vet_appointments.appointment_date IS 'Date et heure du rendez-vous';
COMMENT ON COLUMN vet_appointments.reason IS 'Raison du rendez-vous (maladie, vaccination, consultation, etc.)';
COMMENT ON COLUMN vet_appointments.location IS 'Lieu d''intervention (adresse de la ferme ou autre)';
