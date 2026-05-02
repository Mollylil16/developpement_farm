#!/bin/bash
# Script pour remplacer l'ancienne méthode par useProjetEffectif

FILES=(
  "src/components/CollaborationListComponent.tsx"
  "src/components/marketplace/FarmDetailsModal.tsx"
  "src/components/ParametresProjetComponent.tsx"
  "src/components/CollaborationFormModal.tsx"
  "src/components/finance/ProjectedRevenueCard.tsx"
  "src/components/finance/LivestockStatsCard.tsx"
  "src/components/finance/ComparisonCard.tsx"
  "src/components/GestationsCalendarComponent.tsx"
  "src/components/DetteFormModal.tsx"
  "src/components/FinanceBilanComptableComponent.tsx"
  "src/components/CalculateurRationComponent.tsx"
  "src/components/WidgetVueEnsemble.tsx"
  "src/components/widgets/PerformanceWidget.tsx"
  "src/components/widgets/CoutProductionWidget.tsx"
  "src/components/WidgetPerformance.tsx"
  "src/components/VisiteVeterinaireFormModal.tsx"
  "src/components/TendancesChartsComponent.tsx"
  "src/components/StockMouvementsHistoryComponent.tsx"
  "src/components/SimulateurProductionComponent.tsx"
  "src/components/sante/BatchSelector.tsx"
  "src/components/RationsHistoryComponent.tsx"
  "src/components/RationCalculatorComponent.tsx"
  "src/components/ProfileMenuModal/UserSummary.tsx"
  "src/components/ProfileMenuModal/HomeView.tsx"
  "src/components/ProductionHistoriqueComponent.tsx"
  "src/components/PlanificationCalendarComponent.tsx"
  "src/components/NutritionStockComponent.tsx"
  "src/components/finance/PriceConfigCard.tsx"
  "src/components/finance/OpexCapexChart.tsx"
  "src/components/ExportImportComponent.tsx"
  "src/components/BudgetisationAlimentComponent.tsx"
  "src/components/AlertesWidget.tsx"
  "src/components/VisiteVeterinaireFormModalNew.tsx"
  "src/components/PrevisionVentesComponent.tsx"
  "src/components/PlanificateurSailliesComponent.tsx"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    # Ajouter l'import useProjetEffectif si pas déjà présent
    if ! grep -q "useProjetEffectif" "$file"; then
      # Déterminer le chemin relatif de l'import
      depth=$(echo "$file" | tr -cd '/' | wc -c)
      if [[ $file == *"widgets/"* ]] || [[ $file == *"finance/"* ]] || [[ $file == *"ProfileMenuModal/"* ]] || [[ $file == *"sante/"* ]] || [[ $file == *"marketplace/"* ]]; then
        import_path="../../hooks/useProjetEffectif"
      else
        import_path="../hooks/useProjetEffectif"
      fi
      
      # Ajouter l'import après un import existant de hooks
      sed -i "s|import { useActionPermissions } from '[^']*useActionPermissions';|import { useActionPermissions } from '\1useActionPermissions';\nimport { useProjetEffectif } from '$import_path';|" "$file" 2>/dev/null || true
    fi
    
    # Remplacer le pattern d'extraction
    sed -i "s|const { projetActif } = useAppSelector((state) => state.projet ?? { projetActif: null });|// Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens\n  const projetActif = useProjetEffectif();|" "$file" 2>/dev/null || true
    sed -i "s|const { projetActif } = useAppSelector((state) => state.projet);|// Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens\n  const projetActif = useProjetEffectif();|" "$file" 2>/dev/null || true
    sed -i "s|const projetActif = useAppSelector((state) => state.projet.projetActif);|// Utiliser useProjetEffectif pour supporter les vétérinaires/techniciens\n  const projetActif = useProjetEffectif();|" "$file" 2>/dev/null || true
    
    echo "Processed: $file"
  fi
done

echo "Done!"
