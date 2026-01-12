/**
 * Composant ProfilePhoto avec gestion du cache pour la synchronisation multi-terminaux
 * Force le rechargement de l'image quand l'URI change pour éviter le cache
 */

import React, { useEffect, useState } from 'react';
import { Image, ImageProps, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

interface ProfilePhotoProps extends Omit<ImageProps, 'source'> {
  uri: string | null;
  size?: number;
  placeholder?: React.ReactNode;
  showIndicator?: boolean;
}

/**
 * Ajoute un timestamp de cache busting à l'URI pour forcer le rechargement
 * Cela permet de synchroniser l'image entre plusieurs terminaux
 * 
 * Note: Pour les URIs de fichiers locaux (file://), on ajoute aussi le cache busting
 * même si c'est moins critique car ce sont des chemins uniques
 */
function addCacheBusting(uri: string | null): string | null {
  if (!uri) return null;
  
  // Pour les URIs de fichiers locaux (file://), ne pas ajouter de cache busting
  // car le chemin du fichier est déjà unique
  if (uri.startsWith('file://')) {
    return uri;
  }
  
  // Si l'URI contient déjà un paramètre de cache busting, le remplacer
  // Sinon, ajouter un nouveau paramètre avec le timestamp actuel
  const timestamp = Date.now();
  
  // Extraire l'URI de base sans les anciens paramètres de cache
  const baseUri = uri.split('?')[0];
  const existingParams = uri.includes('?') ? uri.substring(uri.indexOf('?') + 1) : '';
  const params = new URLSearchParams(existingParams);
  
  // Mettre à jour ou ajouter le paramètre _t (timestamp) pour forcer le rechargement
  params.set('_t', timestamp.toString());
  
  return `${baseUri}?${params.toString()}`;
}

export default function ProfilePhoto({
  uri,
  size = 64,
  placeholder,
  showIndicator = false,
  style,
  ...imageProps
}: ProfilePhotoProps) {
  const { colors } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageKey, setImageKey] = useState(0); // Clé pour forcer le rechargement

  // Mettre à jour l'URI avec cache busting quand l'URI source change
  useEffect(() => {
    if (uri) {
      const bustedUri = addCacheBusting(uri);
      setImageUri(bustedUri);
      setIsLoading(true);
      setHasError(false);
      // Changer la clé pour forcer React Native à recréer le composant Image
      setImageKey(prev => prev + 1);
    } else {
      setImageUri(null);
      setHasError(false);
    }
  }, [uri]);

  // Si pas d'URI, afficher le placeholder
  if (!uri || !imageUri) {
    if (placeholder) {
      return <>{placeholder}</>;
    }
    return (
      <View
        style={[
          styles.placeholder,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary + '15' },
          style,
        ]}
      >
        <Ionicons name="person" size={size * 0.5} color={colors.primary} />
      </View>
    );
  }

  const imageStyle = [
    {
      width: size,
      height: size,
      borderRadius: size / 2,
    },
    style,
  ];

  return (
    <View style={styles.container}>
      <Image
        key={imageKey} // Clé unique pour forcer le rechargement
        source={{ uri: imageUri }}
        style={imageStyle}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        {...imageProps}
      />
      {showIndicator && isLoading && (
        <View style={[styles.loadingOverlay, { width: size, height: size, borderRadius: size / 2 }]}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      )}
      {hasError && (
        <View
          style={[
            styles.placeholder,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary + '15' },
            style,
          ]}
        >
          <Ionicons name="alert-circle" size={size * 0.5} color={colors.error} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
