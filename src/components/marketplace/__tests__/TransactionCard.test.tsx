/**
 * Tests pour TransactionCard
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TransactionCard from '../TransactionCard';
import type { Transaction } from '../../../types/marketplace';

describe('TransactionCard', () => {
  const mockTransaction: Transaction = {
    id: 'transaction-1',
    offerId: 'offer-1',
    listingId: 'listing-1',
    subjectIds: ['subject-1', 'subject-2'],
    buyerId: 'buyer-1',
    producerId: 'producer-1',
    finalPrice: 500000,
    status: 'confirmed',
    documents: {},
    createdAt: '2025-01-01T10:00:00Z',
  };

  it('should render transaction details', () => {
    const { getByText } = render(
      <TransactionCard
        transaction={mockTransaction}
        userRole="producer"
        onPress={() => {}}
      />
    );

    expect(getByText('500 000 FCFA')).toBeTruthy();
    expect(getByText('2')).toBeTruthy(); // subjectIds length
  });

  it('should display confirmed status', () => {
    const { getByText } = render(
      <TransactionCard
        transaction={mockTransaction}
        userRole="producer"
        onPress={() => {}}
      />
    );

    expect(getByText('Confirmé')).toBeTruthy();
  });

  it('should display delivery date when available', () => {
    const transactionWithDelivery: Transaction = {
      ...mockTransaction,
      deliveryDetails: {
        scheduledDate: '2025-02-01T10:00:00Z',
        location: 'Test Location',
        producerConfirmed: false,
        buyerConfirmed: false,
      },
    };

    const { getByText } = render(
      <TransactionCard
        transaction={transactionWithDelivery}
        userRole="producer"
        onPress={() => {}}
      />
    );

    expect(getByText(/Livraison/)).toBeTruthy();
  });

  it('should show confirm delivery button when eligible', () => {
    const transactionInTransit: Transaction = {
      ...mockTransaction,
      status: 'in_transit',
      deliveryDetails: {
        scheduledDate: '2025-02-01T10:00:00Z',
        location: 'Test',
        producerConfirmed: false,
        buyerConfirmed: false,
      },
    };

    const mockOnConfirm = jest.fn();

    const { getByText } = render(
      <TransactionCard
        transaction={transactionInTransit}
        userRole="producer"
        onPress={() => {}}
        onConfirmDelivery={mockOnConfirm}
      />
    );

    expect(getByText('Confirmer livraison')).toBeTruthy();
  });

  it('should not show confirm button when already confirmed', () => {
    const transactionConfirmed: Transaction = {
      ...mockTransaction,
      status: 'in_transit',
      deliveryDetails: {
        scheduledDate: '2025-02-01T10:00:00Z',
        location: 'Test',
        producerConfirmed: true,
        buyerConfirmed: false,
      },
    };

    const { queryByText } = render(
      <TransactionCard
        transaction={transactionConfirmed}
        userRole="producer"
        onPress={() => {}}
      />
    );

    expect(queryByText('Confirmer livraison')).toBeNull();
  });

  it('should call onPress when card is pressed', () => {
    const mockOnPress = jest.fn();

    const { getByText } = render(
      <TransactionCard
        transaction={mockTransaction}
        userRole="producer"
        onPress={mockOnPress}
      />
    );

    fireEvent.press(getByText('500 000 FCFA'));
    expect(mockOnPress).toHaveBeenCalled();
  });

  it('should call onChat when chat button is pressed', () => {
    const mockOnChat = jest.fn();

    const { getByText } = render(
      <TransactionCard
        transaction={mockTransaction}
        userRole="producer"
        onPress={() => {}}
        onChat={mockOnChat}
      />
    );

    fireEvent.press(getByText('Discuter'));
    expect(mockOnChat).toHaveBeenCalled();
  });

  it('should show completed banner for completed transactions', () => {
    const completedTransaction: Transaction = {
      ...mockTransaction,
      status: 'completed',
      completedAt: '2025-01-15T10:00:00Z',
    };

    const { getByText } = render(
      <TransactionCard
        transaction={completedTransaction}
        userRole="producer"
        onPress={() => {}}
      />
    );

    expect(getByText('Transaction terminée avec succès')).toBeTruthy();
  });

  it('should show delivery confirmation status', () => {
    const transactionWithConfirmations: Transaction = {
      ...mockTransaction,
      status: 'delivered',
      deliveryDetails: {
        scheduledDate: '2025-02-01T10:00:00Z',
        location: 'Test',
        producerConfirmed: true,
        buyerConfirmed: false,
      },
    };

    const { getByText, queryAllByText } = render(
      <TransactionCard
        transaction={transactionWithConfirmations}
        userRole="producer"
        onPress={() => {}}
      />
    );

    expect(getByText('Confirmation de livraison')).toBeTruthy();
    expect(getByText('Producteur')).toBeTruthy();
    // Le texte "Acheteur" peut apparaître plusieurs fois dans la carte
    expect(queryAllByText('Acheteur').length).toBeGreaterThan(0);
  });
});

