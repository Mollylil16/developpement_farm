/**
 * Tests unitaires pour NotificationsService
 * Priorité 1 : Tests critiques pour gestion notifications
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from '../notifications.service';
import { DatabaseService } from '../../database/database.service';
import { NotFoundException } from '@nestjs/common';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockNotification = {
    id: 'notif_123',
    user_id: 'user_123',
    type: 'invitation_received',
    title: 'Nouvelle invitation',
    message: 'Vous avez été invité à rejoindre un projet',
    data: { projet_id: 'projet_123' },
    read: false,
    created_at: new Date().toISOString(),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    databaseService = module.get(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createNotification', () => {
    it('devrait créer une notification avec succès', async () => {
      // Arrange
      const userId = 'user_123';
      const type = 'invitation_received';
      const title = 'Nouvelle invitation';
      const message = 'Vous avez été invité à rejoindre un projet';
      const data = { projet_id: 'projet_123' };

      databaseService.query.mockResolvedValueOnce({
        rows: [{ id: 'notif_123' }],
      });

      // Act
      const result = await service.createNotification(userId, type, title, message, data);

      // Assert
      expect(result).toBe('notif_123');
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        expect.arrayContaining([userId, type, title, message])
      );
    });

    it('devrait créer une notification sans données optionnelles', async () => {
      // Arrange
      const userId = 'user_123';
      const type = 'invitation_received';
      const title = 'Nouvelle invitation';
      const message = 'Vous avez été invité à rejoindre un projet';

      databaseService.query.mockResolvedValueOnce({
        rows: [{ id: 'notif_123' }],
      });

      // Act
      const result = await service.createNotification(userId, type, title, message);

      // Assert
      expect(result).toBe('notif_123');
    });
  });

  describe('markAsRead', () => {
    it('devrait marquer une notification comme lue avec succès', async () => {
      // Arrange
      const notificationId = 'notif_123';
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rowCount: 1 });

      // Act
      await service.markAsRead(notificationId, userId);

      // Assert
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        expect.arrayContaining([notificationId, userId])
      );
    });

    it('devrait lancer NotFoundException si la notification n\'existe pas', async () => {
      // Arrange
      const notificationId = 'notif_inexistant';
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rowCount: 0 });

      // Act & Assert
      try {
        await service.markAsRead(notificationId, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('markAllAsRead', () => {
    it('devrait marquer toutes les notifications comme lues', async () => {
      // Arrange
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rowCount: 5 });

      // Act
      const result = await service.markAllAsRead(userId);

      // Assert
      expect(result).toBe(5);
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        expect.arrayContaining([userId])
      );
    });

    it('devrait retourner 0 si aucune notification non lue', async () => {
      // Arrange
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rowCount: 0 });

      // Act
      const result = await service.markAllAsRead(userId);

      // Assert
      expect(result).toBe(0);
    });
  });

  describe('getUserNotifications', () => {
    it('devrait retourner les notifications d\'un utilisateur', async () => {
      // Arrange
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({
        rows: [mockNotification],
      });

      // Act
      const result = await service.getUserNotifications(userId);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(1);
    });

    it('devrait retourner uniquement les notifications non lues si unreadOnly est true', async () => {
      // Arrange
      const userId = 'user_123';
      const unreadOnly = true;

      databaseService.query.mockResolvedValueOnce({
        rows: [{ ...mockNotification, read: false }],
      });

      // Act
      const result = await service.getUserNotifications(userId, unreadOnly);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getUnreadCount', () => {
    it('devrait retourner le nombre de notifications non lues', async () => {
      // Arrange
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });

      // Act
      const result = await service.getUnreadCount(userId);

      // Assert
      expect(result).toBe(5);
    });
  });

  describe('deleteNotification', () => {
    it('devrait supprimer une notification avec succès', async () => {
      // Arrange
      const notificationId = 'notif_123';
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rowCount: 1 });

      // Act
      await service.deleteNotification(notificationId, userId);

      // Assert
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        expect.arrayContaining([notificationId, userId])
      );
    });

    it('devrait lancer NotFoundException si la notification n\'existe pas', async () => {
      // Arrange
      const notificationId = 'notif_inexistant';
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rowCount: 0 });

      // Act & Assert
      try {
        await service.deleteNotification(notificationId, userId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('deleteReadNotifications', () => {
    it('devrait supprimer toutes les notifications lues d\'un utilisateur', async () => {
      // Arrange
      const userId = 'user_123';

      databaseService.query.mockResolvedValueOnce({ rowCount: 3 });

      // Act
      const result = await service.deleteReadNotifications(userId);

      // Assert
      expect(result).toBe(3);
      expect(databaseService.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM notifications'),
        expect.arrayContaining([userId])
      );
    });
  });
});
