/**
 * Hook React pour utiliser l'agent conversationnel
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAppSelector } from '../store/hooks';
import { ChatAgentService, ProactiveRemindersService, VoiceService } from '../services/chatAgent';
import { ChatMessage, AgentConfig, VoiceConfig, Reminder } from '../types/chatAgent';
import { format } from 'date-fns';
import { getDatabase } from '../services/database';
import { ChatAgentRepository } from '../database/repositories';

export function useChatAgent() {
  const { projetActif } = useAppSelector((state) => state.projet);
  const { user } = useAppSelector((state) => state.auth);
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true); // Activé par défaut pour la reconnaissance vocale

  const agentServiceRef = useRef<ChatAgentService | null>(null);
  const remindersServiceRef = useRef<ProactiveRemindersService | null>(null);
  const voiceServiceRef = useRef<VoiceService | null>(null);
  const conversationIdRef = useRef<string | null>(null);
  const chatAgentRepoRef = useRef<ChatAgentRepository | null>(null);

  /**
   * Initialise l'agent
   */
  useEffect(() => {
    if (!projetActif || !user) {
      return;
    }

    const initializeAgent = async () => {
      try {
        // Initialiser le repository
        const db = await getDatabase();
        const chatAgentRepo = new ChatAgentRepository(db);
        chatAgentRepoRef.current = chatAgentRepo;

        // Trouver ou créer une conversation
        const conversation = await chatAgentRepo.findOrCreateConversation(
          projetActif.id,
          user.id
        );
        conversationIdRef.current = conversation.id;

        // Charger l'historique existant
        const savedMessages = await chatAgentRepo.loadMessages(conversation.id);
        
        // Configuration de l'agent
        const config: AgentConfig = {
          language: 'fr-CI',
          enableVoice: voiceEnabled,
          enableProactiveAlerts: true,
        };

        // Créer les services
        const agentService = new ChatAgentService(config);
        const remindersService = new ProactiveRemindersService();
        // Configuration de la transcription vocale (optionnel)
        // Pour activer, utilisez getVoiceConfig() depuis src/config/voiceConfig.ts
        // Exemple d'utilisation :
        // import { getVoiceConfig } from '../config/voiceConfig';
        // const voiceConfig = await getVoiceConfig();
        const transcriptionApiKey = undefined; // Récupérer depuis AsyncStorage via getVoiceConfig()
        const transcriptionProvider: 'assemblyai' | 'google' | 'openai' | 'none' = transcriptionApiKey ? 'assemblyai' : 'none';
        
        const voiceService = new VoiceService({
          language: 'fr-CI',
          enableSpeechToText: voiceEnabled,
          enableTextToSpeech: voiceEnabled,
          transcriptionProvider,
          transcriptionApiKey,
        });

        // Initialiser le contexte
        await agentService.initializeContext({
          projetId: projetActif.id,
          userId: user.id,
          userName: user.nom || user.email,
          currentDate: format(new Date(), 'yyyy-MM-dd'),
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

        // Restaurer l'historique dans le service
        if (savedMessages.length > 0) {
          // Exclure le message de bienvenue s'il existe
          const messagesWithoutWelcome = savedMessages.filter(msg => msg.id !== 'welcome');
          agentService.restoreHistory(messagesWithoutWelcome);
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
          // Sauvegarder le message de bienvenue
          if (conversationIdRef.current) {
            await chatAgentRepo.saveMessage(conversationIdRef.current, welcomeMessage);
          }
        }

        setIsInitialized(true);
      } catch (error) {
        console.error('Erreur lors de l\'initialisation de l\'agent:', error);
      }
    };

    initializeAgent();
  }, [projetActif?.id, user?.id, voiceEnabled]);

  /**
   * Envoie un message à l'agent
   */
  const sendMessage = useCallback(async (content: string) => {
    if (!agentServiceRef.current || isLoading) {
      return;
    }

    setIsLoading(true);

    // Créer et ajouter le message de l'utilisateur immédiatement
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: content,
      timestamp: new Date().toISOString(),
    };
    
    // Ajouter le message utilisateur à l'état immédiatement
    setMessages((prev) => [...prev, userMessage]);

    // Sauvegarder le message utilisateur
    if (conversationIdRef.current && chatAgentRepoRef.current) {
      try {
        await chatAgentRepoRef.current.saveMessage(conversationIdRef.current, userMessage);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde du message utilisateur:', error);
      }
    }

    try {
      const response = await agentServiceRef.current.sendMessage(content);
      setMessages((prev) => [...prev, response]);

      // Sauvegarder la réponse de l'assistant
      if (conversationIdRef.current && chatAgentRepoRef.current) {
        try {
          await chatAgentRepoRef.current.saveMessage(conversationIdRef.current, response);
        } catch (error) {
          console.error('Erreur lors de la sauvegarde de la réponse:', error);
        }
      }

      // Si la voix est activée, lire la réponse
      if (voiceServiceRef.current && voiceEnabled) {
        await voiceServiceRef.current.speak(response.content);
      }
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      const errorMessage: ChatMessage = {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: 'Désolé, j\'ai rencontré une erreur. Peux-tu réessayer ?',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, voiceEnabled]);

  /**
   * Confirme une action
   */
  const confirmAction = useCallback(async (actionId: string, confirmed: boolean) => {
    if (!agentServiceRef.current) {
      return;
    }

    const response = await agentServiceRef.current.confirmAction(actionId, confirmed);
    setMessages((prev) => [...prev, response]);
  }, []);

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
    
    // Supprimer tous les messages de la base de données
    if (conversationIdRef.current && chatAgentRepoRef.current) {
      try {
        await chatAgentRepoRef.current.clearConversation(conversationIdRef.current);
      } catch (error) {
        console.error('Erreur lors de la suppression de la conversation:', error);
      }
    }
  }, []);

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
    isInitialized,
    reminders,
    voiceEnabled,
    sendMessage,
    confirmAction,
    toggleVoice,
    clearConversation,
    refreshReminders,
    voiceService: voiceServiceRef.current,
  };
}

