# Configuration de l'Environnement Virtuel

## ✅ Étape 1 : Environnement virtuel créé

Vous avez déjà créé l'environnement virtuel avec :
```bash
python -m venv venv
```

## 🔧 Étape 2 : Activer l'environnement virtuel

### Sur Windows (PowerShell)
```powershell
.\venv\Scripts\Activate.ps1
```

Si vous avez une erreur d'exécution de script, exécutez d'abord :
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Sur Windows (CMD)
```cmd
venv\Scripts\activate.bat
```

### Sur Linux/Mac
```bash
source venv/bin/activate
```

## 📦 Étape 3 : Installer les dépendances

Une fois l'environnement activé (vous verrez `(venv)` dans votre terminal), installez les dépendances :

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## ✅ Étape 4 : Vérifier l'installation

Vérifiez que tout est installé correctement :

```bash
python -c "import torch; import cv2; import fastapi; print('✅ Toutes les dépendances sont installées!')"
```

## 🚀 Étape 5 : Démarrer le serveur API

Pour démarrer le serveur FastAPI :

```bash
python -m api.server
```

Ou avec uvicorn directement :

```bash
uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload
```

## 📝 Notes

- **Activation** : Vous devez activer l'environnement virtuel à chaque nouvelle session de terminal
- **Désactivation** : Tapez simplement `deactivate` pour quitter l'environnement virtuel
- **Version Python** : Assurez-vous d'utiliser Python 3.8 ou supérieur

## 🔍 Vérification de la version Python

```bash
python --version
```

Doit afficher Python 3.8.x ou supérieur.

