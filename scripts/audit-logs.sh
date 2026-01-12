#!/bin/bash
# Script d'audit des logs pour détecter les fuites de données sensibles
# Usage: ./scripts/audit-logs.sh [directory]

set -e

SEARCH_DIR="${1:-src}"

echo "🔍 Audit des logs pour détecter les fuites de données sensibles"
echo "================================================================"
echo ""

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ISSUES_FOUND=0

echo "📋 Vérification 1: Recherche de console.log avec tokens..."
if grep -r "console\.log.*token" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "REDACTED\|sanitize\|masquer\|logger" > /dev/null; then
    echo -e "${RED}❌ PROBLÈME: console.log avec 'token' trouvé${NC}"
    grep -rn "console\.log.*token" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "REDACTED\|sanitize\|masquer\|logger" || true
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ Aucun console.log avec token trouvé${NC}"
fi

echo ""
echo "📋 Vérification 2: Recherche de console.log avec password..."
if grep -r "console\.log.*password" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" -i 2>/dev/null | grep -v "REDACTED\|sanitize\|masquer\|logger" > /dev/null; then
    echo -e "${RED}❌ PROBLÈME: console.log avec 'password' trouvé${NC}"
    grep -rn "console\.log.*password" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" -i 2>/dev/null | grep -v "REDACTED\|sanitize\|masquer\|logger" || true
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ Aucun console.log avec password trouvé${NC}"
fi

echo ""
echo "📋 Vérification 3: Recherche de logger avec tokens non sanitizés..."
if grep -r "logger\.(log|debug|info|warn).*access_token|logger\.(log|debug|info|warn).*refresh_token" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" -E 2>/dev/null | grep -v "REDACTED\|sanitize\|masquer\|structured" > /dev/null; then
    echo -e "${YELLOW}⚠️  ATTENTION: logger avec token trouvé (vérifier que c'est sanitizé)${NC}"
    grep -rn "logger\.(log|debug|info|warn).*access_token|logger\.(log|debug|info|warn).*refresh_token" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" -E 2>/dev/null | grep -v "REDACTED\|sanitize\|masquer\|structured" || true
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ Aucun logger direct avec token trouvé${NC}"
fi

echo ""
echo "📋 Vérification 4: Recherche de console.log directs (devrait utiliser logger)..."
CONSOLE_LOGS=$(grep -r "console\.log" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "node_modules\|__tests__\|test\.ts\|logger\.ts" | wc -l || echo "0")
if [ "$CONSOLE_LOGS" -gt 0 ]; then
    echo -e "${YELLOW}⚠️  ATTENTION: $CONSOLE_LOGS console.log trouvés (devrait utiliser logger)${NC}"
    echo "   Utiliser 'logger.debug()' ou 'logger.structured()' à la place"
else
    echo -e "${GREEN}✅ Aucun console.log direct trouvé${NC}"
fi

echo ""
echo "📋 Vérification 5: Recherche de patterns JWT dans les logs..."
if grep -r -E "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "REDACTED\|sanitize\|masquer\|test" > /dev/null; then
    echo -e "${RED}❌ PROBLÈME: Pattern JWT trouvé dans le code${NC}"
    echo "   Vérifier que ce sont des exemples dans les tests ou commentaires uniquement"
    grep -rn -E "eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+" "$SEARCH_DIR" --include="*.ts" --include="*.tsx" 2>/dev/null | grep -v "REDACTED\|sanitize\|masquer\|test" || true
    ISSUES_FOUND=$((ISSUES_FOUND + 1))
else
    echo -e "${GREEN}✅ Aucun pattern JWT suspect trouvé${NC}"
fi

echo ""
echo "================================================================"
if [ $ISSUES_FOUND -eq 0 ]; then
    echo -e "${GREEN}✅ Audit terminé : Aucun problème critique trouvé${NC}"
    exit 0
else
    echo -e "${RED}❌ Audit terminé : $ISSUES_FOUND problème(s) trouvé(s)${NC}"
    echo ""
    echo "Recommandations :"
    echo "1. Remplacer tous les console.log par logger.structured()"
    echo "2. Vérifier que les tokens sont bien sanitizés"
    echo "3. Utiliser logger.structured() pour logger des données"
    echo ""
    exit 1
fi
