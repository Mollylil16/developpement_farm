/**
 * Serveur de production pour l'admin web
 * Sert les fichiers statiques buildés par Vite
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5173;

// Middleware
app.use(cors());
app.use(express.json());

// Servir les fichiers statiques depuis le dossier dist
app.use(express.static(path.join(__dirname, 'dist')));

// Toutes les routes non-API servent index.html (pour React Router)
app.get('*', (req, res) => {
  // Ne pas servir index.html pour les routes API
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`🚀 Admin Web démarré sur le port ${PORT}`);
  console.log(`📊 Interface: http://localhost:${PORT}`);
});

