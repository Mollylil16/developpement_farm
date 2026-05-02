# 📸 Système d'Upload de Photos de Profil

## 📋 Vue d'ensemble

Le système d'upload de photos de profil permet aux utilisateurs d'uploader, redimensionner et gérer leurs photos de profil sur le serveur.

## 🎯 Fonctionnalités

- ✅ Upload de fichiers image (JPG, JPEG, PNG, WEBP)
- ✅ Validation de taille (max 5MB)
- ✅ Redimensionnement automatique à 500x500px
- ✅ Conversion en JPEG pour optimiser la taille
- ✅ Suppression automatique de l'ancienne photo
- ✅ Génération de noms de fichiers uniques
- ✅ Service de fichiers statiques pour l'accès

## 📁 Structure des fichiers

```
backend/
├── uploads/
│   └── profile-photos/          # Dossier de stockage des photos
│       └── .gitkeep
├── src/
│   └── users/
│       ├── interceptors/
│       │   └── file-upload.interceptor.ts  # Validation et configuration multer
│       ├── users.controller.ts              # Routes d'upload
│       └── users.service.ts                 # Logique métier
└── main.ts                                  # Configuration serveur statique
```

## 🔌 Endpoints

### POST `/users/:id/photo`

Upload une photo de profil pour un utilisateur.

**Authentification** : Requise (JWT)

**Permissions** : L'utilisateur ne peut modifier que sa propre photo

**Content-Type** : `multipart/form-data`

**Paramètres** :
- `photo` (file) : Fichier image (max 5MB, formats: JPG, JPEG, PNG, WEBP)

**Réponse 200** :
```json
{
  "photoUrl": "http://localhost:3000/uploads/profile-photos/user_123_1234567890.jpg",
  "message": "Photo de profil uploadée avec succès"
}
```

**Erreurs** :
- `400 Bad Request` : Fichier invalide (taille, format, etc.)
- `401 Unauthorized` : Token JWT manquant ou invalide
- `403 Forbidden` : Tentative de modifier la photo d'un autre utilisateur
- `404 Not Found` : Utilisateur introuvable

### GET `/uploads/profile-photos/:filename`

Récupère une photo de profil (géré automatiquement par le serveur statique).

**Authentification** : Non requise (public)

**Exemple** :
```
GET http://localhost:3000/uploads/profile-photos/user_123_1234567890.jpg
```

## 🔧 Configuration

### Variables d'environnement

```env
API_URL=http://localhost:3000  # URL de base pour générer les URLs complètes
```

### Taille maximale

Par défaut : **5MB** (configurable dans `file-upload.interceptor.ts`)

### Formats acceptés

- JPEG / JPG
- PNG
- WEBP

### Dimensions

Les images sont automatiquement redimensionnées à **500x500px** avec un crop centré.

## 💻 Exemple d'utilisation (Frontend)

### React Native / Expo

```typescript
import * as ImagePicker from 'expo-image-picker';
import FormData from 'form-data';

const uploadProfilePhoto = async (userId: string) => {
  // Sélectionner une image
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (!result.canceled && result.assets[0]) {
    const formData = new FormData();
    formData.append('photo', {
      uri: result.assets[0].uri,
      type: 'image/jpeg',
      name: 'photo.jpg',
    } as any);

    const response = await fetch(`${API_URL}/users/${userId}/photo`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });

    const data = await response.json();
    return data.photoUrl;
  }
};
```

### JavaScript / Fetch API

```javascript
const uploadProfilePhoto = async (userId, file, token) => {
  const formData = new FormData();
  formData.append('photo', file);

  const response = await fetch(`http://localhost:3000/users/${userId}/photo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const data = await response.json();
  return data.photoUrl;
};
```

## 🔒 Sécurité

1. **Validation de type MIME** : Seuls les formats image sont acceptés
2. **Validation de taille** : Limite de 5MB
3. **Protection path traversal** : Les noms de fichiers sont validés
4. **Authentification** : Seul le propriétaire peut modifier sa photo
5. **Noms de fichiers uniques** : Format `userId_timestamp.ext` pour éviter les collisions

## 🗑️ Suppression automatique

Lors de l'upload d'une nouvelle photo, l'ancienne photo est automatiquement supprimée du serveur pour économiser l'espace disque.

## 📝 Notes techniques

- Les images sont converties en JPEG avec une qualité de 85% pour optimiser la taille
- Le redimensionnement utilise `sharp` avec un crop centré (`fit: 'cover'`)
- Les fichiers sont servis avec un cache de 1 an pour améliorer les performances
- Le dossier `uploads/profile-photos` doit exister avant le premier upload

## 🐛 Dépannage

### Erreur "EACCES: permission denied"
- Vérifier les permissions du dossier `uploads/profile-photos`
- S'assurer que le serveur a les droits d'écriture

### Erreur "File too large"
- Vérifier que le fichier fait moins de 5MB
- Réduire la qualité de l'image avant l'upload

### Erreur "Format non supporté"
- Vérifier que le fichier est bien un JPG, JPEG, PNG ou WEBP
- Vérifier le type MIME du fichier

### Photo non accessible
- Vérifier que `main.ts` configure bien le serveur statique
- Vérifier que l'URL de base (`API_URL`) est correcte
