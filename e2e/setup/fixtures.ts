/**
 * Fixtures pour les tests E2E
 *
 * Données de test réutilisables pour les scénarios E2E
 */

export const TEST_USERS = {
  producer: {
    email: 'test.producer@example.com',
    password: 'TestPassword123!',
    nom: 'Test',
    prenom: 'Producer',
    provider: 'email' as const,
  },
  buyer: {
    email: 'test.buyer@example.com',
    password: 'TestPassword123!',
    nom: 'Test',
    prenom: 'Buyer',
    provider: 'email' as const,
  },
  vet: {
    email: 'test.vet@example.com',
    password: 'TestPassword123!',
    nom: 'Test',
    prenom: 'Vet',
    provider: 'email' as const,
  },
};

export const TEST_PROJECT = {
  nom: 'Ferme Test E2E',
  type: 'porc' as const,
  localisation: {
    latitude: 6.5,
    longitude: 2.6,
    adresse: 'Cotonou, Bénin',
  },
  nombre_animaux: 50,
  race_principale: 'Large White',
};

export const TEST_ANIMAL = {
  code: 'TEST-001',
  race: 'Large White',
  sexe: 'M' as const,
  date_naissance: '2024-01-01',
  poids_naissance: 1.5,
  statut: 'actif' as const,
};

export const TEST_DEPENSE = {
  montant: 50000,
  description: 'Achat aliment test E2E',
  date: new Date().toISOString().split('T')[0],
  type: 'aliment' as const,
  opex: true,
};

export const TEST_REVENU = {
  montant: 150000,
  description: 'Vente test E2E',
  date: new Date().toISOString().split('T')[0],
  type: 'vente_animaux' as const,
  poids_kg: 100,
};

export const TEST_VACCINATION = {
  animal_id: 'test-animal-id',
  type_vaccin: 'Peste porcine',
  date_vaccination: new Date().toISOString().split('T')[0],
  date_rappel: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  veterinaire: 'Dr. Test',
};
