/**
 * Script de test pour l'endpoint /finance/bilan-complet
 * Usage: tsx scripts/test-bilan-complet.ts <projet_id> [date_debut] [date_fin]
 */

import dotenv from 'dotenv';
import * as path from 'path';

// Charger le fichier .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const projetId = process.argv[2];
const dateDebut = process.argv[3] || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
const dateFin = process.argv[4] || new Date().toISOString().split('T')[0];

if (!projetId) {
  console.error('❌ Erreur: projet_id requis');
  console.error('Usage: tsx scripts/test-bilan-complet.ts <projet_id> [date_debut] [date_fin]');
  process.exit(1);
}

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function testBilanComplet() {
  try {
    console.log('🧪 Test de l\'endpoint /finance/bilan-complet\n');
    console.log(`📋 Paramètres:`);
    console.log(`   - projet_id: ${projetId}`);
    console.log(`   - date_debut: ${dateDebut}`);
    console.log(`   - date_fin: ${dateFin}\n`);

    const url = `${API_BASE_URL}/finance/bilan-complet?projet_id=${projetId}&date_debut=${dateDebut}&date_fin=${dateFin}`;
    console.log(`🔗 URL: ${url}\n`);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // Note: En production, il faudrait un token JWT valide
        // 'Authorization': `Bearer ${token}`
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erreur HTTP ${response.status}: ${errorText}`);
      process.exit(1);
    }

    const data = await response.json();

    console.log('✅ Réponse reçue avec succès !\n');
    console.log('═══════════════════════════════════════\n');
    console.log('📊 BILAN FINANCIER COMPLET\n');
    console.log('═══════════════════════════════════════\n');

    // Période
    if (data.periode) {
      console.log('📅 PÉRIODE:');
      console.log(`   - Début: ${data.periode.date_debut}`);
      console.log(`   - Fin: ${data.periode.date_fin}`);
      console.log(`   - Nombre de mois: ${data.periode.nombre_mois}\n`);
    }

    // Revenus
    if (data.revenus) {
      console.log('📈 REVENUS:');
      console.log(`   - Total: ${data.revenus.total.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Nombre de transactions: ${data.revenus.nombre_transactions}`);
      if (data.revenus.par_categorie && Object.keys(data.revenus.par_categorie).length > 0) {
        console.log(`   - Par catégorie:`);
        Object.entries(data.revenus.par_categorie).forEach(([cat, montant]) => {
          console.log(`     • ${cat}: ${Number(montant).toLocaleString('fr-FR')} FCFA`);
        });
      }
      console.log('');
    }

    // Dépenses
    if (data.depenses) {
      console.log('📉 DÉPENSES:');
      console.log(`   - OPEX: ${data.depenses.opex_total.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Charges Fixes: ${data.depenses.charges_fixes_total.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Total: ${data.depenses.total.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Nombre de transactions: ${data.depenses.nombre_transactions}`);
      if (data.depenses.par_categorie && Object.keys(data.depenses.par_categorie).length > 0) {
        console.log(`   - Par catégorie:`);
        Object.entries(data.depenses.par_categorie).forEach(([cat, montant]) => {
          console.log(`     • ${cat}: ${Number(montant).toLocaleString('fr-FR')} FCFA`);
        });
      }
      console.log('');
    }

    // Dettes
    if (data.dettes) {
      console.log('💳 DETTES:');
      console.log(`   - Total: ${data.dettes.total.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Nombre: ${data.dettes.nombre}`);
      console.log(`   - Intérêts mensuels: ${data.dettes.interets_mensuels.toLocaleString('fr-FR')} FCFA`);
      if (data.dettes.liste && data.dettes.liste.length > 0) {
        console.log(`   - Liste:`);
        data.dettes.liste.forEach((dette: any) => {
          console.log(`     • ${dette.libelle}: ${dette.montant_restant.toLocaleString('fr-FR')} FCFA`);
          if (dette.date_echeance) {
            console.log(`       Échéance: ${dette.date_echeance}`);
          }
        });
      }
      console.log('');
    }

    // Actifs
    if (data.actifs) {
      console.log('🏢 ACTIFS:');
      console.log(`   - Valeur Cheptel: ${data.actifs.valeur_cheptel.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Valeur Stocks: ${data.actifs.valeur_stocks.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Total: ${data.actifs.total.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Nombre d'animaux: ${data.actifs.nombre_animaux}`);
      console.log(`   - Poids moyen: ${data.actifs.poids_moyen_cheptel.toFixed(1)} kg\n`);
    }

    // Résultats
    if (data.resultats) {
      console.log('💰 RÉSULTATS:');
      console.log(`   - Solde Net: ${data.resultats.solde.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Marge Brute: ${data.resultats.marge_brute.toLocaleString('fr-FR')} FCFA`);
      console.log(`   - Cash Flow: ${data.resultats.cash_flow.toLocaleString('fr-FR')} FCFA\n`);
    }

    // Indicateurs
    if (data.indicateurs) {
      console.log('📊 INDICATEURS:');
      console.log(`   - Taux d'endettement: ${data.indicateurs.taux_endettement.toFixed(2)}%`);
      console.log(`   - Ratio de rentabilité: ${data.indicateurs.ratio_rentabilite.toFixed(2)}%`);
      console.log(`   - Coût/kg OPEX: ${data.indicateurs.cout_kg_opex.toLocaleString('fr-FR')} FCFA/kg`);
      console.log(`   - Total kg vendus: ${data.indicateurs.total_kg_vendus.toLocaleString('fr-FR')} kg\n`);
    }

    console.log('═══════════════════════════════════════\n');
    console.log('✅ Test réussi !\n');

  } catch (error: any) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testBilanComplet();

