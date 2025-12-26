/**
 * Types pour la gestion des porcs individuels dans les bandes
 */

export interface BatchPig {
  id: string;
  batch_id: string;
  name?: string;
  sex: 'male' | 'female' | 'castrated';
  birth_date?: string;
  age_months?: number;
  current_weight_kg: number;
  origin: 'birth' | 'purchase' | 'transfer' | 'other';
  origin_details?: string;
  supplier_name?: string;
  purchase_price?: number;
  health_status: 'healthy' | 'sick' | 'treatment' | 'quarantine';
  last_vaccination_date?: string;
  notes?: string;
  photo_url?: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
}

export interface BatchPigMovement {
  id: string;
  pig_id: string;
  movement_type: 'entry' | 'transfer' | 'removal';
  from_batch_id?: string;
  to_batch_id?: string;
  removal_reason?:
    | 'sale'
    | 'death'
    | 'donation'
    | 'personal_consumption'
    | 'transfer_out'
    | 'other';
  removal_details?: string;
  sale_price?: number;
  sale_weight_kg?: number;
  buyer_name?: string;
  death_cause?: string;
  veterinary_report?: string;
  movement_date: string;
  notes?: string;
  created_at: string;
}

export interface BatchStats {
  total: number;
  by_sex: {
    male: number;
    female: number;
    castrated: number;
  };
  by_health: {
    healthy: number;
    sick: number;
    treatment: number;
    quarantine: number;
  };
  average_weight: number;
  average_age: number;
}

