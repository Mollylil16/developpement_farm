import React, { useState } from 'react';
import {
  View,
  Image,
  Modal,
  TouchableOpacity,
  FlatList,
  Dimensions,
  StyleSheet,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Photo {
  url: string;
  thumbnailUrl?: string;
  caption?: string;
}

interface PhotoGalleryProps {
  photos: Photo[];
  baseUrl?: string; // URL de base du serveur
}

export const PhotoGallery: React.FC<PhotoGalleryProps> = ({
  photos,
  baseUrl = '', // Sera remplacé par l'URL réelle de l'API
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!photos || photos.length === 0) {
    return (
      <View style={styles.noPhotos}>
        <Ionicons name="image-outline" size={48} color="#ccc" />
        <Text style={styles.noPhotosText}>Aucune photo disponible</Text>
      </View>
    );
  }

  const renderThumbnail = ({ item, index }: { item: Photo; index: number }) => {
    const imageUrl = baseUrl + (item.thumbnailUrl || item.url);
    
    return (
      <TouchableOpacity
        style={styles.thumbnail}
        onPress={() => setSelectedIndex(index)}
        activeOpacity={0.8}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.thumbnailImage}
          resizeMode="cover"
        />
        {index === 0 && (
          <View style={styles.primaryBadge}>
            <Text style={styles.primaryText}>Principale</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderFullImage = ({ item, index }: { item: Photo; index: number }) => {
    const imageUrl = baseUrl + item.url;
    
    return (
      <View style={styles.fullImageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.fullImage}
          resizeMode="contain"
        />
        {item.caption && (
          <View style={styles.captionContainer}>
            <Text style={styles.caption}>{item.caption}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <>
      {/* Miniatures */}
      <FlatList
        data={photos}
        renderItem={renderThumbnail}
        keyExtractor={(_, index) => index.toString()}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.thumbnailList}
      />

      {/* Modal plein écran */}
      <Modal
        visible={selectedIndex !== null}
        transparent={false}
        onRequestClose={() => setSelectedIndex(null)}
        animationType="fade"
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedIndex(null)}
          >
            <Ionicons name="close" size={32} color="#fff" />
          </TouchableOpacity>

          {selectedIndex !== null && (
            <FlatList
              data={photos}
              horizontal
              pagingEnabled
              initialScrollIndex={selectedIndex}
              getItemLayout={(data, index) => ({
                length: Dimensions.get('window').width,
                offset: Dimensions.get('window').width * index,
                index,
              })}
              renderItem={renderFullImage}
              keyExtractor={(_, index) => index.toString()}
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(event) => {
                const newIndex = Math.round(
                  event.nativeEvent.contentOffset.x / Dimensions.get('window').width
                );
                setSelectedIndex(newIndex);
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  noPhotos: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginVertical: 10,
  },
  noPhotosText: {
    marginTop: 8,
    fontSize: 14,
    color: '#999',
  },
  thumbnailList: {
    paddingVertical: 10,
  },
  thumbnail: {
    marginRight: 10,
    position: 'relative',
  },
  thumbnailImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
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
  modalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  fullImageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  captionContainer: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    padding: 15,
  },
  caption: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});
