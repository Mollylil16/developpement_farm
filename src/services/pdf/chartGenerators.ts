/**
 * Générateurs de graphiques pour les rapports PDF
 * Crée des graphiques SVG simples qui peuvent être intégrés dans le HTML du PDF
 */

import { formatCurrency, formatNumber } from '../pdfService';

/**
 * Génère un graphique en ligne SVG simple
 */
export function generateLineChartSVG(
  labels: string[],
  datasets: Array<{ data: number[]; label: string; color: string }>,
  width: number = 600,
  height: number = 200
): string {
  if (labels.length === 0 || datasets.length === 0) {
    return '<p style="text-align: center; color: #999; padding: 40px;">Aucune donnée disponible</p>';
  }

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Trouver les valeurs min et max pour l'échelle
  const allValues = datasets.flatMap((ds) => ds.data);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const range = maxValue - minValue || 1;

  // Fonction pour convertir une valeur en coordonnée Y
  const valueToY = (value: number) => {
    return padding + chartHeight - ((value - minValue) / range) * chartHeight;
  };

  // Fonction pour convertir un index en coordonnée X
  const indexToX = (index: number) => {
    return padding + (index / (labels.length - 1 || 1)) * chartWidth;
  };

  // Générer les lignes pour chaque dataset
  const paths = datasets
    .map((dataset) => {
      const points = dataset.data
        .map((value, index) => `${indexToX(index)},${valueToY(value)}`)
        .join(' ');

      return `<polyline
        points="${points}"
        fill="none"
        stroke="${dataset.color}"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />`;
    })
    .join('\n');

  // Générer les points pour chaque dataset
  const dots = datasets
    .flatMap((dataset) =>
      dataset.data.map(
        (value, index) => `<circle
        cx="${indexToX(index)}"
        cy="${valueToY(value)}"
        r="4"
        fill="${dataset.color}"
      />`
      )
    )
    .join('\n');

  // Générer les lignes de grille horizontales
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = padding + (i / 4) * chartHeight;
    const value = maxValue - (i / 4) * range;
    return `<line
      x1="${padding}"
      y1="${y}"
      x2="${padding + chartWidth}"
      y2="${y}"
      stroke="#e0e0e0"
      stroke-width="1"
      stroke-dasharray="2,2"
    />
    <text
      x="${padding - 10}"
      y="${y + 4}"
      text-anchor="end"
      font-size="10"
      fill="#666"
    >${formatNumber(value, 0)}</text>`;
  }).join('\n');

  // Générer les labels sur l'axe X
  const xLabels = labels
    .map(
      (label, index) => `<text
      x="${indexToX(index)}"
      y="${height - padding + 20}"
      text-anchor="middle"
      font-size="10"
      fill="#666"
    >${label}</text>`
    )
    .join('\n');

  // Générer la légende
  const legend = datasets
    .map(
      (dataset, index) => `<g transform="translate(${width - 150}, ${20 + index * 20})">
      <line x1="0" y1="10" x2="20" y2="10" stroke="${dataset.color}" stroke-width="2"/>
      <text x="25" y="14" font-size="11" fill="#333">${dataset.label}</text>
    </g>`
    )
    .join('\n');

  return `
    <svg width="${width}" height="${height + 30}" style="background: white; border: 1px solid #ddd; border-radius: 4px;">
      ${gridLines}
      ${paths}
      ${dots}
      ${xLabels}
      ${legend}
    </svg>
  `;
}

/**
 * Génère un graphique en barres SVG simple
 */
export function generateBarChartSVG(
  labels: string[],
  datasets: Array<{ data: number[]; label: string; color: string }>,
  width: number = 600,
  height: number = 200
): string {
  if (labels.length === 0 || datasets.length === 0) {
    return '<p style="text-align: center; color: #999; padding: 40px;">Aucune donnée disponible</p>';
  }

  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  // Trouver les valeurs min et max
  const allValues = datasets.flatMap((ds) => ds.data);
  const minValue = Math.min(...allValues, 0);
  const maxValue = Math.max(...allValues, 0);
  const range = maxValue - minValue || 1;

  // Fonction pour convertir une valeur en hauteur de barre
  const valueToHeight = (value: number) => {
    return ((value - minValue) / range) * chartHeight;
  };

  // Calculer la largeur des barres
  const barWidth = chartWidth / (labels.length * datasets.length + labels.length * 0.5);
  const groupWidth = barWidth * datasets.length * 1.5;

  // Générer les barres
  const bars = labels
    .map((label, labelIndex) => {
      const groupX = padding + (labelIndex * chartWidth) / labels.length + (chartWidth / labels.length - groupWidth) / 2;

      return datasets
        .map((dataset, datasetIndex) => {
          const value = dataset.data[labelIndex] || 0;
          const barHeight = valueToHeight(value);
          const barX = groupX + datasetIndex * barWidth * 1.5;
          const barY = padding + chartHeight - barHeight;

          return `<rect
            x="${barX}"
            y="${barY}"
            width="${barWidth}"
            height="${barHeight}"
            fill="${dataset.color}"
            opacity="0.8"
          />`;
        })
        .join('\n');
    })
    .join('\n');

  // Générer les lignes de grille
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const y = padding + (i / 4) * chartHeight;
    const value = maxValue - (i / 4) * range;
    return `<line
      x1="${padding}"
      y1="${y}"
      x2="${padding + chartWidth}"
      y2="${y}"
      stroke="#e0e0e0"
      stroke-width="1"
      stroke-dasharray="2,2"
    />
    <text
      x="${padding - 10}"
      y="${y + 4}"
      text-anchor="end"
      font-size="10"
      fill="#666"
    >${formatNumber(value, 0)}</text>`;
  }).join('\n');

  // Générer les labels sur l'axe X
  const xLabels = labels
    .map(
      (label, index) => `<text
      x="${padding + (index + 0.5) * (chartWidth / labels.length)}"
      y="${height - padding + 20}"
      text-anchor="middle"
      font-size="10"
      fill="#666"
    >${label}</text>`
    )
    .join('\n');

  // Générer la légende
  const legend = datasets
    .map(
      (dataset, index) => `<g transform="translate(${width - 150}, ${20 + index * 20})">
      <rect x="0" y="5" width="15" height="10" fill="${dataset.color}" opacity="0.8"/>
      <text x="20" y="14" font-size="11" fill="#333">${dataset.label}</text>
    </g>`
    )
    .join('\n');

  return `
    <svg width="${width}" height="${height + 30}" style="background: white; border: 1px solid #ddd; border-radius: 4px;">
      ${gridLines}
      ${bars}
      ${xLabels}
      ${legend}
    </svg>
  `;
}

/**
 * Génère un graphique en camembert SVG simple
 */
export function generatePieChartSVG(
  data: Array<{ name: string; value: number; color: string }>,
  width: number = 400,
  height: number = 300
): string {
  if (data.length === 0) {
    return '<p style="text-align: center; color: #999; padding: 40px;">Aucune donnée disponible</p>';
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return '<p style="text-align: center; color: #999; padding: 40px;">Aucune donnée disponible</p>';
  }

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) / 2 - 40;

  let currentAngle = -Math.PI / 2; // Commencer en haut

  const paths = data.map((item) => {
    const percentage = item.value / total;
    const angle = percentage * 2 * Math.PI;
    const endAngle = currentAngle + angle;

    const x1 = centerX + radius * Math.cos(currentAngle);
    const y1 = centerY + radius * Math.sin(currentAngle);
    const x2 = centerX + radius * Math.cos(endAngle);
    const y2 = centerY + radius * Math.sin(endAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData = [
      `M ${centerX} ${centerY}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z',
    ].join(' ');

    currentAngle = endAngle;

    return `<path
      d="${pathData}"
      fill="${item.color}"
      stroke="white"
      stroke-width="2"
    />`;
  });

  // Générer la légende
  const legend = data
    .map(
      (item, index) => `<g transform="translate(${width - 150}, ${20 + index * 25})">
      <rect x="0" y="5" width="15" height="15" fill="${item.color}"/>
      <text x="20" y="16" font-size="11" fill="#333">${item.name}</text>
      <text x="20" y="28" font-size="10" fill="#666">${formatNumber((item.value / total) * 100, 1)}%</text>
    </g>`
    )
    .join('\n');

  return `
    <svg width="${width}" height="${height}" style="background: white; border: 1px solid #ddd; border-radius: 4px;">
      ${paths.join('\n')}
      ${legend}
    </svg>
  `;
}

/**
 * Génère une analyse textuelle d'un graphique
 */
export function generateChartAnalysis(
  chartType: 'line' | 'bar' | 'pie',
  data: any,
  context: string
): string {
  let analysis = '';

  if (chartType === 'line') {
    const datasets = data.datasets || [];
    if (datasets.length > 0 && datasets[0].data.length > 0) {
      const values = datasets[0].data;
      const firstValue = values[0];
      const lastValue = values[values.length - 1];
      const trend = lastValue > firstValue ? 'hausse' : lastValue < firstValue ? 'baisse' : 'stabilité';
      const variation = Math.abs(((lastValue - firstValue) / (firstValue || 1)) * 100);

      analysis = `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-top: 10px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">📊 Analyse de la tendance</h4>
          <p style="margin: 5px 0; font-size: 12px; line-height: 1.6; color: #555;">
            La période analysée montre une <strong>${trend}</strong> de ${variation.toFixed(1)}% 
            entre le début et la fin de la période. 
            ${trend === 'hausse' ? 'Cette évolution positive indique une amélioration de la situation.' : trend === 'baisse' ? 'Cette baisse nécessite une attention particulière pour identifier les causes.' : 'La situation reste stable, ce qui peut indiquer une bonne gestion ou un besoin d\'optimisation.'}
          </p>
          <p style="margin: 5px 0; font-size: 12px; line-height: 1.6; color: #555;">
            <strong>Valeur initiale :</strong> ${formatNumber(firstValue, 0)}<br/>
            <strong>Valeur finale :</strong> ${formatNumber(lastValue, 0)}<br/>
            <strong>Variation :</strong> ${formatNumber(lastValue - firstValue, 0)} (${variation.toFixed(1)}%)
          </p>
        </div>
      `;
    }
  } else if (chartType === 'bar') {
    const datasets = data.datasets || [];
    if (datasets.length > 0 && datasets[0].data.length > 0) {
      const values = datasets[0].data;
      const maxValue = Math.max(...values);
      const minValue = Math.min(...values);
      const avgValue = values.reduce((sum: number, val: number) => sum + val, 0) / values.length;

      analysis = `
        <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-top: 10px;">
          <h4 style="margin: 0 0 10px 0; color: #333;">📊 Analyse des données</h4>
          <p style="margin: 5px 0; font-size: 12px; line-height: 1.6; color: #555;">
            Sur la période analysée, les valeurs varient entre ${formatNumber(minValue, 0)} 
            (minimum) et ${formatNumber(maxValue, 0)} (maximum), avec une moyenne de ${formatNumber(avgValue, 0)}.
            ${maxValue > avgValue * 1.5 ? 'Des pics significatifs sont observés, nécessitant une analyse approfondie.' : 'La distribution des valeurs est relativement homogène.'}
          </p>
        </div>
      `;
    }
  } else if (chartType === 'pie') {
    const total = data.reduce((sum: number, item: any) => sum + item.value, 0);
    const sortedData = [...data].sort((a, b) => b.value - a.value);
    const dominant = sortedData[0];

    analysis = `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 6px; margin-top: 10px;">
        <h4 style="margin: 0 0 10px 0; color: #333;">📊 Analyse de la répartition</h4>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.6; color: #555;">
          La catégorie <strong>"${dominant.name}"</strong> représente la part la plus importante 
          avec ${formatNumber((dominant.value / total) * 100, 1)}% du total. 
          ${sortedData.length > 1 ? `Les autres catégories représentent ${sortedData.slice(1).map((item: any) => `${item.name} (${formatNumber((item.value / total) * 100, 1)}%)`).join(', ')}.` : ''}
        </p>
        <p style="margin: 5px 0; font-size: 12px; line-height: 1.6; color: #555;">
          ${(dominant.value / total) * 100 > 50 ? 'Cette concentration importante peut indiquer une dépendance à cette catégorie, il serait judicieux de diversifier.' : 'La répartition est équilibrée, ce qui est généralement positif pour la stabilité.'}
        </p>
      </div>
    `;
  }

  return analysis;
}

