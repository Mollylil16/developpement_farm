#!/bin/bash

# Script de nettoyage des invitations expirées
# Usage: ./cleanup-invitations.sh
# À exécuter via cron job quotidiennement

# Configuration
API_URL="${API_URL:-http://localhost:3000}"
SECRET="${CLEANUP_SECRET}"

# Vérification du secret
if [ -z "$SECRET" ]; then
    echo "❌ Erreur: CLEANUP_SECRET non configuré dans les variables d'environnement"
    exit 1
fi

# Appel de l'endpoint
echo "$(date '+%Y-%m-%d %H:%M:%S') - Exécution du cleanup des invitations expirées..."

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "${API_URL}/collaborations/cleanup-expired?secret=${SECRET}")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
    echo "✅ Cleanup réussi: $BODY"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Cleanup réussi: $BODY" >> /var/log/fermier-pro-cleanup.log 2>&1
    exit 0
else
    echo "❌ Erreur HTTP $HTTP_CODE: $BODY"
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Erreur HTTP $HTTP_CODE: $BODY" >> /var/log/fermier-pro-cleanup.log 2>&1
    exit 1
fi
