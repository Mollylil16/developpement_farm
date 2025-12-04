/**
 * Tests pour useRolePermissions
 */

import { renderHook } from '@testing-library/react-native';
import { useRolePermissions } from '../useRolePermissions';
import { useRole } from '../../contexts/RoleContext';

// Mock des dépendances
jest.mock('../../contexts/RoleContext', () => ({
  useRole: jest.fn(),
}));

const mockUseRole = useRole as jest.Mock;

describe('useRolePermissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('devrait retourner toutes les permissions pour le rôle producer', () => {
    mockUseRole.mockReturnValue({
      activeRole: 'producer',
    });

    const { result } = renderHook(() => useRolePermissions());

    expect(result.current.canViewHerd).toBe(true);
    expect(result.current.canEditHerd).toBe(true);
    expect(result.current.canViewFinances).toBe(true);
    expect(result.current.canEditFinances).toBe(true);
    expect(result.current.canViewHealthRecords).toBe(true);
    expect(result.current.canEditHealthRecords).toBe(true);
    expect(result.current.canGenerateReports).toBe(true);
    expect(result.current.canManageCollaborators).toBe(true);
    expect(result.current.canManageMarketplace).toBe(true);
  });

  it('devrait retourner des permissions limitées pour le rôle buyer', () => {
    mockUseRole.mockReturnValue({
      activeRole: 'buyer',
    });

    const { result } = renderHook(() => useRolePermissions());

    expect(result.current.canViewHerd).toBe(false);
    expect(result.current.canEditHerd).toBe(false);
    expect(result.current.canViewFinances).toBe(false);
    expect(result.current.canEditFinances).toBe(false);
    expect(result.current.canViewHealthRecords).toBe(false);
    expect(result.current.canEditHealthRecords).toBe(false);
    expect(result.current.canGenerateReports).toBe(false);
    expect(result.current.canManageCollaborators).toBe(false);
    expect(result.current.canManageMarketplace).toBe(true); // Peut gérer le marketplace
  });

  it('devrait retourner des permissions spécifiques pour le rôle veterinarian', () => {
    mockUseRole.mockReturnValue({
      activeRole: 'veterinarian',
    });

    const { result } = renderHook(() => useRolePermissions());

    expect(result.current.canViewHerd).toBe(true);
    expect(result.current.canEditHerd).toBe(false);
    expect(result.current.canViewFinances).toBe(false);
    expect(result.current.canEditFinances).toBe(false);
    expect(result.current.canViewHealthRecords).toBe(true);
    expect(result.current.canEditHealthRecords).toBe(true); // Peut éditer les dossiers de santé
    expect(result.current.canGenerateReports).toBe(true);
    expect(result.current.canManageCollaborators).toBe(false);
    expect(result.current.canManageMarketplace).toBe(false);
  });

  it('devrait retourner des permissions spécifiques pour le rôle technician', () => {
    mockUseRole.mockReturnValue({
      activeRole: 'technician',
    });

    const { result } = renderHook(() => useRolePermissions());

    expect(result.current.canViewHerd).toBe(true);
    expect(result.current.canEditHerd).toBe(true); // Peut éditer selon les permissions
    expect(result.current.canViewFinances).toBe(false);
    expect(result.current.canEditFinances).toBe(false);
    expect(result.current.canViewHealthRecords).toBe(true);
    expect(result.current.canEditHealthRecords).toBe(true);
    expect(result.current.canGenerateReports).toBe(false);
    expect(result.current.canManageCollaborators).toBe(false);
    expect(result.current.canManageMarketplace).toBe(false);
  });
});

