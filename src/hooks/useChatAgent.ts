/**
 * Hook React pour utiliser l'agent conversationnel Kouakou
 * 
 * V5.0 - Utilise ChatAgentService local pour la détection d'intention et l'exécution
 * Le backend n'est plus utilisé pour la logique IA - uniquement pour la persistance
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { ProactiveRemindersService, VoiceService, ChatAgentService } from '../services/chatAgent';
import { ChatMessage, Reminder, AgentContext } from '../types/chatAgent';
import { format } from 'date-fns';
import { APIError } from '../services/api/apiClient';
import { createLoggerWithPrefix } from '../utils/logger';
import {
  invalidateProjetCache,
} from '../services/chatAgent/kouakouCache';
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

/**
 * Limite l'historique de conversation pour optimiser les requêtes
 * Garde les 50 derniers messages au maximum
 */
function limitHistory(history: ConversationHistoryEntry[]): ConversationHistoryEntry[] {
  const MAX_HISTORY_LENGTH = 50;
  if (history.length <= MAX_HISTORY_LENGTH) {
    return history;
  }
  // Garder les N derniers messages
  return history.slice(-MAX_HISTORY_LENGTH);
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
  const chatAgentServiceRef = useRef<ChatAgentService | null>(null);

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

        // Vérifier la disponibilité de la voix
        const isTTSAvailable = await voiceService.isTextToSpeechAvailable();
        const isSTTAvailable = await voiceService.isSpeechToTextAvailable();
        
        if (voiceEnabled && !isTTSAvailable && !isSTTAvailable) {
          logger.warn('[useChatAgent] La voix est activée mais n\'est pas disponible sur cet appareil');
          // Désactiver automatiquement si non disponible
          if (!isCancelled) {
            setVoiceEnabled(false);
          }
        }

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

        // Initialiser ChatAgentService pour la détection d'intention et l'exécution
        const agentContext: AgentContext = {
          projetId: projetActif.id,
          userId: user.id,
          userName: user.prenom || user.nom || user.email,
          currentDate: format(new Date(), 'yyyy-MM-dd'),
        };
        
        const chatAgentService = new ChatAgentService({
          model: 'local',
          temperature: 0.7,
          maxTokens: 1000,
          language: 'fr-CI',
          enableVoice: voiceEnabled,
          enableProactiveAlerts: true,
        });
        await chatAgentService.initializeContext(agentContext, conversationId || undefined);
        
        // Charger les messages existants dans le ChatAgentService
        if (savedMessages.length > 0) {
          chatAgentService.loadHistory(savedMessages);
        }
        
        chatAgentServiceRef.current = chatAgentService;

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

      // Phase 1: Kouakou "réfléchit" (délai minimal pour UX)
      // Utiliser un temps de réflexion minimal si le backend répond rapidement
      const thinkingTime = Math.min(calculateThinkingTime(trimmedContent), 800); // Maximum 800ms pour éviter les délais trop longs
      logger.debug(`[useChatAgent] Temps de réflexion calculé: ${thinkingTime}ms pour "${content.substring(0, 50)}..."`);
      
      setIsThinking(true);
      
      // Attendre le délai de réflexion minimal
      await new Promise(resolve => setTimeout(resolve, thinkingTime));
      
      // Phase 2: Kouakou répond (appel API)
      setIsThinking(false);
      setIsLoading(true);

      try {
        pushHistory('user', trimmedContent);

        // Utiliser ChatAgentService pour la détection d'intention et l'exécution
        if (!chatAgentServiceRef.current) {
          throw new Error('ChatAgentService non initialisé');
        }

        const assistantMessage = await chatAgentServiceRef.current.sendMessage(trimmedContent);
        
        pushHistory('model', assistantMessage.content);

        // Rafraîchir les données si une action a été exécutée avec refreshHint
        const refreshHint = assistantMessage.metadata?.refreshHint;
        const projetId = projetActif?.id;
        
        if (refreshHint && projetId) {
          try {
            if (refreshHint === 'finance' || refreshHint === 'all') {
              dispatch(loadDepensesPonctuelles(projetId));
              dispatch(loadRevenus(projetId));
              dispatch(loadChargesFixes(projetId));
            }
            if (refreshHint === 'production' || refreshHint === 'all') {
              dispatch(loadProductionAnimaux({ projetId, inclureInactifs: true }));
            }
            // Invalider le cache après des actions pour éviter des réponses obsolètes
            invalidateProjetCache(projetId).catch((error) => {
              logger.warn('Erreur lors de l\'invalidation du cache:', error);
            });
          } catch (refreshError) {
            // Ne pas bloquer l'UI si le refresh échoue
            logger.warn('Erreur lors du rafraîchissement des données:', refreshError);
          }
        }

        setMessages((prev) => [...prev, assistantMessage]);

        // Si la voix est activée, lire la réponse (avec vérification de disponibilité)
        if (voiceServiceRef.current && voiceEnabled) {
          try {
            const isAvailable = await voiceServiceRef.current.isTextToSpeechAvailable();
            if (isAvailable) {
              await voiceServiceRef.current.speak(assistantMessage.content);
            } else {
              logger.debug('[useChatAgent] Text-to-Speech non disponible, réponse non lue');
            }
          } catch (voiceError) {
            logger.warn('[useChatAgent] Erreur lors de la lecture vocale:', voiceError);
            // Ne pas bloquer l'UI si la voix échoue
          }
        }
      } catch (error) {
        logger.error("Erreur lors de l'envoi du message:", error);
        
        // Messages d'erreur spécifiques selon le type d'erreur
        let errorContent = "Désolé, j'ai rencontré une erreur. Peux-tu réessayer ?";
        
        if (error instanceof APIError) {
          switch (error.status) {
            case 0:
              errorContent = "Problème de connexion. Vérifiez votre connexion Internet et réessayez.";
              break;
            case 408:
              errorContent = "La requête a pris trop de temps. Réessayez dans quelques instants.";
              break;
            case 429:
              errorContent = "Trop de requêtes. Patientez quelques secondes avant de réessayer.";
              break;
            case 500:
            case 502:
            case 503:
              errorContent = "Le serveur rencontre des difficultés. Réessayez dans quelques instants.";
              break;
            case 400:
              errorContent = "Erreur dans votre demande. Pouvez-vous reformuler votre question ?";
              break;
            case 401:
            case 403:
              errorContent = "Problème d'authentification. Veuillez vous reconnecter.";
              break;
            default:
              errorContent = `Erreur serveur (${error.status}). Réessayez plus tard.`;
          }
        } else if (error instanceof Error) {
          // Vérifier si c'est une erreur de timeout
          if (error.message.includes('timeout') || error.message.includes('Timeout')) {
            errorContent = "La requête a pris trop de temps. Réessayez dans quelques instants.";
          } else if (error.message.includes('Network request failed') || error.message.includes('fetch')) {
            errorContent = "Problème de connexion. Vérifiez votre connexion Internet et réessayez.";
          }
        }
        
        const errorMessage: ChatMessage = {
          id: `error_${Date.now()}`,
          role: 'assistant',
          content: errorContent,
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
   * Active/désactive la voix avec vérification de disponibilité
   */
  const toggleVoice = useCallback(async () => {
    const newVoiceEnabled = !voiceEnabled;

    if (voiceServiceRef.current) {
      if (newVoiceEnabled) {
        // Vérifier d'abord la disponibilité
        const isTTSAvailable = await voiceServiceRef.current.isTextToSpeechAvailable();
        const isSTTAvailable = await voiceServiceRef.current.isSpeechToTextAvailable();

        if (!isTTSAvailable && !isSTTAvailable) {
          logger.warn('[useChatAgent] La voix n\'est pas disponible sur cet appareil');
          // Ne pas activer si aucune fonctionnalité vocale n'est disponible
          return;
        }

        // Demander les permissions si nécessaire
        const hasPermission = await voiceServiceRef.current.requestPermissions();
        if (!hasPermission) {
          logger.warn('[useChatAgent] Permissions vocales refusées');
          return;
        }

        setVoiceEnabled(true);
      } else {
        setVoiceEnabled(false);
      }
    } else {
      // Si le service n'est pas encore initialisé, juste changer l'état
      setVoiceEnabled(newVoiceEnabled);
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
