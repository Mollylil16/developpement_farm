/**
 * Hook React pour utiliser l'agent conversationnel
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { ProactiveRemindersService, VoiceService } from '../services/chatAgent';
import { GeminiConversationalAgent } from '../services/agent/GeminiConversationalAgent';
import { ChatMessage, AgentConfig, VoiceConfig, Reminder, AgentContext } from '../types/chatAgent';
import { format } from 'date-fns';
import apiClient from '../services/api/apiClient';
import { GEMINI_CONFIG } from '../config/geminiConfig';
import { createLoggerWithPrefix } from '../utils/logger';
import { getOrCreateConversationId, loadConversationHistory, clearConversationId } from '../services/chatAgent/core/ConversationStorage';
import { loadChargesFixes, loadDepensesPonctuelles, loadRevenus } from '../store/slices/financeSlice';
import { loadProductionAnimaux } from '../store/slices/productionSlice';

const logger = createLoggerWithPrefix('useChatAgent');

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

export function useChatAgent() {
  const dispatch = useAppDispatch();
  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isThinking, setIsThinking] = useState(false); // Nouvel état pour la phase de réflexion
  const [isInitialized, setIsInitialized] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Activé par défaut pour la reconnaissance vocale

  const agentServiceRef = useRef<GeminiConversationalAgent | null>(null);
  const remindersServiceRef = useRef<ProactiveRemindersService | null>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  // Plus besoin de repository, on utilise directement l'API

  /**
   * Initialise l'agent
   */
  useEffect(() => {
    if (!projetActif || !user) {
      return;
    }

    const initializeAgent = async () => {
      try {
        // Récupérer ou créer un conversationId persistant pour ce projet
        let conversationId: string | null = null;
        try {
          conversationId = await getOrCreateConversationId(projetActif.id);
          logger.debug('Conversation ID récupéré/créé:', conversationId);
        } catch (error) {
          logger.error('Erreur lors de la récupération/création du conversationId:', error);
          // Fallback: générer un ID local
          conversationId = `conv_${projetActif.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }
        conversationIdRef.current = conversationId;

        // Charger l'historique depuis le backend
        let savedMessages: ChatMessage[] = [];
        try {
          savedMessages = await loadConversationHistory(projetActif.id, conversationId, 100);
          logger.debug(`Historique chargé: ${savedMessages.length} messages`);
        } catch (error) {
          // Si l'erreur est 500 (Internal Server Error), c'est probablement que la table n'existe pas encore
          // Dans ce cas, on log en debug au lieu d'error pour ne pas alarmer l'utilisateur
          if ((error as any)?.status === 500) {
            logger.debug('Erreur 500 lors du chargement de l\'historique (table peut-être non créée) - continuation sans historique');
          } else {
            logger.error('Erreur lors du chargement de l\'historique:', error);
          }
          // Continuer sans historique en cas d'erreur
          savedMessages = [];
        }

        // Créer le contexte de l'agent
        const context: AgentContext = {
          projetId: projetActif.id,
          userId: user.id,
          userName: user.nom || user.email,
          currentDate: format(new Date(), 'yyyy-MM-dd'),
        };

        // Créer l'agent Gemini (le contexte est passé au constructeur)
        if (!GEMINI_CONFIG.apiKey) {
          throw new Error('Clé API Gemini non configurée');
        }
        const agentService = new GeminiConversationalAgent(GEMINI_CONFIG.apiKey, context);
        await agentService.initialize();
        const remindersService = new ProactiveRemindersService();
        // Configuration de la transcription vocale (optionnel)
        // Pour activer, utilisez getVoiceConfig() depuis src/config/voiceConfig.ts
        // Exemple d'utilisation :
        // import { getVoiceConfig } from '../config/voiceConfig';
        // const voiceConfig = await getVoiceConfig();
        const transcriptionApiKey = undefined; // Récupérer depuis AsyncStorage via getVoiceConfig()
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

        agentServiceRef.current = agentService;
        remindersServiceRef.current = remindersService;
        voiceServiceRef.current = voiceService;

        // Gérer l'historique (GeminiConversationalAgent gère son historique en interne)
        // Pour l'instant, on démarre avec un message de bienvenue
        if (savedMessages.length > 0) {
          // Si on a un historique sauvegardé, on l'affiche
          // Note: GeminiConversationalAgent gère son historique en interne, mais on ne peut pas le restaurer
          // L'historique sera reconstruit au fur et à mesure des messages
          setMessages(savedMessages);
        } else {
          // Générer les rappels proactifs
          const proactiveReminders = await remindersService.generateProactiveReminders();
          setReminders(proactiveReminders);

          // Message de bienvenue avec rappels
          const userPrenom = user.prenom || user.nom || 'éleveur';
          let welcomeMessage: ChatMessage;

          if (proactiveReminders.length > 0) {
            // Récupérer le message proactif et remplacer "Bonjour !" par le message personnalisé
            const proactiveMsg = remindersService.generateProactiveMessage(proactiveReminders);
            welcomeMessage = {
              id: 'welcome',
              role: 'assistant',
              content: `Bonjour ${userPrenom}, je suis Kouakou ton assistant pour la reussite de ton projet. ${proactiveMsg.replace(/^Bonjour !\s*/, '')}`,
              timestamp: new Date().toISOString(),
            };
          } else {
            welcomeMessage = {
              id: 'welcome',
              role: 'assistant',
              content: `Bonjour ${userPrenom}, je suis Kouakou ton assistant pour la reussite de ton projet. Dis moi en quoi je peux t'aider aujourd'hui ?`,
              timestamp: new Date().toISOString(),
            };
          }

          setMessages([welcomeMessage]);
          // Les endpoints de messages ne sont pas encore implémentés dans le backend
          // Les messages sont gérés localement pour l'instant
        }

        setIsInitialized(true);
      } catch (error) {
        // Si l'erreur est 500 et concerne l'historique, c'est probablement que la table n'existe pas encore
        // Dans ce cas, on log en debug au lieu d'error pour ne pas alarmer l'utilisateur
        const errorMessage = error instanceof Error ? error.message : String(error);
        if ((error as any)?.status === 500 && errorMessage.includes('Internal server error')) {
          logger.debug("Erreur 500 lors de l'initialisation de l'agent (probablement table non créée) - continuation en mode dégradé");
        } else {
          logger.error("Erreur lors de l'initialisation de l'agent:", error);
        }
        // Même en cas d'erreur, permettre à l'agent de fonctionner avec des capacités limitées
        // L'erreur peut venir de l'API mais l'agent local peut quand même fonctionner
        if (agentServiceRef.current) {
          setIsInitialized(true);
          logger.warn('Agent initialisé en mode dégradé');
        }
      }
    };

    initializeAgent();
  }, [projetActif?.id, user?.id, voiceEnabled]);

  /**
   * Envoie un message à l'agent avec délai de réflexion
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!agentServiceRef.current || isLoading || isThinking) {
        return;
      }

      // Créer et ajouter le message de l'utilisateur immédiatement
      const userMessage: ChatMessage = {
        id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'user',
        content: content,
        timestamp: new Date().toISOString(),
      };

      // Ajouter le message utilisateur à l'état immédiatement
      setMessages((prev) => [...prev, userMessage]);

      // Phase 1: Kouakou "réfléchit" (délai variable selon complexité)
      const thinkingTime = calculateThinkingTime(content);
      logger.debug(`[useChatAgent] Temps de réflexion calculé: ${thinkingTime}ms pour "${content.substring(0, 50)}..."`);
      
      setIsThinking(true);
      
      // Attendre le délai de réflexion
      await new Promise(resolve => setTimeout(resolve, thinkingTime));
      
      // Phase 2: Kouakou répond (appel API)
      setIsThinking(false);
      setIsLoading(true);

      try {
        // GeminiConversationalAgent.sendMessage retourne une string (pas ChatMessage)
        const responseText = await agentServiceRef.current.sendMessage(content);

        // Convertir la réponse en ChatMessage
        const response: ChatMessage = {
          id: `assistant_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          role: 'assistant',
          content: responseText,
          timestamp: new Date().toISOString(),
        };

        // Rafraîchir les données (on détecte les actions via mots-clés dans la réponse)
        // Note: Avec Gemini, on ne peut pas détecter directement l'action exécutée
        // On pourrait améliorer cela plus tard si nécessaire
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

        setMessages((prev) => [...prev, response]);

        // Si la voix est activée, lire la réponse
        if (voiceServiceRef.current && voiceEnabled) {
          await voiceServiceRef.current.speak(response.content);
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
    [isLoading, isThinking, voiceEnabled]
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
    if (agentServiceRef.current) {
      agentServiceRef.current.clearHistory();
      setMessages([]);
    }

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
