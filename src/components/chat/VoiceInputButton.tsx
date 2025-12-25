/**
 * Composant bouton pour la saisie vocale
 * Avec animation et feedback tactile
 */

import React, { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { VoiceServiceV2 } from '../../services/chatAgent/VoiceServiceV2';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/theme';

interface VoiceInputButtonProps {
  onTranscription: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  voiceService?: VoiceServiceV2;
}

export const VoiceInputButton: React.FC<VoiceInputButtonProps> = ({
  onTranscription,
  onError,
  disabled = false,
  voiceService,
}) => {
  const [isListening, setIsListening] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef<Animated.CompositeAnimation | null>(null);
  const service = voiceService || require('../../services/chatAgent/VoiceServiceV2').voiceServiceV2;

  // Nettoyer l'animation au démontage
  useEffect(() => {
    return () => {
      pulseAnim.current?.stop();
      if (isListening) {
        service.stopListening().catch(console.error);
      }
    };
  }, [isListening, service]);

  const startPulseAnimation = () => {
    pulseAnim.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.3,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnim.current.start();
  };

  const stopPulseAnimation = () => {
    pulseAnim.current?.stop();
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handlePressIn = async () => {
    if (disabled) return;

    Haptics.selectionAsync();
    setIsListening(true);
    startPulseAnimation();

    try {
      await service.startListening({
        onResult: (text) => {
          setIsListening(false);
          stopPulseAnimation();
          if (text && text.trim()) {
            onTranscription(text.trim());
          }
        },
        onError: (message) => {
          setIsListening(false);
          stopPulseAnimation();
          console.warn('[VoiceInputButton] Error:', message);
          if (onError) {
            onError(message);
          } else {
            // Optionnel: afficher un toast ou Alert ici
            console.error(message);
          }
        },
        onStart: () => {
          console.log('[VoiceInputButton] Listening started');
        },
        onEnd: () => {
          setIsListening(false);
          stopPulseAnimation();
        },
      });
    } catch (error) {
      setIsListening(false);
      stopPulseAnimation();
      const errorMessage =
        error instanceof Error ? error.message : 'Impossible de démarrer la reconnaissance vocale';
      console.error('[VoiceInputButton] Start error:', errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    }
  };

  const handlePressOut = async () => {
    if (isListening) {
      try {
        await service.stopListening();
        // L'état sera mis à jour via le callback onEnd
      } catch (error) {
        console.error('[VoiceInputButton] Stop error:', error);
        setIsListening(false);
        stopPulseAnimation();
      }
    }
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={0.8}
      style={[styles.container, disabled && styles.containerDisabled]}
    >
      <Animated.View style={[styles.button, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.icon}>{isListening ? '🎙️' : '🎤'}</Text>
        <Text style={[styles.label, isListening && styles.labelListening]}>
          {isListening ? 'À l\'écoute...' : 'Parler'}
        </Text>
        {isListening && <View style={styles.recordingIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  containerDisabled: {
    opacity: 0.5,
  },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    minWidth: 70,
    position: 'relative',
  },
  icon: {
    fontSize: 28,
  },
  label: {
    fontSize: 11,
    marginTop: 4,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  labelListening: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  recordingIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
});

