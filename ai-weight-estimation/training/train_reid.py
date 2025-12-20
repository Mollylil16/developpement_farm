"""
Script d'entraînement pour le modèle de ré-identification des porcs
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

class ReIDDataset(Dataset):
    """Dataset pour la ré-identification"""
    
    def __init__(self, images_dir: str, annotations_file: str, transform=None):
        """
        Args:
            images_dir: Dossier contenant les images
            annotations_file: Fichier CSV avec colonnes: image_path, bbox_x1, bbox_y1, bbox_x2, bbox_y2, pig_id
            transform: Transformations à appliquer
        """
        self.images_dir = Path(images_dir)
        self.annotations = pd.read_csv(annotations_file)
        self.transform = transform or self._default_transform()
        
        # Créer un mapping pig_id -> index de classe
        unique_pigs = self.annotations['pig_id'].unique()
        self.pig_to_class = {pig_id: idx for idx, pig_id in enumerate(unique_pigs)}
        self.class_to_pig = {idx: pig_id for pig_id, idx in self.pig_to_class.items()}
        self.num_classes = len(unique_pigs)
    
    def _default_transform(self):
        return transforms.Compose([
            transforms.Resize((256, 128)),
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
        
        # Classe (pig_id)
        pig_id = row['pig_id']
        class_idx = self.pig_to_class[pig_id]
        
        return pig_roi, torch.tensor(class_idx, dtype=torch.long)

def create_reid_model(num_classes: int, feature_dim: int = 512):
    """Crée le modèle de ré-identification"""
    model = models.resnet50(pretrained=True)
    
    # Remplacer la dernière couche
    num_features = model.fc.in_features
    model.fc = nn.Linear(num_features, feature_dim)
    
    # Ajouter une couche de classification pour l'entraînement
    classifier = nn.Linear(feature_dim, num_classes)
    
    return model, classifier

def train_reid_model(config_path: str = "config/config.yaml"):
    """
    Entraîne le modèle de ré-identification
    
    Args:
        config_path: Chemin vers le fichier de configuration
    """
    # Charger la configuration
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    training_config = config['training']['reid']
    paths_config = config['paths']
    
    # Device
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Utilisation de: {device}")
    
    # Créer les datasets
    train_dataset = ReIDDataset(
        images_dir=paths_config['images_dir'],
        annotations_file=Path(paths_config['annotations_dir']) / 'train_reid.csv',
        transform=transforms.Compose([
            transforms.Resize((256, 128)),
            transforms.RandomHorizontalFlip(),
            transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
    )
    
    val_dataset = ReIDDataset(
        images_dir=paths_config['images_dir'],
        annotations_file=Path(paths_config['annotations_dir']) / 'val_reid.csv'
    )
    
    train_loader = DataLoader(train_dataset, batch_size=training_config['batch_size'], shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=training_config['batch_size'], shuffle=False)
    
    # Créer les modèles
    num_classes = train_dataset.num_classes
    feature_dim = training_config.get('feature_dim', 512)
    
    model, classifier = create_reid_model(num_classes, feature_dim)
    model = model.to(device)
    classifier = classifier.to(device)
    
    # Loss et optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(
        list(model.parameters()) + list(classifier.parameters()),
        lr=training_config['learning_rate']
    )
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', factor=0.5, patience=5)
    
    # Entraînement
    best_val_loss = float('inf')
    model_path = Path(config['models']['reid']['path'])
    model_path.parent.mkdir(parents=True, exist_ok=True)
    
    for epoch in range(training_config['epochs']):
        # Phase d'entraînement
        model.train()
        classifier.train()
        train_loss = 0.0
        train_correct = 0
        train_total = 0
        
        for images, labels in tqdm(train_loader, desc=f"Epoch {epoch+1}/{training_config['epochs']} [Train]"):
            images = images.to(device)
            labels = labels.to(device)
            
            optimizer.zero_grad()
            features = model(images)
            # Normaliser les features
            features = nn.functional.normalize(features, p=2, dim=1)
            logits = classifier(features)
            loss = criterion(logits, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = torch.max(logits.data, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
        
        train_loss /= len(train_loader)
        train_acc = 100 * train_correct / train_total
        
        # Phase de validation
        model.eval()
        classifier.eval()
        val_loss = 0.0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for images, labels in tqdm(val_loader, desc=f"Epoch {epoch+1}/{training_config['epochs']} [Val]"):
                images = images.to(device)
                labels = labels.to(device)
                
                features = model(images)
                features = nn.functional.normalize(features, p=2, dim=1)
                logits = classifier(features)
                loss = criterion(logits, labels)
                
                val_loss += loss.item()
                _, predicted = torch.max(logits.data, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_loss /= len(val_loader)
        val_acc = 100 * val_correct / val_total
        
        scheduler.step(val_loss)
        
        print(f"Epoch {epoch+1}: Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%, "
              f"Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%")
        
        # Sauvegarder le meilleur modèle
        if val_loss < best_val_loss:
            best_val_loss = val_loss
            torch.save({
                'model_state_dict': model.state_dict(),
                'classifier_state_dict': classifier.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'epoch': epoch,
                'val_loss': val_loss,
                'val_acc': val_acc,
                'num_classes': num_classes,
                'feature_dim': feature_dim,
                'pig_to_class': train_dataset.pig_to_class
            }, model_path)
            print(f"Meilleur modèle sauvegardé (Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%)")
    
    print(f"Entraînement terminé! Modèle sauvegardé dans: {model_path}")

if __name__ == "__main__":
    train_reid_model()

