@echo off
echo ========================================
echo  Fermier Pro - Interface Admin Web
echo ========================================
echo.

cd /d %~dp0

if not exist "node_modules" (
    echo Installation des dependances...
    call npm install
    echo.
)

echo Demarrage du serveur admin...
echo.
echo Interface web: http://localhost:3001
echo.
echo Appuyez sur Ctrl+C pour arreter le serveur
echo.

node server.js

pause

