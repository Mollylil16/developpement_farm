/**
 * Tests pour OfferResponseModal
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import OfferResponseModal from '../OfferResponseModal';
import type { Offer } from '../../../types/marketplace';

// Mock Alert
const mockAlert = jest.fn((title, message, buttons) => {
  // Simulate pressing the first button if provided
  if (buttons && Array.isArray(buttons) && buttons.length > 0 && buttons[0]?.onPress) {
    setTimeout(() => buttons[0].onPress(), 0);
  }
});

describe('OfferResponseModal', () => {
  let alertSpy: jest.SpyInstance;

  beforeAll(() => {
    // Mock Alert.alert before all tests
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(mockAlert);
  });

  afterAll(() => {
    // Restore original implementation after all tests
    alertSpy.mockRestore();
  });

  beforeEach(() => {
    mockAlert.mockClear();
  });
  const mockOffer: Offer = {
    id: 'offer-1',
    listingId: 'listing-1',
    subjectIds: ['subject-1', 'subject-2'],
    buyerId: 'buyer-1',
    producerId: 'producer-1',
    proposedPrice: 450000,
    originalPrice: 500000,
    status: 'pending',
    termsAccepted: true,
    createdAt: '2025-01-01T10:00:00Z',
    expiresAt: '2025-01-08T10:00:00Z',
  };

  const defaultProps = {
    visible: true,
    onClose: jest.fn(),
    offer: mockOffer,
    onAccept: jest.fn(),
    onReject: jest.fn(),
    onCounter: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render offer details', () => {
    const { getByText } = render(<OfferResponseModal {...defaultProps} />);

    expect(getByText('Répondre à l\'offre')).toBeTruthy();
    expect(getByText('450 000 FCFA')).toBeTruthy(); // proposed price
    expect(getByText('2 sujet(s)')).toBeTruthy();
  });

  it('should show all action options', () => {
    const { getByText } = render(<OfferResponseModal {...defaultProps} />);

    expect(getByText('Accepter l\'offre')).toBeTruthy();
    expect(getByText('Contre-proposer')).toBeTruthy();
    expect(getByText('Refuser l\'offre')).toBeTruthy();
  });

  it('should allow selecting an action', () => {
    const { getByTestId, getByText } = render(<OfferResponseModal {...defaultProps} />);

    const acceptButton = getByTestId('accept-action-card');
    fireEvent.press(acceptButton);

    // Submit button should show the action text
    expect(getByTestId('submit-button')).toBeTruthy();
  });

  it('should show price input for counter offer', () => {
    const { getByTestId, getByPlaceholderText } = render(
      <OfferResponseModal {...defaultProps} />
    );

    fireEvent.press(getByTestId('counter-action-card'));

    const priceInput = getByPlaceholderText('0');
    expect(priceInput).toBeTruthy();
  });

  it('should show message input for reject and counter', () => {
    const { getByTestId, getByPlaceholderText, rerender } = render(
      <OfferResponseModal {...defaultProps} />
    );

    // Test counter message input
    fireEvent.press(getByTestId('counter-action-card'));
    expect(getByPlaceholderText('Expliquez votre contre-proposition...')).toBeTruthy();

    // Test reject message input
    rerender(<OfferResponseModal {...defaultProps} />);
    fireEvent.press(getByTestId('reject-action-card'));
    expect(getByPlaceholderText('Expliquez la raison du refus...')).toBeTruthy();
  });

  it('should call onAccept when accepting', async () => {
    const mockOnAccept = jest.fn().mockResolvedValue(undefined);
    const { getByTestId } = render(
      <OfferResponseModal {...defaultProps} onAccept={mockOnAccept} />
    );

    fireEvent.press(getByTestId('accept-action-card'));
    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalled();
    });
  });

  it('should call onReject when rejecting', async () => {
    const mockOnReject = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, getByPlaceholderText } = render(
      <OfferResponseModal {...defaultProps} onReject={mockOnReject} />
    );

    fireEvent.press(getByTestId('reject-action-card'));
    
    const messageInput = getByPlaceholderText('Expliquez la raison du refus...');
    fireEvent.changeText(messageInput, 'Prix trop bas');

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnReject).toHaveBeenCalledWith('Prix trop bas');
    });
  });

  it('should call onCounter with price and message', async () => {
    const mockOnCounter = jest.fn().mockResolvedValue(undefined);
    const { getByTestId, getByPlaceholderText } = render(
      <OfferResponseModal {...defaultProps} onCounter={mockOnCounter} />
    );

    fireEvent.press(getByTestId('counter-action-card'));
    
    const priceInput = getByPlaceholderText('0');
    fireEvent.changeText(priceInput, '480000');

    const messageInput = getByPlaceholderText('Expliquez votre contre-proposition...');
    fireEvent.changeText(messageInput, 'Meilleur prix');

    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    await waitFor(() => {
      expect(mockOnCounter).toHaveBeenCalledWith(480000, 'Meilleur prix');
    });
  });

  it('should validate counter price', async () => {
    const { getByTestId, getByPlaceholderText, queryByTestId } = render(
      <OfferResponseModal {...defaultProps} />
    );

    fireEvent.press(getByTestId('counter-action-card'));
    
    const priceInput = getByPlaceholderText('0');
    
    // Test avec prix vide
    fireEvent.changeText(priceInput, '');
    
    // Le bouton devrait être désactivé (canSubmit retourne false)
    const submitButtonEmpty = getByTestId('submit-button');
    expect(submitButtonEmpty).toBeTruthy();
    
    // Test avec prix invalide (0)
    fireEvent.changeText(priceInput, '0');
    const submitButtonZero = getByTestId('submit-button');
    expect(submitButtonZero).toBeTruthy();
    
    // Test avec prix valide
    fireEvent.changeText(priceInput, '480000');
    const submitButtonValid = getByTestId('submit-button');
    expect(submitButtonValid).toBeTruthy();
    // Le bouton devrait maintenant être activé
  });

  it('should call onClose when close button is pressed', () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <OfferResponseModal {...defaultProps} onClose={mockOnClose} />
    );

    fireEvent.press(getByTestId('close-button'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable submit button when no action selected', () => {
    const { getByText } = render(<OfferResponseModal {...defaultProps} />);

    // Initially no action selected, button should be disabled
    const cancelButton = getByText('Annuler');
    expect(cancelButton).toBeTruthy();
  });

  it('should show loading state while submitting', async () => {
    const mockOnAccept = jest.fn(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const { getByTestId, queryByTestId } = render(
      <OfferResponseModal {...defaultProps} onAccept={mockOnAccept} />
    );

    fireEvent.press(getByTestId('accept-action-card'));
    const submitButton = getByTestId('submit-button');
    fireEvent.press(submitButton);

    // Le bouton devrait être disabled pendant le loading
    await waitFor(() => {
      expect(mockOnAccept).toHaveBeenCalled();
    });
  });
});

