// Polyfill pour Buffer (requis par react-native-svg)
import { Buffer } from 'buffer';

// Déclaration du type global pour TypeScript
declare global {
  // eslint-disable-next-line no-var
  var Buffer: typeof import('buffer').Buffer;
}

// @ts-ignore - Buffer polyfill
global.Buffer = Buffer;

// L'enregistrement de l'application est maintenant fait directement dans App.tsx
// Ce fichier est conservé pour la compatibilité avec package.json qui pointe vers index.ts
import './App';
