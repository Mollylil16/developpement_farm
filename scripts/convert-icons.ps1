# Script PowerShell pour convertir les icones JPG en PNG
# Utilise ImageMagick si disponible, sinon donne des instructions

Write-Host "Conversion des icones JPG vers PNG" -ForegroundColor Cyan
Write-Host ""

# Verifier si ImageMagick est installe
$magickPath = Get-Command magick -ErrorAction SilentlyContinue

if ($magickPath) {
    Write-Host "ImageMagick trouve ! Conversion en cours..." -ForegroundColor Green
    Write-Host ""
    
    # Convertir icon.png
    if (Test-Path "assets\icon.png") {
        Write-Host "Conversion de icon.png..." -ForegroundColor Yellow
        $tempFile = "assets\icon_temp.png"
        magick "assets\icon.png" -format png "$tempFile"
        if ($LASTEXITCODE -eq 0) {
            Move-Item -Force "$tempFile" "assets\icon.png"
            Write-Host "icon.png converti avec succes" -ForegroundColor Green
        }
        else {
            Write-Host "Erreur lors de la conversion de icon.png" -ForegroundColor Red
        }
    }
    
    # Convertir adaptive-icon.png
    if (Test-Path "assets\adaptive-icon.png") {
        Write-Host "Conversion de adaptive-icon.png..." -ForegroundColor Yellow
        $tempFile = "assets\adaptive-icon_temp.png"
        magick "assets\adaptive-icon.png" -format png "$tempFile"
        if ($LASTEXITCODE -eq 0) {
            Move-Item -Force "$tempFile" "assets\adaptive-icon.png"
            Write-Host "adaptive-icon.png converti avec succes" -ForegroundColor Green
        }
        else {
            Write-Host "Erreur lors de la conversion de adaptive-icon.png" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "Conversion terminee !" -ForegroundColor Green
}
else {
    Write-Host "ImageMagick n'est pas installe" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Options pour installer ImageMagick :" -ForegroundColor Cyan
    Write-Host "1. Avec Chocolatey : choco install imagemagick" -ForegroundColor White
    Write-Host "2. Telecharger depuis : https://imagemagick.org/script/download.php" -ForegroundColor White
    Write-Host ""
    Write-Host "Ou utilisez un outil en ligne :" -ForegroundColor Cyan
    Write-Host "- https://cloudconvert.com/jpg-to-png" -ForegroundColor White
    Write-Host "- https://convertio.co/jpg-png/" -ForegroundColor White
    Write-Host ""
    Write-Host "Instructions manuelles :" -ForegroundColor Cyan
    Write-Host "1. Ouvrez assets\icon.png dans un editeur d'images" -ForegroundColor White
    Write-Host "2. Exportez-le au format PNG" -ForegroundColor White
    Write-Host "3. Remplacez le fichier original" -ForegroundColor White
    Write-Host "4. Repetez pour assets\adaptive-icon.png" -ForegroundColor White
}
