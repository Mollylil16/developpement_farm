/**
 * Composant Image optimisé avec lazy loading et placeholder
 * Utilise expo-image pour de meilleures performances
 */

import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image, ImageSource } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';

interface OptimizedImageProps {
  source: ImageSource | string | { uri: string };
  style?: any;
  resizeMode?: 'contain' | 'cover' | 'stretch' | 'center';
  placeholder?: React.ReactNode;
  showLoadingIndicator?: boolean;
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scaleDown';
  transition?: number;
  cachePolicy?: 'none' | 'disk' | 'memory' | 'memory-disk';
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Composant Image optimisé avec:
 * - Lazy loading automatique
 * - Placeholder pendant le chargement
 * - Cache optimisé
 * - Transitions fluides
 */
export default function OptimizedImage({
  source,
  style,
  resizeMode = 'cover',
  placeholder,
  showLoadingIndicator = true,
  contentFit,
  transition = 300,
  cachePolicy = 'memory-disk',
  priority = 'normal',
}: OptimizedImageProps) {
  const { colors } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Convertir source string en objet ImageSource si nécessaire
  const imageSource = typeof source === 'string' ? { uri: source } : source;

  // Placeholder par défaut
  const defaultPlaceholder = (
    <View style={[style, styles.placeholder, { backgroundColor: colors.background }]}>
      {showLoadingIndicator && (
        <ActivityIndicator size="small" color={colors.primary} />
      )}
    </View>
  );

  if (hasError) {
    return placeholder || defaultPlaceholder;
  }

  return (
    <View style={style}>
      {isLoading && (placeholder || defaultPlaceholder)}
      <Image
        source={imageSource}
        style={[style, isLoading && styles.hidden]}
        contentFit={contentFit || resizeMode}
        transition={transition}
        cachePolicy={cachePolicy}
        priority={priority}
        onLoadStart={() => {
          setIsLoading(true);
          setHasError(false);
        }}
        onLoad={() => {
          setIsLoading(false);
        }}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        // Lazy loading: ne charger que quand visible (par défaut avec expo-image)
        recyclingKey={typeof imageSource === 'object' && 'uri' in imageSource ? imageSource.uri : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  hidden: {
    opacity: 0,
  },
});

