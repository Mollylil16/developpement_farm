import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MaterialIcons } from '@expo/vector-icons';
import { DocumentFacture } from '../types';

interface DocumentManagerProps {
  documents: DocumentFacture[];
  onDocumentsChange: (documents: DocumentFacture[]) => void;
  maxDocuments?: number;
}

const DocumentManager: React.FC<DocumentManagerProps> = ({
  documents = [],
  onDocumentsChange,
  maxDocuments = 5,
}) => {
  const [showOptions, setShowOptions] = useState(false);

  const handleAddPhoto = () => {
    Alert.alert(
      'Ajouter une photo',
      'Choisissez la source de la photo',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Caméra', onPress: () => openCamera() },
        { text: 'Galerie', onPress: () => openImageLibrary() },
      ]
    );
  };

  const handleAddPDF = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newDocument: DocumentFacture = {
          id: `doc_${Date.now()}`,
          transactionId: '', // Sera défini lors de la sauvegarde
          type: 'pdf',
          nomFichier: asset.name || `document_${Date.now()}.pdf`,
          cheminFichier: asset.uri,
          tailleFichier: asset.size || 0,
          dateAjout: new Date() as any,
          description: `PDF: ${asset.name || 'Document'}`,
        };
        onDocumentsChange([...documents, newDocument]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le fichier PDF');
    }
  };

  const openCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission requise', 'Permission d\'accès à la caméra nécessaire');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newDocument: DocumentFacture = {
          id: `doc_${Date.now()}`,
          transactionId: '',
          type: 'photo',
          nomFichier: asset.fileName || `photo_${Date.now()}.jpg`,
          cheminFichier: asset.uri,
          tailleFichier: asset.fileSize || 0,
          dateAjout: new Date(),
          description: `Photo: ${asset.fileName || 'Facture'}`,
        };
        onDocumentsChange([...documents, newDocument]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'accéder à la caméra');
    }
  };

  const openImageLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission requise', 'Permission d\'accès à la galerie nécessaire');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newDocument: DocumentFacture = {
          id: `doc_${Date.now()}`,
          transactionId: '',
          type: 'photo',
          nomFichier: asset.fileName || `photo_${Date.now()}.jpg`,
          cheminFichier: asset.uri,
          tailleFichier: asset.fileSize || 0,
          dateAjout: new Date(),
          description: `Photo: ${asset.fileName || 'Facture'}`,
        };
        onDocumentsChange([...documents, newDocument]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'accéder à la galerie');
    }
  };

  const handleRemoveDocument = (documentId: string) => {
    Alert.alert(
      'Supprimer le document',
      'Êtes-vous sûr de vouloir supprimer ce document ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onDocumentsChange(documents.filter(doc => doc.id !== documentId));
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const DocumentCard = ({ document }: { document: DocumentFacture }) => (
    <View style={styles.documentCard}>
      <View style={styles.documentHeader}>
        <MaterialIcons 
          name={document.type === 'photo' ? 'photo' : 'picture-as-pdf'} 
          size={24} 
          color={document.type === 'photo' ? '#4CAF50' : '#F44336'} 
        />
        <View style={styles.documentInfo}>
          <Text style={styles.documentName} numberOfLines={1}>
            {document.nomFichier}
          </Text>
          <Text style={styles.documentDetails}>
            {formatFileSize(document.tailleFichier)} • {document.dateAjout.toLocaleDateString('fr-FR')}
          </Text>
        </View>
        <TouchableOpacity onPress={() => handleRemoveDocument(document.id)}>
          <MaterialIcons name="delete" size={20} color="#F44336" />
        </TouchableOpacity>
      </View>
      
      {document.type === 'photo' && (
        <Image 
          source={{ uri: document.cheminFichier }} 
          style={styles.documentPreview}
          resizeMode="cover"
        />
      )}
      
      {document.description && (
        <Text style={styles.documentDescription}>{document.description}</Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Documents de facture</Text>
        <Text style={styles.subtitle}>
          {documents.length}/{maxDocuments} documents
        </Text>
      </View>

      {/* Liste des documents */}
      {documents.length > 0 && (
        <ScrollView style={styles.documentsList}>
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </ScrollView>
      )}

      {/* Bouton d'ajout */}
      {documents.length < maxDocuments && (
        <View style={styles.addButtonsContainer}>
          <TouchableOpacity 
            style={[styles.addButton, styles.photoButton]}
            onPress={handleAddPhoto}
          >
            <MaterialIcons name="photo-camera" size={20} color="#fff" />
            <Text style={styles.addButtonText}>Photo</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.addButton, styles.pdfButton]}
            onPress={handleAddPDF}
          >
            <MaterialIcons name="picture-as-pdf" size={20} color="#fff" />
            <Text style={styles.addButtonText}>PDF</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Message d'information */}
      {documents.length === 0 && (
        <View style={styles.emptyState}>
          <MaterialIcons name="attach-file" size={48} color="#ccc" />
          <Text style={styles.emptyText}>Aucun document joint</Text>
          <Text style={styles.emptySubtext}>
            Vous pouvez ajouter des photos ou des fichiers PDF de vos factures
          </Text>
        </View>
      )}

      {/* Message de limite atteinte */}
      {documents.length >= maxDocuments && (
        <View style={styles.limitReached}>
          <MaterialIcons name="info" size={20} color="#FF9800" />
          <Text style={styles.limitText}>
            Limite de {maxDocuments} documents atteinte
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  documentsList: {
    maxHeight: 200,
  },
  documentCard: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentInfo: {
    flex: 1,
    marginLeft: 10,
  },
  documentName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  documentDetails: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  documentPreview: {
    width: '100%',
    height: 100,
    borderRadius: 5,
    marginBottom: 8,
  },
  documentDescription: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  addButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  photoButton: {
    backgroundColor: '#4CAF50',
  },
  pdfButton: {
    backgroundColor: '#F44336',
  },
  addButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
    textAlign: 'center',
  },
  limitReached: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff3e0',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  limitText: {
    color: '#FF9800',
    marginLeft: 5,
    fontSize: 14,
  },
});

export default DocumentManager;
