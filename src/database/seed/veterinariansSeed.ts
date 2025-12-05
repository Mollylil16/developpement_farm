/**
 * Script de seed pour créer des vétérinaires de test
 * Utilise des coordonnées réelles d'Abidjan, Côte d'Ivoire
 */

import { getDatabase } from '../../services/database';
import { VeterinarianRepository } from '../repositories';
import { CreateVeterinarianInput } from '../../types/veterinarian';

/**
 * Coordonnées d'Abidjan et environs
 */
const ABIDJAN_LOCATIONS = {
  cocody: { latitude: 5.3599, longitude: -3.9933 },
  yopougon: { latitude: 5.3452, longitude: -4.0826 },
  marcory: { latitude: 5.2806, longitude: -4.0094 },
  plateau: { latitude: 5.3204, longitude: -4.0267 },
  adjame: { latitude: 5.3547, longitude: -4.0256 },
};

/**
 * Créer des vétérinaires de test
 */
export async function seedVeterinarians(): Promise<void> {
  try {
    const db = await getDatabase();
    const vetRepo = new VeterinarianRepository(db);

    const vets: CreateVeterinarianInput[] = [
      {
        firstName: 'Jean',
        lastName: 'Kouassi',
        phone: '+225 07 12 34 56',
        email: 'j.kouassi@vet.ci',
        address: 'Cocody, Abidjan',
        city: 'Cocody',
        latitude: ABIDJAN_LOCATIONS.cocody.latitude,
        longitude: ABIDJAN_LOCATIONS.cocody.longitude,
        specialties: ['Porcins', 'Bovins'],
        rating: 4.5,
        reviewsCount: 12,
        verified: true,
      },
      {
        firstName: 'Marie',
        lastName: 'Diabaté',
        phone: '+225 05 23 45 67',
        email: 'm.diabate@vet.ci',
        address: 'Yopougon, Abidjan',
        city: 'Yopougon',
        latitude: ABIDJAN_LOCATIONS.yopougon.latitude,
        longitude: ABIDJAN_LOCATIONS.yopougon.longitude,
        specialties: ['Porcins', 'Volailles'],
        rating: 4.8,
        reviewsCount: 28,
        verified: true,
      },
      {
        firstName: 'Kouamé',
        lastName: 'Traoré',
        phone: '+225 01 34 56 78',
        email: 'k.traore@vet.ci',
        address: 'Marcory, Abidjan',
        city: 'Marcory',
        latitude: ABIDJAN_LOCATIONS.marcory.latitude,
        longitude: ABIDJAN_LOCATIONS.marcory.longitude,
        specialties: ['Porcins', 'Reproduction'],
        rating: 4.2,
        reviewsCount: 8,
        verified: true,
      },
      {
        firstName: 'Aminata',
        lastName: 'Sangaré',
        phone: '+225 09 45 67 89',
        email: 'a.sangare@vet.ci',
        address: 'Plateau, Abidjan',
        city: 'Plateau',
        latitude: ABIDJAN_LOCATIONS.plateau.latitude,
        longitude: ABIDJAN_LOCATIONS.plateau.longitude,
        specialties: ['Porcins', 'Nutrition animale', 'Médecine préventive'],
        rating: 4.9,
        reviewsCount: 45,
        verified: true,
      },
      {
        firstName: 'Youssouf',
        lastName: 'Koné',
        phone: '+225 08 56 78 90',
        email: 'y.kone@vet.ci',
        address: 'Adjame, Abidjan',
        city: 'Adjame',
        latitude: ABIDJAN_LOCATIONS.adjame.latitude,
        longitude: ABIDJAN_LOCATIONS.adjame.longitude,
        specialties: ['Porcins', 'Chirurgie'],
        rating: 4.6,
        reviewsCount: 19,
        verified: true,
      },
    ];

    console.log('🌱 Création de vétérinaires de test...');
    for (const vet of vets) {
      try {
        await vetRepo.create(vet);
        console.log(`✅ Vétérinaire créé: Dr. ${vet.firstName} ${vet.lastName}`);
      } catch (error) {
        console.warn(`⚠️ Erreur lors de la création de ${vet.firstName} ${vet.lastName}:`, error);
      }
    }
    console.log('✅ Seed des vétérinaires terminé');
  } catch (error) {
    console.error('❌ Erreur lors du seed des vétérinaires:', error);
  }
}

