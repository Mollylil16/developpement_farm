# Dockerfile pour Backend NestJS - Production
# Multi-stage build pour optimiser la taille de l'image

FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# Installer toutes les dépendances (y compris devDependencies pour le build)
RUN npm ci

# Copier le code source
COPY . .

# Build l'application
RUN npm run build

# Stage de production
FROM node:18-alpine

WORKDIR /app

# Installer uniquement les dépendances de production
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copier les fichiers buildés depuis le stage builder
COPY --from=builder /app/dist ./dist

# Créer un utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

USER nestjs

# Exposer le port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Commande de démarrage
CMD ["node", "dist/main.js"]

