@echo off
echo ========================================
echo Migration SQLite vers PostgreSQL
echo ========================================
echo.

REM Vérifier si Node.js est installé
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js n'est pas installé ou n'est pas dans le PATH
    pause
    exit /b 1
)

REM Installer better-sqlite3 si nécessaire
echo 📦 Installation des dépendances...
call npm install better-sqlite3 --save-dev

echo.
echo 🚀 Lancement de la migration...
echo.

REM Charger les variables d'environnement depuis .env si elles existent
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do (
        set "%%a=%%b"
    )
)

REM Exécuter le script de migration
node scripts/migrate-sqlite-to-postgres.js

echo.
pause
