import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

interface Photo {
  uri: string;
  caption?: string;
}

interface PhotoPickerProps {
  photos: Photo[];
  onPhotosChange: (photos: Photo[]) => void;
  maxPhotos?: number;
  allowCaption?: boolean;
}

export const PhotoPicker: React.FC<PhotoPickerProps> = ({
  photos,
  onPhotosChange,
  maxPhotos = 10,
  allowCaption = false,
}) => {
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
    try {
      // Demander permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'accès à la galerie est nécessaire pour ajouter des photos'
        );
        return;
      }

      // Calculer combien de photos on peut encore ajouter
      const remainingSlots = maxPhotos - photos.length;
      
      if (remainingSlots <= 0) {
        Alert.alert(
          'Limite atteinte',
          `Vous ne pouvez ajouter que ${maxPhotos} photos maximum`
        );
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        quality: 0.8,
        allowsEditing: false,
      });

      if (!result.canceled) {
        const selectedUris = result.assets
          .slice(0, remainingSlots)
          .map(asset => asset.uri);
        
        const newPhotos = selectedUris.map(uri => ({ uri }));
        onPhotosChange([...photos, ...newPhotos]);

        if (result.assets.length > remainingSlots) {
          Alert.alert(
            'Limite atteinte',
            `Seulement ${remainingSlots} photo(s) ajoutée(s) sur ${result.assets.length} sélectionnée(s)`
          );
        }
      }
    } catch (error) {
      console.error('Erreur sélection photos:', error);
      Alert.alert('Erreur', 'Impossible de sélectionner les photos');
    } finally {
      setLoading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'L\'accès à la caméra est nécessaire pour prendre des photos'
        );
        return;
      }

      if (photos.length >= maxPhotos) {
        Alert.alert(
          'Limite atteinte',
          `Vous ne pouvez ajouter que ${maxPhotos} photos maximum`
        );
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [4, 3],
      });

      if (!result.canceled) {
        const newPhoto = { uri: result.assets[0].uri };
        onPhotosChange([...photos, newPhoto]);
      }
    } catch (error) {
      console.error('Erreur capture photo:', error);
      Alert.alert('Erreur', 'Impossible de prendre la photo');
    } finally {
      setLoading(false);
    }
  };

  const removePhoto = (index: number) => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            const newPhotos = photos.filter((_, i) => i !== index);
            onPhotosChange(newPhotos);
          },
        },
      ]
    );
  };

  const renderPhoto = ({ item, index }: { item: Photo; index: number }) => (
    <View style={styles.photoContainer}>
      <Image source={{ uri: item.uri }} style={styles.photo} />
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => removePhoto(index)}
      >
        <Ionicons name="close-circle" size={24} color="#fff" />
      </TouchableOpacity>
      {index === 0 && (
        <View style={styles.primaryBadge}>
          <Text style={styles.primaryText}>Principale</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos du listing</Text>
        <Text style={styles.subtitle}>
          {photos.length}/{maxPhotos} photos
        </Text>
      </View>

      {photos.length > 0 && (
        <FlatList
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(_, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.photoList}
        />
      )}

      {photos.length < maxPhotos && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.galleryButton]}
            onPress={pickImages}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="images" size={24} color="#fff" />
                <Text style={styles.actionText}>Galerie</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.cameraButton]}
            onPress={takePhoto}
            disabled={loading}
          >
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.actionText}>Caméra</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.hint}>
        💡 La première photo sera affichée en couverture du listing
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 15,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  photoList: {
    paddingVertical: 10,
  },
  photoContainer: {
    marginRight: 10,
    position: 'relative',
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#ff4444',
    borderRadius: 12,
  },
  primaryBadge: {
    position: 'absolute',
    bottom: 5,
    left: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  galleryButton: {
    backgroundColor: '#4CAF50',
  },
  cameraButton: {
    backgroundColor: '#2196F3',
  },
  actionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 10,
  },
});
