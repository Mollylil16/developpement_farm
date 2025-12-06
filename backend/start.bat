@echo off
echo ========================================
echo   FarmTrack Backend - Demarrage
echo ========================================
echo.

REM Verifier si .env existe
if not exist .env (
    echo [ERREUR] Fichier .env introuvable!
    echo.
    echo Creer un fichier .env avec:
    echo DB_HOST=localhost
    echo DB_PORT=5432
    echo DB_NAME=farmtrack_db
    echo DB_USER=farmtrack_user
    echo DB_PASSWORD=postgres
    echo DB_SSL=false
    echo PORT=3000
    echo NODE_ENV=development
    echo.
    pause
    exit /b 1
)

REM Installer les dependances si node_modules n'existe pas
if not exist node_modules (
    echo Installation des dependances...
    call npm install
    echo.
)

REM Demarrer le serveur
echo Demarrage du serveur backend...
echo.
call npm run start:dev

pause

