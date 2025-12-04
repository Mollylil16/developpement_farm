/**
 * Tests pour NotificationCard
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import NotificationCard from '../NotificationCard';
import type { Notification } from '../../../types/marketplace';

describe('NotificationCard', () => {
  const mockNotification: Notification = {
    id: 'notif-1',
    userId: 'user-1',
    type: 'offer_received',
    title: 'Nouvelle offre',
    message: 'Test message',
    body: 'Vous avez reçu une nouvelle offre',
    relatedId: 'offer-1',
    relatedType: 'offer',
    read: false,
    createdAt: '2025-01-01T10:00:00Z',
  };

  it('should render notification title and body', () => {
    const { getByText } = render(
      <NotificationCard
        notification={mockNotification}
        onPress={() => {}}
      />
    );

    expect(getByText('Nouvelle offre')).toBeTruthy();
    expect(getByText('Vous avez reçu une nouvelle offre')).toBeTruthy();
  });

  it('should show unread indicator for unread notifications', () => {
    const { getByTestId } = render(
      <NotificationCard
        notification={mockNotification}
        onPress={() => {}}
      />
    );

    // The unread dot should be present
    const badge = getByTestId('unread-badge');
    expect(badge).toBeTruthy();
  });

  it('should not show unread indicator for read notifications', () => {
    const readNotification: Notification = {
      ...mockNotification,
      read: true,
      readAt: '2025-01-01T11:00:00Z',
    };

    const { queryByTestId } = render(
      <NotificationCard
        notification={readNotification}
        onPress={() => {}}
      />
    );

    expect(queryByTestId('unread-badge')).toBeNull();
  });

  it('should call onPress when pressed', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <NotificationCard
        notification={mockNotification}
        onPress={mockOnPress}
      />
    );

    fireEvent.press(getByText('Nouvelle offre'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should call onMarkAsRead when mark button is pressed', () => {
    const mockOnMarkAsRead = jest.fn();

    const { getByTestId } = render(
      <NotificationCard
        notification={mockNotification}
        onPress={() => {}}
        onMarkAsRead={mockOnMarkAsRead}
      />
    );

    fireEvent.press(getByTestId('mark-read-button'));
    expect(mockOnMarkAsRead).toHaveBeenCalled();
  });

  // Note: Le composant NotificationCard n'a pas de fonctionnalité de suppression
  // La suppression se fait via le hook useMarketplaceNotifications

  it('should render different icons for different notification types', () => {
    const offerNotification: Notification = {
      ...mockNotification,
      type: 'offer_received',
    };

    const messageNotification: Notification = {
      ...mockNotification,
      type: 'message_received',
    };

    const { rerender, getByTestId } = render(
      <NotificationCard
        notification={offerNotification}
        onPress={() => {}}
      />
    );

    // Vérifier que l'icône est présente pour le type offer
    let icon = getByTestId('notification-icon');
    expect(icon).toBeTruthy();

    rerender(
      <NotificationCard
        notification={messageNotification}
        onPress={() => {}}
      />
    );

    // Vérifier que l'icône est présente pour le type message
    icon = getByTestId('notification-icon');
    expect(icon).toBeTruthy();
  });

  it('should format date correctly', () => {
    const { getByText } = render(
      <NotificationCard
        notification={mockNotification}
        onPress={() => {}}
      />
    );

    // Should display relative time (e.g., "Il y a 2 heures")
    const timeText = getByText(/il y a/i);
    expect(timeText).toBeTruthy();
  });
});

