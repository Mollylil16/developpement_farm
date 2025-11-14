#!/bin/bash

echo "========================================"
echo " Fermier Pro - Interface Admin Web"
echo "========================================"
echo ""

cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances..."
    npm install
    echo ""
fi

echo "Démarrage du serveur admin..."
echo ""
echo "Interface web: http://localhost:3001"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter le serveur"
echo ""

node server.js

