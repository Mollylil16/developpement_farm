# Script PowerShell pour convertir les icones JPG en PNG
# Utilise .NET System.Drawing (pas besoin d'ImageMagick)

Add-Type -AssemblyName System.Drawing

Write-Host "Conversion des icones JPG vers PNG avec .NET" -ForegroundColor Cyan
Write-Host ""

function Convert-ImageToPng {
    param(
        [string]$InputPath,
        [string]$OutputPath
    )
    
    try {
        # Utiliser le chemin absolu
        $fullInputPath = (Resolve-Path $InputPath).Path
        $fullOutputPath = $OutputPath
        
        $image = [System.Drawing.Image]::FromFile($fullInputPath)
        $pngImage = New-Object System.Drawing.Bitmap($image.Width, $image.Height)
        $graphics = [System.Drawing.Graphics]::FromImage($pngImage)
        $graphics.DrawImage($image, 0, 0)
        
        $pngImage.Save($fullOutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $graphics.Dispose()
        $pngImage.Dispose()
        $image.Dispose()
        
        return $true
    }
    catch {
        Write-Host "Erreur: $_" -ForegroundColor Red
        return $false
    }
}

# Obtenir le répertoire de travail actuel
$currentDir = Get-Location
$assetsPath = Join-Path $currentDir "assets"

# Convertir icon.png
$iconPath = Join-Path $assetsPath "icon.png"
if (Test-Path $iconPath) {
    Write-Host "Conversion de icon.png..." -ForegroundColor Yellow
    $tempFile = Join-Path $assetsPath "icon_temp.png"
    if (Convert-ImageToPng $iconPath $tempFile) {
        Remove-Item $iconPath -Force
        Move-Item -Force $tempFile $iconPath
        Write-Host "icon.png converti avec succes" -ForegroundColor Green
    }
    else {
        Write-Host "Erreur lors de la conversion de icon.png" -ForegroundColor Red
    }
}
else {
    Write-Host "Fichier icon.png introuvable dans $assetsPath" -ForegroundColor Red
}

# Convertir adaptive-icon.png
$adaptivePath = Join-Path $assetsPath "adaptive-icon.png"
if (Test-Path $adaptivePath) {
    Write-Host "Conversion de adaptive-icon.png..." -ForegroundColor Yellow
    $tempFile = Join-Path $assetsPath "adaptive-icon_temp.png"
    if (Convert-ImageToPng $adaptivePath $tempFile) {
        Remove-Item $adaptivePath -Force
        Move-Item -Force $tempFile $adaptivePath
        Write-Host "adaptive-icon.png converti avec succes" -ForegroundColor Green
    }
    else {
        Write-Host "Erreur lors de la conversion de adaptive-icon.png" -ForegroundColor Red
    }
}
else {
    Write-Host "Fichier adaptive-icon.png introuvable dans $assetsPath" -ForegroundColor Red
}

Write-Host ""
Write-Host "Conversion terminee !" -ForegroundColor Green
Write-Host "Verifiez avec: npx expo-doctor" -ForegroundColor Cyan
