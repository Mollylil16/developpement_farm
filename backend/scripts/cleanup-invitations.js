/**
 * Script Node.js de nettoyage des invitations expirées
 * Usage: node scripts/cleanup-invitations.js
 * À exécuter via cron job quotidiennement
 */

const axios = require('axios');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const API_URL = process.env.API_URL || 'http://localhost:3000';
const SECRET = process.env.CLEANUP_SECRET;

if (!SECRET) {
  console.error('❌ Erreur: CLEANUP_SECRET non configuré dans les variables d\'environnement');
  process.exit(1);
}

async function cleanupExpiredInvitations() {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - Exécution du cleanup des invitations expirées...`);

  try {
    const response = await axios.get(`${API_URL}/collaborations/cleanup-expired`, {
      params: { secret: SECRET },
      timeout: 30000, // 30 secondes
    });

    console.log(`✅ Cleanup réussi: ${response.data.message}`);
    console.log(`📊 ${response.data.expiredInvitationsCount} invitation(s) expirée(s) nettoyée(s)`);

    // Log dans un fichier (optionnel)
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'cleanup-invitations.log');
    fs.appendFileSync(
      logPath,
      `${timestamp} - Cleanup réussi: ${response.data.message}\n`
    );

    process.exit(0);
  } catch (error) {
    let errorMessage = error.message;
    if (error.response) {
      errorMessage = `HTTP ${error.response.status}: ${error.response.data?.message || errorMessage}`;
    }

    console.error(`❌ Erreur: ${errorMessage}`);

    // Log de l'erreur
    const fs = require('fs');
    const path = require('path');
    const logDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logPath = path.join(logDir, 'cleanup-invitations.log');
    fs.appendFileSync(
      logPath,
      `${timestamp} - Erreur: ${errorMessage}\n`
    );

    process.exit(1);
  }
}

cleanupExpiredInvitations();
