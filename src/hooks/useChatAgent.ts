/**
 * Hook React pour utiliser l'agent conversationnel Kouakou
 * 
 * Ce hook communique UNIQUEMENT avec le backend - aucun appel direct à Gemini.
 * Toute l'intelligence IA est gérée côté serveur.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { ProactiveRemindersService, VoiceService } from '../services/chatAgent';
import { ChatMessage, Reminder } from '../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../services/api/apiClient';
import { createLoggerWithPrefix } from '../utils/logger';
import {
  getOrCreateConversationId,
  loadConversationHistory,
  clearConversationId,
} from '../services/chatAgent/core/ConversationStorage';
import {
  loadChargesFixes,
  loadDepensesPonctuelles,
  loadRevenus,
} from '../store/slices/financeSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';

const logger = createLoggerWithPrefix('useChatAgent');

/**
 * Format de l'historique de conversation pour le backend
 */
type ConversationHistoryEntry = {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
};

/**
 * Réponse du backend Kouakou
 */
interface KouakouBackendResponse {
  response: string;
  metadata?: {
    model?: string;
    executedActions?: Array<{
      name: string;
      args: Record<string, unknown>;
      success: boolean;
      message: string;
      data?: unknown;
    }>;
  };
}

/**
 * Calcule le temps de réflexion (en ms) basé sur la complexité du message
 * @param message - Le message de l'utilisateur
 * @returns Délai en millisecondes (1000-3000ms)
 */
function calculateThinkingTime(message: string): number {
  const normalizedMessage = message.toLowerCase().trim();
  const wordCount = normalizedMessage.split(/\s+/).length;
  
  // Base: 1 seconde minimum
  let thinkingTime = 1000;
  
  // Questions de formation/éducatives = plus de réflexion (jusqu'à 3s)
  const educativePatterns = [
    /comment|pourquoi|qu'?est[- ]ce que|c'?est quoi|explique|conseils?/i,
    /difference|avantage|inconvenient|meilleur/i,
    /race|alimentation|vaccination|maladie|rentabilite/i,
  ];
  
  const isEducativeQuestion = educativePatterns.some(p => p.test(normalizedMessage));
  if (isEducativeQuestion) {
    thinkingTime += 1500; // +1.5s pour questions éducatives
  }
  
  // Longueur du message = plus de réflexion
  if (wordCount > 10) {
    thinkingTime += 500; // +0.5s pour messages longs
  }
  
  // Questions avec chiffres/calculs = plus de réflexion
  if (/\d+/.test(normalizedMessage)) {
    thinkingTime += 300; // +0.3s pour les calculs
  }
  
  // Questions d'analyse = plus de réflexion
  if (/analyse|diagnostic|situation|performance|evolution/i.test(normalizedMessage)) {
    thinkingTime += 800; // +0.8s pour les analyses
  }
  
  // Limiter entre 1s et 3s
  return Math.min(Math.max(thinkingTime, 1000), 3000);
}

function convertMessagesToHistory(messages: ChatMessage[]): ConversationHistoryEntry[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role === 'user' ? 'user' : 'model',
      parts: [{ text: message.content }],
    }));
}

export function useChatAgent() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false); // Nouvel état pour la phase de réflexion
  const [isInitialized, setIsInitialized] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false); // Désactivé par défaut - l'utilisateur peut l'activer manuellement

  const remindersServiceRef = useRef<ProactiveRemindersService | null>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const conversationHistoryRef = useRef<ConversationHistoryEntry[]>([]);

  const pushHistory = useCallback((role: 'user' | 'model', text: string) => {
    if (!text) {
      return;
    }
    conversationHistoryRef.current = [
      ...conversationHistoryRef.current,
      {
        role,
        parts: [{ text }],
      },
    ];
  }, []);

  /**
   * Initialise l'agent
   */
  useEffect(() => {
    if (!projetActif || !user) {
      return;
    }

    let isCancelled = false;
    setIsInitialized(false);

    const initializeAgent = async () => {
      try {
        let conversationId: string | null = conversationIdRef.current;
        if (!conversationId) {
          try {
            conversationId = await getOrCreateConversationId(projetActif.id);
            logger.debug('Conversation ID récupéré/créé:', conversationId);
          } catch (error) {
            logger.error('Erreur lors de la récupération/création du conversationId:', error);
            conversationId = `conv_${projetActif.id}_${Date.now()}_${Math.random()
              .toString(36)
              .substr(2, 9)}`;
          }
        }
        conversationIdRef.current = conversationId;

        let savedMessages: ChatMessage[] = [];
        try {
          savedMessages = await loadConversationHistory(projetActif.id, conversationId, 100);
          logger.debug(`Historique chargé: ${savedMessages.length} messages`);
        } catch (error) {
          if ((error as any)?.status === 500) {
            logger.debug(
              "Erreur 500 lors du chargement de l'historique (table peut-être non créée) - continuation sans historique",
            );
          } else {
            logger.error('Erreur lors du chargement de l\'historique:', error);
          }
          savedMessages = [];
        }

        if (isCancelled) {
          return;
        }

        conversationHistoryRef.current = convertMessagesToHistory(savedMessages);

        const remindersService = new ProactiveRemindersService();
        const transcriptionApiKey = undefined;
        const transcriptionProvider: 'assemblyai' | 'google' | 'openai' | 'none' =
          transcriptionApiKey ? 'assemblyai' : 'none';

        const voiceService = new VoiceService({
          language: 'fr-CI',
          enableSpeechToText: voiceEnabled,
          enableTextToSpeech: voiceEnabled,
          transcriptionProvider,
          transcriptionApiKey,
        });

        await remindersService.initialize({
          projetId: projetActif.id,
          userId: user.id,
          userName: user.nom || user.email,
          currentDate: format(new Date(), 'yyyy-MM-dd'),
        });

        if (isCancelled) {
          return;
        }

        remindersServiceRef.current = remindersService;
        voiceServiceRef.current = voiceService;

        if (savedMessages.length > 0) {
          if (!isCancelled) {
            setMessages(savedMessages);
          }
        } else {
          const proactiveReminders = await remindersService.generateProactiveReminders();
          if (!isCancelled) {
            setReminders(proactiveReminders);
          }

          const userPrenom = user.prenom || user.nom || 'éleveur';
          const welcomeContent =
            proactiveReminders.length > 0
              ? (() => {
                  const proactiveMsg = remindersService.generateProactiveMessage(proactiveReminders);
                  return `Bonjour ${userPrenom}, je suis Kouakou ton assistant pour la reussite de ton projet. ${proactiveMsg.replace(
                    /^Bonjour !\s*/,
                    '',
                  )}`;
                })()
              : `Bonjour ${userPrenom}, je suis Kouakou ton assistant pour la reussite de ton projet. Dis moi en quoi je peux t'aider aujourd'hui ?`;

          const welcomeMessage: ChatMessage = {
            id: 'welcome',
            role: 'assistant',
            content: welcomeContent,
            timestamp: new Date().toISOString(),
          };

          if (!isCancelled) {
            setMessages([welcomeMessage]);
          }
        }

        if (!isCancelled) {
          setIsInitialized(true);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if ((error as any)?.status === 500 && errorMessage.includes('Internal server error')) {
          logger.debug(
            "Erreur 500 lors de l'initialisation de l'agent (probablement table non créée) - continuation en mode dégradé",
          );
        } else {
          logger.error("Erreur lors de l'initialisation de l'agent:", error);
        }

        if (!isCancelled) {
          setIsInitialized(true);
        }
      }
    };

    initializeAgent();

    return () => {
      isCancelled = true;
    };
  }, [projetActif?.id, user?.id, voiceEnabled]);

  /**
   * Envoie un message à l'agent avec délai de réflexion
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!projetActif?.id || isLoading || isThinking) {
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return;
      }

      // Créer et ajouter le message de l'utilisateur immédiatement
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: trimmedContent,
        timestamp: new Date().toISOString(),
      };

      // Ajouter le message utilisateur à l'état immédiatement
      setMessages((prev) => [...prev, userMessage]);

      // Phase 1: Kouakou "réfléchit" (délai variable selon complexité)
      const thinkingTime = calculateThinkingTime(trimmedContent);
      logger.debug(`[useChatAgent] Temps de réflexion calculé: ${thinkingTime}ms pour "${content.substring(0, 50)}..."`);
      
      setIsThinking(true);
      
      // Attendre le délai de réflexion
      await new Promise(resolve => setTimeout(resolve, thinkingTime));
      
      // Phase 2: Kouakou répond (appel API)
      setIsThinking(false);
      setIsLoading(true);

      try {
        pushHistory('user', trimmedContent);

        // Appel au backend Kouakou - toute l'IA est gérée côté serveur
        const backendResponse = await apiClient.post<KouakouBackendResponse>('/kouakou/chat', {
          message: trimmedContent,
          projectId: projetActif.id,
          conversationId: conversationIdRef.current,
          history: conversationHistoryRef.current,
        });
        const responseText = backendResponse?.response;
        if (!responseText) {
          throw new Error('Réponse vide de Kouakou');
        }
        pushHistory('model', responseText);

        // Convertir la réponse en ChatMessage
        const assistantMessage: ChatMessage = {
          id: `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString(),
        };

        // Rafraîchir les données si une action a été exécutée
        // Le backend retourne les actions exécutées dans metadata.executedActions
        // Fallback: détection via mots-clés dans la réponse
        try {
          const projetId = projetActif?.id;
          if (projetId && /(enregistré|créé|ajouté).*(vente|dépense|pesée|revenu)/i.test(responseText)) {
            // Rafraîchir toutes les données pour être sûr
            dispatch(loadDepensesPonctuelles(projetId));
            dispatch(loadRevenus(projetId));
            dispatch(loadChargesFixes(projetId));
            dispatch(loadProductionAnimaux({ projetId, inclureInactifs: true }));
          }
        } catch {
          // Ne pas bloquer l'UI si le refresh échoue
        }

        setMessages((prev) => [...prev, assistantMessage]);

        // Si la voix est activée, lire la réponse
        if (voiceServiceRef.current && voiceEnabled) {
          await voiceServiceRef.current.speak(assistantMessage.content);
        }
      } catch (error) {
        logger.error("Erreur lors de l'envoi du message:", error);
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: "Désolé, j'ai rencontré une erreur. Peux-tu réessayer ?",
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, isLoading, isThinking, projetActif?.id, pushHistory, voiceEnabled]
  );

  /**
   * Active/désactive la voix
   */
  const toggleVoice = useCallback(async () => {
    const newVoiceEnabled = !voiceEnabled;
    setVoiceEnabled(newVoiceEnabled);

    if (voiceServiceRef.current) {
      if (newVoiceEnabled) {
        const hasPermission = await voiceServiceRef.current.requestPermissions();
        if (!hasPermission) {
          setVoiceEnabled(false);
        }
      }
    }
  }, [voiceEnabled]);

  /**
   * Réinitialise la conversation
   */
  const clearConversation = useCallback(async () => {
    conversationHistoryRef.current = [];
    setMessages([]);

    // Supprimer le conversationId pour créer une nouvelle conversation au prochain démarrage
    if (projetActif?.id && conversationIdRef.current) {
      try {
        await clearConversationId(projetActif.id);
        conversationIdRef.current = null;
        logger.debug('Conversation ID supprimé, nouvelle conversation sera créée au prochain démarrage');
      } catch (error) {
        logger.error('Erreur lors de la suppression du conversationId:', error);
      }
    }
  }, [projetActif?.id]);

  /**
   * Récupère les rappels
   */
  const refreshReminders = useCallback(async () => {
    if (!remindersServiceRef.current) {
      return;
    }

    const newReminders = await remindersServiceRef.current.generateProactiveReminders();
    setReminders(newReminders);
  }, []);

  return {
    messages,
    isLoading,
    isThinking, // Nouveau: Kouakou est en train de réfléchir
    isInitialized,
    reminders,
    voiceEnabled,
    sendMessage,
    toggleVoice,
    clearConversation,
    refreshReminders,
    voiceService: voiceServiceRef.current,
  };
}
