# 📸 Installation - Scanner de Prix (OCR)

## 📦 **Dépendances Requises**

Pour scanner les tableaux de prix avec la caméra, nous utilisons :

### **1. Vision Camera (Caméra)**
```bash
npx expo install expo-camera
```

### **2. Image Picker (Galerie)**
```bash
npx expo install expo-image-picker
```

### **3. Text Recognition (OCR)**
```bash
npx expo install expo-image-manipulator
npm install react-native-text-recognition
```

### **4. ML Kit Vision (Google)**
Pour Android et iOS, install automatique via Expo

---

## 🚀 **Installation Automatique**

Exécutez ce script PowerShell :

```powershell
npx expo install expo-camera expo-image-picker expo-image-manipulator
```

Puis relancer le serveur :

```powershell
npx expo start --clear
```

---

## 📱 **Permissions Requises**

Le système demandera automatiquement :
- ✅ Accès à la caméra
- ✅ Accès à la galerie photo

Ces permissions sont gérées automatiquement par l'app.

---

## ⚙️ **Configuration**

Aucune configuration supplémentaire nécessaire !
L'API Google ML Kit est incluse dans React Native.

