/**
 * Styles de graphiques alignés avec le design TailAdmin
 * Couleurs, hauteurs, et styles pour Recharts
 */

// Couleur principale du template TailAdmin (brand-500)
export const CHART_PRIMARY_COLOR = '#465fff'
export const CHART_SECONDARY_COLOR = '#9CB9FF'

// Hauteurs standard selon le template
export const CHART_HEIGHT_SMALL = 180
export const CHART_HEIGHT_MEDIUM = 280
export const CHART_HEIGHT_LARGE = 310

// Styles pour les axes
export const axisStyle = {
  fontSize: '14px',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  fill: '#475467', // gray-600
}

export const axisTickStyle = {
  fill: '#98a2b3', // gray-400
  fontSize: '12px',
}

// Styles pour la grille
export const gridStyle = {
  stroke: '#e4e7ec', // gray-200
  strokeDasharray: '3 3',
}

// Styles pour le tooltip
export const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e4e7ec', // gray-200
  borderRadius: '8px',
  fontSize: '14px',
  fontFamily: "'Outfit', 'Inter', sans-serif",
  boxShadow: '0px 1px 3px 0px rgba(16, 24, 40, 0.1), 0px 1px 2px 0px rgba(16, 24, 40, 0.06)',
  padding: '8px 12px',
}

// Styles pour les lignes de graphique
export const lineStyle = {
  stroke: CHART_PRIMARY_COLOR,
  strokeWidth: 2,
}

// Styles pour les barres
export const barStyle = {
  fill: CHART_PRIMARY_COLOR,
  borderRadius: 5,
}

// Couleurs pour les graphiques en secteurs (Pie)
export const PIE_COLORS = [
  CHART_PRIMARY_COLOR,
  CHART_SECONDARY_COLOR,
  '#12b76a', // success-500
  '#f79009', // warning-500
  '#f04438', // error-500
  '#0ba5ec', // blue-light-500
]
