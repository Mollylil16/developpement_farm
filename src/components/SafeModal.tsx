/**
 * SafeModal - Wrapper qui combine CustomModal avec ModalErrorBoundary
 * Garantit que tous les modals sont protégés contre les erreurs
 */

import React from 'react';
import CustomModal from './CustomModal';
import ModalErrorBoundary from './ModalErrorBoundary';

interface CustomModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
  showButtons?: boolean;
  loading?: boolean;
  enableShakeToCancel?: boolean;
  shakeThreshold?: number;
  scrollEnabled?: boolean;
}

interface SafeModalProps extends CustomModalProps {
  modalName: string;
}

/**
 * Modal sécurisé avec ErrorBoundary intégré
 * Utiliser ce composant au lieu de CustomModal pour les modals critiques
 */
export default function SafeModal({
  modalName,
  children,
  onClose,
  ...customModalProps
}: SafeModalProps) {
  return (
    <ModalErrorBoundary modalName={modalName} onClose={onClose}>
      <CustomModal onClose={onClose} title={customModalProps.title} {...customModalProps}>
        {children}
      </CustomModal>
    </ModalErrorBoundary>
  );
}

/**
 * Exemple d'utilisation:
 * 
 * <SafeModal
 *   modalName="RevenuFormModal"
 *   visible={visible}
 *   onClose={onClose}
 *   title="Nouveau revenu"
 *   confirmText="Enregistrer"
 *   onConfirm={handleSubmit}
 *   showButtons={true}
 *   scrollEnabled={true}
 * >
 *   <FormContent />
 * </SafeModal>
 */

