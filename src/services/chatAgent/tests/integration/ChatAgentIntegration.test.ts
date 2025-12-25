/**
 * Tests d'intégration pour ChatAgentService
 * Teste des scénarios réels end-to-end
 */

import { ChatAgentService } from '../../ChatAgentService';
import { AgentContext, AgentConfig } from '../../../../types/chatAgent';

// Mock des dépendances externes si nécessaire
jest.mock('../../ChatAgentAPI');
jest.mock('../../../../services/api/apiClient');

describe('ChatAgentService - Tests d\'intégration', () => {
  let chatAgent: ChatAgentService;
  let mockContext: AgentContext;

  beforeEach(() => {
    const config: AgentConfig = {
      apiKey: 'test-key',
      model: 'gpt-4o-mini',
      temperature: 0.7,
    };

    chatAgent = new ChatAgentService(config);

    mockContext = {
      projetId: 'test-projet-123',
      userId: 'test-user-123',
      currentDate: new Date().toISOString().split('T')[0],
    };

    // Note: Dans un vrai test, il faudrait initialiser le contexte
    // chatAgent.initializeContext(mockContext);
  });

  describe('Fast Path Detection', () => {
    test('devrait détecter rapidement "J\'ai claqué 150k en bouffe hier"', async () => {
      // TODO: Implémenter avec mock approprié
      // const result = await chatAgent.sendMessage("J'ai claqué 150k en bouffe hier");
      // expect(result.content).toContain('enregistré');
      // expect(result.metadata?.detectedAction).toBe('create_depense');
    });

    test('devrait détecter rapidement "Vendu 5 porcs à 800000"', async () => {
      // TODO: Implémenter avec mock approprié
      // const result = await chatAgent.sendMessage("Vendu 5 porcs à 800000");
      // expect(result.content).toContain('vente');
      // expect(result.metadata?.detectedAction).toBe('create_revenu');
    });

    test('devrait détecter rapidement "Vaccin porcelets demain"', async () => {
      // TODO: Implémenter avec mock approprié
      // const result = await chatAgent.sendMessage("Vaccin porcelets demain");
      // expect(result.content).toContain('vaccination');
      // expect(result.metadata?.detectedAction).toBe('create_vaccination');
    });
  });

  describe('Extraction de paramètres', () => {
    test('devrait extraire montant avec "150k" (150000 FCFA)', async () => {
      // TODO: Tester MontantExtractor directement
      // const montant = MontantExtractor.extract("150k");
      // expect(montant).toBe(150000);
    });

    test('devrait extraire montant avec "150 balles" (150000 FCFA)', async () => {
      // TODO: Tester MontantExtractor
      // const montant = MontantExtractor.extract("150 balles");
      // expect(montant).toBe(150000);
    });

    test('devrait normaliser "bouffe" → "alimentation"', async () => {
      // TODO: Tester CategoryNormalizer
      // const categorie = CategoryNormalizer.normalize("bouffe");
      // expect(categorie).toBe("alimentation");
    });
  });

  describe('Fallback RAG', () => {
    test('devrait utiliser RAG si Fast Path échoue', async () => {
      // TODO: Tester que RAG est appelé quand Fast Path ne trouve rien
    });

    test('devrait détecter intention avec phrase complexe', async () => {
      // TODO: Tester avec phrase complexe qui nécessite RAG
      // const result = await chatAgent.sendMessage("Peux-tu me donner un résumé de mes dépenses ce mois ?");
      // expect(result.metadata?.detectedAction).toBe('calculate_costs');
    });
  });

  describe('Confirmations adaptatives', () => {
    test('devrait exécuter automatiquement si confiance > 95%', async () => {
      // TODO: Tester confirmation automatique
      // const result = await chatAgent.sendMessage("J'ai claqué 150k en bouffe hier");
      // expect(result.content).toContain("C'est enregistré");
      // expect(result.metadata?.requiresConfirmation).toBe(false);
    });

    test('devrait demander confirmation si confiance < 80%', async () => {
      // TODO: Tester demande de confirmation
      // const result = await chatAgent.sendMessage("Je veux faire quelque chose");
      // expect(result.content).toContain("reformuler");
      // expect(result.metadata?.requiresConfirmation).toBe(true);
    });
  });

  describe('Exécution d\'actions', () => {
    test('devrait exécuter create_depense correctement', async () => {
      // TODO: Mock API et tester exécution complète
    });

    test('devrait exécuter create_revenu correctement', async () => {
      // TODO: Mock API et tester exécution complète
    });

    test('devrait exécuter create_vaccination correctement', async () => {
      // TODO: Mock API et tester exécution complète
    });
  });
});

