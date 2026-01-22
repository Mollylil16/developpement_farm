/**
 * Tests unitaires pour BatchPigsService
 * Priorité 1 : Tests critiques pour gestion bandes et porcs
 */

import { Test, TestingModule } from '@nestjs/testing';
import { BatchPigsService } from '../batch-pigs.service';
import { DatabaseService } from '../../database/database.service';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { CreateBatchPigDto } from '../dto/create-batch-pig.dto';
import { TransferPigDto } from '../dto/transfer-pig.dto';
import { CreateBatchWithPigsDto } from '../dto/create-batch-with-pigs.dto';

describe('BatchPigsService', () => {
  let service: BatchPigsService;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockProjet = {
    id: 'projet_123',
    proprietaire_id: 'owner_123',
    nom: 'Ferme Test',
  };

  const mockBatch = {
    id: 'batch_123',
    projet_id: 'projet_123',
    nom: 'Bande Test',
    total_count: 10,
    date_creation: new Date().toISOString(),
  };

  const mockPig = {
    id: 'pig_123',
    batch_id: 'batch_123',
    name: 'Porc 1',
    sex: 'male',
    birth_date: '2024-01-01',
    current_weight_kg: 30.5,
    date_creation: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BatchPigsService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<BatchPigsService>(BatchPigsService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('addPigToBatch', () => {
    it('devrait ajouter un porc à une bande avec succès', async () => {
      // Arrange
      const createDto: CreateBatchPigDto = {
        batch_id: 'batch_123',
        name: 'Porc 1',
        sex: 'male',
        birth_date: '2024-01-01',
        current_weight_kg: 30.5,
        origin: 'birth',
      };

      const userId = 'owner_123';

      // checkBatchOwnership fait une jointure avec projets
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ id: 'batch_123' }] }) // checkBatchOwnership
        .mockResolvedValueOnce({ rows: [mockPig] }); // INSERT

      // Act
      const result = await service.addPigToBatch(createDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.name).toBe('Porc 1');
      expect(result.batch_id).toBe('batch_123');
    });

    it('devrait lancer ForbiddenException si la bande n\'appartient pas à l\'utilisateur', async () => {
      // Arrange
      const createDto: CreateBatchPigDto = {
        batch_id: 'batch_123',
        name: 'Porc 1',
        sex: 'male',
        current_weight_kg: 30.5,
        origin: 'birth',
      };

      const userId = 'other_user';

      // checkBatchOwnership retourne vide si pas propriétaire
      databaseService.query
        .mockResolvedValueOnce({ rows: [] }) // checkBatchOwnership (pas de résultat)
        .mockResolvedValueOnce({ rows: [{ id: 'batch_123', projet_id: 'projet_123' }] }) // Vérification existence bande
        .mockResolvedValueOnce({ rows: [{ proprietaire_id: 'owner_123' }] }); // Vérification propriétaire projet

      // Act & Assert
      try {
        await service.addPigToBatch(createDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenException);
      }
    });
  });

  describe('transferPig', () => {
    it('devrait transférer un porc d\'une bande à une autre avec succès', async () => {
      // Arrange
      const transferDto: TransferPigDto = {
        pig_id: 'pig_123',
        from_batch_id: 'batch_123',
        to_batch_id: 'batch_456',
      };

      const userId = 'owner_123';

      // transferPig fait :
      // 1. SELECT porc
      // 2. checkBatchOwnership from_batch
      // 3. checkBatchOwnership to_batch
      // 4. SELECT to_batch
      // 5. UPDATE porc
      // 6. INSERT mouvement
      // 7. SELECT porc mis à jour
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockPig] }) // SELECT porc
        .mockResolvedValueOnce({ rows: [{ id: 'batch_123' }] }) // checkBatchOwnership from_batch
        .mockResolvedValueOnce({ rows: [{ id: 'batch_456' }] }) // checkBatchOwnership to_batch
        .mockResolvedValueOnce({ rows: [{ id: 'batch_456' }] }) // SELECT to_batch
        .mockResolvedValueOnce({ rowCount: 1 }) // UPDATE porc
        .mockResolvedValueOnce({ rowCount: 1 }) // INSERT mouvement
        .mockResolvedValueOnce({ rows: [{ ...mockPig, batch_id: 'batch_456' }] }); // SELECT porc mis à jour

      // Act
      const result = await service.transferPig(transferDto, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.batch_id).toBe('batch_456');
    });

    it('devrait lancer BadRequestException si le porc n\'existe pas', async () => {
      // Arrange
      const transferDto: TransferPigDto = {
        pig_id: 'pig_inexistant',
        from_batch_id: 'batch_123',
        to_batch_id: 'batch_456',
      };

      const userId = 'owner_123';

      // transferPig commence par SELECT porc
      databaseService.query.mockResolvedValueOnce({ rows: [] }); // Porc inexistant

      // Act & Assert
      try {
        await service.transferPig(transferDto, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('getPigsByBatch', () => {
    it('devrait retourner les porcs d\'une bande', async () => {
      // Arrange
      const batchId = 'batch_123';
      const userId = 'owner_123';

      // checkBatchOwnership puis SELECT porcs
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ id: 'batch_123' }] }) // checkBatchOwnership
        .mockResolvedValueOnce({ rows: [mockPig] }); // SELECT porcs

      // Act
      const result = await service.getPigsByBatch(batchId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });
  });

  describe('getAllBatchesByProjet', () => {
    it('devrait retourner toutes les bandes d\'un projet', async () => {
      // Arrange
      const projetId = 'projet_123';
      const userId = 'owner_123';

      // checkProjetOwnership puis SELECT bandes
      databaseService.query
        .mockResolvedValueOnce({ rows: [mockProjet] }) // checkProjetOwnership
        .mockResolvedValueOnce({ rows: [mockBatch] }); // SELECT bandes

      // Act
      const result = await service.getAllBatchesByProjet(projetId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getBatchStats', () => {
    it('devrait retourner les statistiques d\'une bande', async () => {
      // Arrange
      const batchId = 'batch_123';
      const userId = 'owner_123';

      // getBatchStats fait :
      // 1. checkBatchOwnership
      // 2. getPigsByBatch (qui fait checkBatchOwnership + SELECT porcs)
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ id: 'batch_123' }] }) // checkBatchOwnership (dans getBatchStats)
        .mockResolvedValueOnce({ rows: [{ id: 'batch_123' }] }) // checkBatchOwnership (dans getPigsByBatch)
        .mockResolvedValueOnce({ rows: [mockPig] }); // SELECT porcs (dans getPigsByBatch)

      // Act
      const result = await service.getBatchStats(batchId, userId);

      // Assert
      expect(result).toBeDefined();
      expect(result.total).toBe(1);
    });
  });

  describe('deleteBatch', () => {
    it('devrait supprimer une bande avec succès', async () => {
      // Arrange
      const batchId = 'batch_123';
      const userId = 'owner_123';

      // deleteBatch fait :
      // 1. checkBatchOwnership
      // 2. SELECT COUNT porcs
      // 3. DELETE batch
      databaseService.query
        .mockResolvedValueOnce({ rows: [{ id: 'batch_123' }] }) // checkBatchOwnership
        .mockResolvedValueOnce({ rows: [{ count: '0' }] }) // SELECT COUNT (bande vide)
        .mockResolvedValueOnce({ rows: [{ id: 'batch_123' }] }); // DELETE batch

      // Act
      await service.deleteBatch(batchId, userId);

      // Assert
      const deleteCall = databaseService.query.mock.calls.find(
        (call) => call[0] && typeof call[0] === 'string' && call[0].includes('DELETE FROM batches')
      );
      expect(deleteCall).toBeDefined();
    });
  });
});
