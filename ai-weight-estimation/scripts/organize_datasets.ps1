# Script pour organiser les datasets téléchargés
# Usage: .\scripts\organize_datasets.ps1 -SourcePath "C:\Users\ASUS\Downloads" -DatasetNames "dataset1,dataset2"

param(
    [string]$SourcePath = "$env:USERPROFILE\Downloads",
    [string[]]$DatasetNames = @()
)

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "Organisation des datasets pour l'entraînement" -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""

# Chemin de destination dans le projet
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$DataDir = Join-Path $ProjectRoot "data"
$ImagesDir = Join-Path $DataDir "images"
$VideosDir = Join-Path $DataDir "videos"
$AnnotationsDir = Join-Path $DataDir "annotations"

# Créer les dossiers nécessaires
Write-Host "📁 Création de la structure de dossiers..." -ForegroundColor Yellow
$dirs = @(
    "$ImagesDir\train",
    "$ImagesDir\val",
    "$ImagesDir\test",
    "$VideosDir",
    "$AnnotationsDir\yolo\train",
    "$AnnotationsDir\yolo\val",
    "$AnnotationsDir\yolo\test",
    "$AnnotationsDir\raw"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "   ✓ Créé: $dir" -ForegroundColor Green
    }
}

Write-Host ""

# Si aucun nom de dataset n'est fourni, chercher dans Téléchargements
if ($DatasetNames.Count -eq 0) {
    Write-Host "🔍 Recherche des datasets dans: $SourcePath" -ForegroundColor Yellow
    
    # Chercher les dossiers qui pourraient contenir des datasets
    $potentialDatasets = Get-ChildItem -Path $SourcePath -Directory | 
        Where-Object { 
            $_.Name -match "(dataset|data|pig|porc|animal|images|train|val)" -or
            (Get-ChildItem $_.FullName -File -Recurse -Include *.jpg,*.jpeg,*.png,*.bmp -ErrorAction SilentlyContinue | Measure-Object).Count -gt 0
        }
    
    if ($potentialDatasets.Count -eq 0) {
        Write-Host "❌ Aucun dataset trouvé dans $SourcePath" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Indiquez manuellement les noms des dossiers:" -ForegroundColor Yellow
        Write-Host "   .\scripts\organize_datasets.ps1 -DatasetNames 'nom_dataset1','nom_dataset2'" -ForegroundColor Cyan
        exit
    }
    
    Write-Host "📦 Datasets trouvés:" -ForegroundColor Green
    $index = 1
    foreach ($ds in $potentialDatasets) {
        $imgCount = (Get-ChildItem $ds.FullName -File -Recurse -Include *.jpg,*.jpeg,*.png,*.bmp -ErrorAction SilentlyContinue | Measure-Object).Count
        Write-Host "   $index. $($ds.Name) ($imgCount images)" -ForegroundColor White
        $index++
    }
    
    Write-Host ""
    $selection = Read-Host "Sélectionnez les datasets à copier (ex: 1,2 ou 'all' pour tous)"
    
    if ($selection -eq "all") {
        $DatasetNames = $potentialDatasets.Name
    } else {
        $indices = $selection -split ',' | ForEach-Object { [int]$_.Trim() - 1 }
        $DatasetNames = $indices | ForEach-Object { $potentialDatasets[$_].Name }
    }
}

# Copier les datasets
Write-Host ""
Write-Host "📋 Organisation des datasets sélectionnés..." -ForegroundColor Yellow
Write-Host ""

$totalImages = 0
$totalVideos = 0

foreach ($datasetName in $DatasetNames) {
    $sourceDatasetPath = Join-Path $SourcePath $datasetName
    
    if (-not (Test-Path $sourceDatasetPath)) {
        Write-Host "⚠️  Dataset non trouvé: $sourceDatasetPath" -ForegroundColor Red
        continue
    }
    
    Write-Host "📦 Traitement de: $datasetName" -ForegroundColor Cyan
    
    # Chercher les images
    $images = Get-ChildItem -Path $sourceDatasetPath -File -Recurse -Include *.jpg,*.jpeg,*.png,*.bmp,*.JPG,*.JPEG,*.PNG,*.BMP -ErrorAction SilentlyContinue
    
    # Chercher les vidéos
    $videos = Get-ChildItem -Path $sourceDatasetPath -File -Recurse -Include *.mp4,*.avi,*.mov,*.mkv,*.MP4,*.AVI,*.MOV,*.MKV -ErrorAction SilentlyContinue
    
    # Chercher les annotations
    $annotations = Get-ChildItem -Path $sourceDatasetPath -File -Recurse -Include *.txt,*.xml,*.json,*.csv -ErrorAction SilentlyContinue | 
        Where-Object { $_.Name -match "(annotation|label|bbox|yolo|coco)" }
    
    Write-Host "   📸 Images: $($images.Count)" -ForegroundColor White
    Write-Host "   🎥 Vidéos: $($videos.Count)" -ForegroundColor White
    Write-Host "   📝 Annotations: $($annotations.Count)" -ForegroundColor White
    
    # Copier les images (80% train, 20% val)
    if ($images.Count -gt 0) {
        $trainCount = [math]::Floor($images.Count * 0.8)
        $valCount = $images.Count - $trainCount
        
        $trainImages = $images | Select-Object -First $trainCount
        $valImages = $images | Select-Object -Skip $trainCount
        
        Write-Host "   📁 Copie des images..." -ForegroundColor Yellow
        
        foreach ($img in $trainImages) {
            $destPath = Join-Path "$ImagesDir\train" "$datasetName`_$($img.Name)"
            Copy-Item -Path $img.FullName -Destination $destPath -Force -ErrorAction SilentlyContinue
        }
        
        foreach ($img in $valImages) {
            $destPath = Join-Path "$ImagesDir\val" "$datasetName`_$($img.Name)"
            Copy-Item -Path $img.FullName -Destination $destPath -Force -ErrorAction SilentlyContinue
        }
        
        $totalImages += $images.Count
        Write-Host "      ✓ $trainCount images → train/" -ForegroundColor Green
        Write-Host "      ✓ $valCount images → val/" -ForegroundColor Green
    }
    
    # Copier les vidéos
    if ($videos.Count -gt 0) {
        Write-Host "   📁 Copie des vidéos..." -ForegroundColor Yellow
        foreach ($vid in $videos) {
            $destPath = Join-Path $VideosDir "$datasetName`_$($vid.Name)"
            Copy-Item -Path $vid.FullName -Destination $destPath -Force -ErrorAction SilentlyContinue
        }
        $totalVideos += $videos.Count
        Write-Host "      ✓ $($videos.Count) vidéos copiées" -ForegroundColor Green
    }
    
    # Copier les annotations dans un dossier raw
    if ($annotations.Count -gt 0) {
        Write-Host "   📁 Copie des annotations..." -ForegroundColor Yellow
        $annotationDestDir = Join-Path "$AnnotationsDir\raw" $datasetName
        if (-not (Test-Path $annotationDestDir)) {
            New-Item -ItemType Directory -Path $annotationDestDir -Force | Out-Null
        }
        
        foreach ($ann in $annotations) {
            $destPath = Join-Path $annotationDestDir $ann.Name
            Copy-Item -Path $ann.FullName -Destination $destPath -Force -ErrorAction SilentlyContinue
        }
        Write-Host "      ✓ $($annotations.Count) fichiers d'annotations copiés" -ForegroundColor Green
    }
    
    Write-Host ""
}

Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Organisation terminée!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Résumé:" -ForegroundColor Yellow
Write-Host "   • Images totales: $totalImages" -ForegroundColor White
Write-Host "   • Vidéos totales: $totalVideos" -ForegroundColor White
Write-Host ""
Write-Host "📁 Structure créée:" -ForegroundColor Yellow
Write-Host "   • data/images/train/  → Images d'entraînement" -ForegroundColor White
Write-Host "   • data/images/val/     → Images de validation" -ForegroundColor White
Write-Host "   • data/videos/         → Vidéos" -ForegroundColor White
Write-Host "   • data/annotations/raw/ → Annotations brutes" -ForegroundColor White
Write-Host ""
Write-Host "📝 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "   1. Vérifiez les images dans data/images/train/ et data/images/val/" -ForegroundColor White
Write-Host "   2. Si les annotations sont dans un format différent, convertissez-les au format YOLO" -ForegroundColor White
Write-Host "   3. Annotez les images manquantes si nécessaire" -ForegroundColor White
Write-Host "   4. Lancez: python scripts/prepare_data.py pour créer les templates" -ForegroundColor White
Write-Host "   5. Commencez l'entraînement avec: python training/train_detection.py" -ForegroundColor White
Write-Host ""

