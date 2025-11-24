/**
 * Scanner pour détecter les problèmes potentiels de rendu de texte
 * Utilise des patterns pour identifier les cas problématiques dans le code
 */

/**
 * Patterns à rechercher dans le code source qui pourraient causer des erreurs
 */
export const PROBLEMATIC_PATTERNS = [
  // Pattern 1: {variable} directement dans un View
  {
    name: 'Variable directe dans View',
    pattern: /<View[^>]*>\s*\{[a-zA-Z_][a-zA-Z0-9_]*\}\s*<\/View>/g,
    severity: 'high',
    description: 'Une variable est rendue directement dans un View sans wrapper Text',
  },
  // Pattern 2: {value || defaultValue} dans View
  {
    name: 'Expression conditionnelle dans View',
    pattern: /<View[^>]*>\s*\{[^}]*\|\|[^}]*\}\s*<\/View>/g,
    severity: 'medium',
    description: 'Expression conditionnelle rendue directement dans View',
  },
  // Pattern 3: {value ? value : null} dans View
  {
    name: 'Ternary operator dans View',
    pattern: /<View[^>]*>\s*\{[^}]*\?[^}]*:[^}]*\}\s*<\/View>/g,
    severity: 'medium',
    description: 'Opérateur ternaire rendu directement dans View',
  },
  // Pattern 4: {number} directement
  {
    name: 'Number direct dans View',
    pattern: /<View[^>]*>\s*\{[0-9]+\}\s*<\/View>/g,
    severity: 'high',
    description: 'Un nombre est rendu directement dans un View',
  },
];

/**
 * Liste des composants à vérifier en priorité
 */
export const PRIORITY_COMPONENTS = [
  'Card',
  'View',
  'TouchableOpacity',
  'ScrollView',
  'FlatList',
  'SecondaryWidget',
  'OverviewWidget',
  'ReproductionWidget',
  'FinanceWidget',
  'AlertesWidget',
  'DashboardHeader',
  'StatCard',
];

/**
 * Fonction pour analyser un fichier source et détecter les problèmes potentiels
 */
export function scanFileForTextRenderingIssues(
  fileContent: string,
  fileName: string
): Array<{
  line: number;
  pattern: string;
  severity: string;
  description: string;
}> {
  const issues: Array<{
    line: number;
    pattern: string;
    severity: string;
    description: string;
  }> = [];

  const lines = fileContent.split('\n');

  PROBLEMATIC_PATTERNS.forEach(({ name, pattern, severity, description }) => {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);

    while ((match = regex.exec(fileContent)) !== null) {
      const lineNumber = fileContent.substring(0, match.index).split('\n').length;
      const lineContent = lines[lineNumber - 1]?.trim() || '';

      // Ignorer si c'est déjà dans un <Text>
      if (!lineContent.includes('<Text>') && !lineContent.includes('</Text>')) {
        issues.push({
          line: lineNumber,
          pattern: name,
          severity,
          description,
        });
      }
    }
  });

  return issues;
}

/**
 * Fonction pour générer un rapport de scan
 */
export function generateScanReport(issues: Array<{
  fileName: string;
  issues: Array<{
    line: number;
    pattern: string;
    severity: string;
    description: string;
  }>;
}>): string {
  const highSeverity = issues.filter((f) =>
    f.issues.some((i) => i.severity === 'high')
  );
  const mediumSeverity = issues.filter((f) =>
    f.issues.some((i) => i.severity === 'medium')
  );

  let report = '📊 RAPPORT DE SCAN - TEXT RENDERING ISSUES\n\n';
  report += `Total fichiers scannés: ${issues.length}\n`;
  report += `Fichiers avec problèmes HIGH: ${highSeverity.length}\n`;
  report += `Fichiers avec problèmes MEDIUM: ${mediumSeverity.length}\n\n`;

  if (highSeverity.length > 0) {
    report += '🔴 PROBLÈMES HIGH PRIORITY:\n';
    highSeverity.forEach((file) => {
      report += `\n📁 ${file.fileName}:\n`;
      file.issues
        .filter((i) => i.severity === 'high')
        .forEach((issue) => {
          report += `  Ligne ${issue.line}: ${issue.pattern}\n`;
          report += `    → ${issue.description}\n`;
        });
    });
  }

  if (mediumSeverity.length > 0) {
    report += '\n🟡 PROBLÈMES MEDIUM PRIORITY:\n';
    mediumSeverity.forEach((file) => {
      report += `\n📁 ${file.fileName}:\n`;
      file.issues
        .filter((i) => i.severity === 'medium')
        .forEach((issue) => {
          report += `  Ligne ${issue.line}: ${issue.pattern}\n`;
          report += `    → ${issue.description}\n`;
        });
    });
  }

  return report;
}

