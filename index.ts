// ⚠️ CRITIQUE: react-native-gesture-handler DOIT être le PREMIER import
// Cela doit être fait AVANT tout autre import React Native

// #region agent log
fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:1',message:'[A] index.ts START - before gesture-handler',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
// #endregion

import 'react-native-gesture-handler';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:2',message:'[A] gesture-handler loaded OK',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});

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

// #region agent log
fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:3',message:'[C] About to import App.tsx',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
// #endregion

import './App';

// #region agent log
fetch('http://127.0.0.1:7242/ingest/26f636b2-fbd4-4331-9689-5c4fcd5e31de',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'index.ts:4',message:'[C] App.tsx loaded OK',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
