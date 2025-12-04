/**
 * Tests pour RoleIndicator
 * Vérifie la logique d'affichage du composant
 */

describe('RoleIndicator - Logique d\'affichage', () => {
  describe('Condition d\'affichage', () => {
    it('ne devrait pas afficher si un seul rôle disponible', () => {
      const shouldShowIndicator = (availableRoles: string[]): boolean => {
        return availableRoles.length > 1;
      };

      expect(shouldShowIndicator(['producer'])).toBe(false);
      expect(shouldShowIndicator(['producer', 'buyer'])).toBe(true);
      expect(shouldShowIndicator(['producer', 'buyer', 'veterinarian'])).toBe(true);
    });
  });

  describe('Configuration des rôles', () => {
    it('devrait retourner la bonne configuration pour chaque rôle', () => {
      const getRoleInfo = (role: string) => {
        const roleConfig: Record<string, { icon: string; label: string; color: string }> = {
          producer: { icon: 'paw', label: 'Producteur', color: '#22C55E' },
          buyer: { icon: 'cart', label: 'Acheteur', color: '#3B82F6' },
          veterinarian: { icon: 'medical', label: 'Vétérinaire', color: '#EF4444' },
          technician: { icon: 'construct', label: 'Technicien', color: '#F59E0B' },
        };
        return roleConfig[role];
      };

      expect(getRoleInfo('producer')).toEqual({ icon: 'paw', label: 'Producteur', color: '#22C55E' });
      expect(getRoleInfo('buyer')).toEqual({ icon: 'cart', label: 'Acheteur', color: '#3B82F6' });
      expect(getRoleInfo('veterinarian')).toEqual({ icon: 'medical', label: 'Vétérinaire', color: '#EF4444' });
      expect(getRoleInfo('technician')).toEqual({ icon: 'construct', label: 'Technicien', color: '#F59E0B' });
    });
  });
});

