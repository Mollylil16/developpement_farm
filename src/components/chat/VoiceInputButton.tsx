/**
 * Composant bouton pour la saisie vocale
 * Avec animation et feedback tactile
 */

import React, { useState, useRef, useEffect } from 'react';
import { TouchableOpacity, View, Text, StyleSheet, Animated } from 'react-native';
import { VoiceServiceV2 } from '../../services/chatAgent/VoiceServiceV2';
import * as Haptics from 'expo-haptics';
import { COLORS } from '../../constants/theme';
import { logger } from '../../utils/logger';

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
        service.stopListening().catch((error: Error) => logger.error('[VoiceInputButton] Stop error:', error));
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
        onResult: (text: string) => {
          setIsListening(false);
          stopPulseAnimation();
          if (text && text.trim()) {
            onTranscription(text.trim());
          }
        },
        onError: (message: string) => {
          setIsListening(false);
          stopPulseAnimation();
          logger.warn('[VoiceInputButton] Error:', message);
          if (onError) {
            onError(message);
          } else {
            // Optionnel: afficher un toast ou Alert ici
            logger.error(message);
          }
        },
        onStart: () => {
          logger.debug('[VoiceInputButton] Listening started');
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
      logger.error('[VoiceInputButton] Start error:', errorMessage);
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
        logger.error('[VoiceInputButton] Stop error:', error);
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
        {isListening && <View style={styles.recordingIndicator} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  containerDisabled: {
    opacity: 0.5,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    position: 'relative',
  },
  icon: {
    fontSize: 20,
  },
  recordingIndicator: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
  },
});

