"""
Script d'entraînement pour le modèle d'estimation de poids
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torchvision import transforms, models
from pathlib import Path
import yaml
import numpy as np
from PIL import Image
import pandas as pd
from tqdm import tqdm

class WeightEstimationDataset(Dataset):
    """Dataset pour l'estimation de poids"""
    
    def __init__(self, images_dir: str, annotations_file: str, transform=None):
        """
        Args:
            images_dir: Dossier contenant les images
            annotations_file: Fichier CSV avec colonnes: image_path, bbox_x1, bbox_y1, bbox_x2, bbox_y2, weight_kg
            transform: Transformations à appliquer
        """
        self.images_dir = Path(images_dir)
        self.annotations = pd.read_csv(annotations_file)
        self.transform = transform or self._default_transform()
    
    def _default_transform(self):
        return transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    
    def __len__(self):
        return len(self.annotations)
    
    def __getitem__(self, idx):
        row = self.annotations.iloc[idx]
        
        # Charger l'image
        image_path = self.images_dir / row['image_path']
        image = Image.open(image_path).convert('RGB')
        
        # Extraire la région du porc
        x1, y1, x2, y2 = int(row['bbox_x1']), int(row['bbox_y1']), int(row['bbox_x2']), int(row['bbox_y2'])
        pig_roi = image.crop((x1, y1, x2, y2))
        
        # Appliquer les transformations
        if self.transform:
            pig_roi = self.transform(pig_roi)
        
        # Poids réel
        weight = float(row['weight_kg'])
        
        return pig_roi, torch.tensor(weight, dtype=torch.float32)

def create_model():
    """Crée le modèle d'estimation de poids"""
    model = models.resnet50(pretrained=True)
    
    # Remplacer la dernière couche
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Linear(num_features, 512),
        nn.ReLU(),
        nn.Dropout(0.5),
        nn.Linear(512, 256),
        nn.ReLU(),
        nn.Dropout(0.3),
        nn.Linear(256, 1)
    )
    
    return model

def train_weight_model(config_path: str = "config/config.yaml"):
    """
    Entraîne le modèle d'estimation de poids
    
    Args:
        config_path: Chemin vers le fichier de configuration
    """
    # Charger la configuration
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    training_config = config['training']['weight_estimation']
    paths_config = config['paths']
    
    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Utilisation de: {device}")
    
    # Créer les datasets
    train_dataset = WeightEstimationDataset(
        images_dir=paths_config['images_dir'],
        annotations_file=Path(paths_config['annotations_dir']) / 'train_weights.csv',
        transform=transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    )
    
    val_dataset = WeightEstimationDataset(
        images_dir=paths_config['images_dir'],
        annotations_file=Path(paths_config['annotations_dir']) / 'val_weights.csv'
    )
    
    train_loader = DataLoader(train_dataset, batch_size=training_config['batch_size'], shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=training_config['batch_size'], shuffle=False)
    
    # Créer le modèle
    model = create_model().to(device)
    
    # Loss et optimizer
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=training_config['learning_rate'])
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)
    
    # Entraînement
    best_val_loss = float('inf')
    model_path = Path(config['models']['weight_estimation']['path'])
    model_path.parent.mkdir(parents=True, exist_ok=True)
    
    for epoch in range(training_config['epochs']):
        # Phase d'entraînement
        model.train()
        train_loss = 0.0
        
        for images, weights in tqdm(train_loader, desc=f"Epoch {epoch+1}/{training_config['epochs']} [Train]"):
            images = images.to(device)
            weights = weights.to(device)
            
            optimizer.zero_grad()
            predictions = model(images).squeeze()
            loss = criterion(predictions, weights)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
        
        train_loss /= len(train_loader)
        
        # Phase de validation
        model.eval()
        val_loss = 0.0
        val_mae = 0.0
        
        with torch.no_grad():
            for images, weights in tqdm(val_loader, desc=f"Epoch {epoch+1}/{training_config['epochs']} [Val]"):
                images = images.to(device)
                weights = weights.to(device)
                
                predictions = model(images).squeeze()
                loss = criterion(predictions, weights)
                val_loss += loss.item()
                val_mae += torch.mean(torch.abs(predictions - weights)).item()
        
        val_loss /= len(val_loader)
        val_mae /= len(val_loader)
        
        scheduler.step(val_loss)
        
        print(f"Epoch {epoch+1}: Train Loss: {train_loss:.4f}, Val Loss: {val_loss:.4f}, Val MAE: {val_mae:.4f}kg")
        
        # Sauvegarder le meilleur modèle
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'epoch': epoch,
                'val_loss': val_loss,
                'val_mae': val_mae
            }, model_path)
            print(f"Meilleur modèle sauvegardé (Val Loss: {val_loss:.4f})")
    
    print(f"Entraînement terminé! Modèle sauvegardé dans: {model_path}")

if __name__ == "__main__":
    train_weight_model()

