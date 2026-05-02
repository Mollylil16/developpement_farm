# How to Start the FarmTrack Project

## Quick Start

The project files are located in the `developpement_farm` subdirectory, not in the root directory.

### Option 1: Use the helper script
```powershell
.\start-project.ps1
```

### Option 2: Manual navigation
```powershell
cd developpement_farm
npm start
```

### Option 3: One-liner
```powershell
cd developpement_farm; npm start
```

## Common Commands

Once you're in the `developpement_farm` directory:

- **Start development server**: `npm start`
- **Run on Android**: `npm run android`
- **Run on iOS**: `npm run ios`
- **Run on Web**: `npm run web`
- **Start admin web**: `npm run admin`
- **Run tests**: `npm test`
- **Git pull**: `git pull`

## Why this happens

The project structure is:
```
farmtrack_dev/
  └── developpement_farm/    ← The actual project is here
      ├── package.json
      ├── src/
      └── ...
```

So you need to navigate into `developpement_farm` before running npm commands.

