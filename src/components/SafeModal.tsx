/**
 * SafeModal - Wrapper qui combine CustomModal avec ModalErrorBoundary
 * Garantit que tous les modals sont protégés contre les erreurs
 */

import React from 'react';
import CustomModal, { CustomModalProps } from './CustomModal';
import ModalErrorBoundary from './ModalErrorBoundary';

interface SafeModalProps extends CustomModalProps {
  modalName: string;
  children: React.ReactNode;
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
      <CustomModal onClose={onClose} {...customModalProps}>
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

