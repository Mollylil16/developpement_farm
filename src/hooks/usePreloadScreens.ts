/**
 * Hook pour précharger intelligemment les écrans
 * Améliore les performances en préchargeant les écrans probables
 */

import { useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { useRole } from '../contexts/RoleContext';

/**
 * Précharge les écrans selon le rôle de l'utilisateur
 */
export function usePreloadScreens() {
  const { activeRole } = useRole();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const projetActif = useAppSelector((state) => state.projet.projetActif);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    // Précharger les écrans communs
    const preloadCommonScreens = async () => {
      await Promise.all([import('../screens/ProfilScreen'), import('../screens/ParametresScreen')]);
    };

    // Précharger selon le rôle
    const preloadRoleScreens = async () => {
      switch (activeRole) {
        case 'producer':
          await Promise.all([
            import('../screens/DashboardScreen'),
            import('../screens/ProductionScreen'),
            import('../screens/FinanceScreen'),
            import('../screens/ReproductionScreen'),
            import('../screens/SanteScreen'),
          ]);
          break;
        case 'buyer':
          await Promise.all([
            import('../screens/DashboardBuyerScreen'),
            import('../screens/MyPurchasesScreen'),
            import('../screens/marketplace/MarketplaceScreen'),
          ]);
          break;
        case 'veterinarian':
          await Promise.all([
            import('../screens/DashboardVetScreen'),
            import('../screens/MyFarmsScreen'),
            import('../screens/ConsultationsScreen'),
          ]);
          break;
        case 'technician':
          await Promise.all([
            import('../screens/DashboardTechScreen'),
            import('../screens/TasksScreen'),
          ]);
          break;
      }
    };

    // Précharger après un court délai pour ne pas bloquer le démarrage
    const timer = setTimeout(() => {
      preloadCommonScreens();
      preloadRoleScreens();
    }, 2000); // 2 secondes après l'authentification

    return () => clearTimeout(timer);
  }, [isAuthenticated, activeRole, projetActif]);
}
