#!/bin/bash

# Script d'installation des dépendances pour l'export PDF
# Fermier Pro - Export PDF Feature

echo "================================================"
echo "   Installation Export PDF - Fermier Pro"
echo "================================================"
echo ""

# Couleurs
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Vérifier si npm est installé
echo -e "${CYAN}🔍 Vérification de npm...${NC}"
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm version: $NPM_VERSION${NC}"
else
    echo -e "${RED}❌ npm n'est pas installé. Installez Node.js d'abord.${NC}"
    exit 1
fi

# Vérifier si expo-cli est disponible
echo ""
echo -e "${CYAN}🔍 Vérification d'Expo...${NC}"
if command -v npx &> /dev/null; then
    EXPO_VERSION=$(npx expo --version 2>/dev/null || echo "non installé")
    if [ "$EXPO_VERSION" != "non installé" ]; then
        echo -e "${GREEN}✅ Expo version: $EXPO_VERSION${NC}"
    else
        echo -e "${YELLOW}⚠️  Expo n'est pas installé globalement, mais ce n'est pas grave.${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  npx n'est pas disponible.${NC}"
fi

# Installer expo-print
echo ""
echo -e "${CYAN}📦 Installation d'expo-print...${NC}"
if npx expo install expo-print; then
    echo -e "${GREEN}✅ expo-print installé avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'installation d'expo-print${NC}"
    exit 1
fi

# Installer expo-sharing
echo ""
echo -e "${CYAN}📦 Installation d'expo-sharing...${NC}"
if npx expo install expo-sharing; then
    echo -e "${GREEN}✅ expo-sharing installé avec succès${NC}"
else
    echo -e "${RED}❌ Erreur lors de l'installation d'expo-sharing${NC}"
    exit 1
fi

# Vérification finale dans package.json
echo ""
echo -e "${CYAN}🔍 Vérification de package.json...${NC}"

EXPO_PRINT_FOUND=$(grep -c '"expo-print"' package.json || echo "0")
EXPO_SHARING_FOUND=$(grep -c '"expo-sharing"' package.json || echo "0")

if [ "$EXPO_PRINT_FOUND" -gt 0 ]; then
    echo -e "${GREEN}✅ expo-print trouvé dans package.json${NC}"
else
    echo -e "${YELLOW}⚠️  expo-print non trouvé dans package.json${NC}"
fi

if [ "$EXPO_SHARING_FOUND" -gt 0 ]; then
    echo -e "${GREEN}✅ expo-sharing trouvé dans package.json${NC}"
else
    echo -e "${YELLOW}⚠️  expo-sharing non trouvé dans package.json${NC}"
fi

# Résumé
echo ""
echo "================================================"
echo "   Résumé de l'installation"
echo "================================================"
echo ""

if [ "$EXPO_PRINT_FOUND" -gt 0 ] && [ "$EXPO_SHARING_FOUND" -gt 0 ]; then
    echo -e "${GREEN}✅ Toutes les dépendances sont installées!${NC}"
    echo ""
    echo -e "${CYAN}📝 Prochaines étapes:${NC}"
    echo -e "   ${NC}1. Redémarrez le serveur Expo:${NC}"
    echo -e "      ${YELLOW}npx expo start --clear${NC}"
    echo ""
    echo -e "   ${NC}2. Testez l'export PDF:${NC}"
    echo -e "      ${NC}- Ouvrez l'app${NC}"
    echo -e "      ${NC}- Allez sur le Dashboard${NC}"
    echo -e "      ${NC}- Cliquez sur le bouton 📄${NC}"
    echo ""
    echo -e "   ${NC}3. Consultez la documentation:${NC}"
    echo -e "      ${YELLOW}- INSTALLATION_PDF.md${NC}"
    echo -e "      ${YELLOW}- EXPORT_PDF_RECAP.md${NC}"
    echo ""
    echo -e "${GREEN}🎉 Félicitations! Le système d'export PDF est prêt!${NC}"
else
    echo -e "${YELLOW}⚠️  Certaines dépendances sont manquantes.${NC}"
    echo -e "   ${NC}Essayez d'exécuter manuellement:${NC}"
    echo -e "   ${YELLOW}npx expo install expo-print expo-sharing${NC}"
fi

echo ""
echo "================================================"

