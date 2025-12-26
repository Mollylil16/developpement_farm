// ⚠️ CRITIQUE: react-native-gesture-handler DOIT être le PREMIER import
// Cela doit être fait AVANT tout autre import React Native
import 'react-native-gesture-handler';

// Polyfill pour Buffer (requis par react-native-svg)
// Le polyfill est déjà configuré dans metro.config.js, donc on vérifie juste si Buffer existe
// Si Buffer n'existe pas, metro.config.js le fournira automatiquement
// On déclare juste le type pour TypeScript

// Déclaration du type global pour TypeScript
declare global {
  var Buffer: {
    from(data: unknown, encoding?: string): Buffer;
    isBuffer(obj: unknown): boolean;
    alloc(size: number, fill?: string | number | Buffer): Buffer;
    concat(list: Buffer[], totalLength?: number): Buffer;
    [key: string]: unknown;
  };
}

// L'enregistrement de l'application est maintenant fait directement dans App.tsx
// Ce fichier est conservé pour la compatibilité avec package.json qui pointe vers index.ts
import './App';
