// Polyfill pour Buffer (requis par react-native-svg)
import { Buffer } from 'buffer';

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

global.Buffer = Buffer;

// L'enregistrement de l'application est maintenant fait directement dans App.tsx
// Ce fichier est conservé pour la compatibilité avec package.json qui pointe vers index.ts
import './App';
