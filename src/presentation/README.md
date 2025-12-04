# Presentation Layer

Cette couche contient tout ce qui concerne l'interface utilisateur.

## Structure

```
presentation/
├── screens/          # Écrans (déjà dans src/screens/)
├── components/      # Composants UI (déjà dans src/components/)
└── store/           # Redux store (déjà dans src/store/)
```

## Principe

Les slices Redux doivent :
1. Contenir uniquement l'état UI
2. Appeler les use cases du domaine pour la logique métier
3. Ne jamais accéder directement aux repositories

## Migration progressive

Les slices actuels seront progressivement refactorés pour :
- Extraire la logique métier vers les use cases
- Garder uniquement l'état de présentation
- Utiliser les use cases via des hooks ou des thunks

