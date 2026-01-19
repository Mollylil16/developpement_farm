/**
 * Utilitaires pour l'export de données (CSV, PDF)
 */

/**
 * Exporte des données en CSV
 */
export function exportToCSV(data: any[], filename: string = 'export.csv') {
  if (!data || data.length === 0) {
    alert('Aucune donnée à exporter')
    return
  }

  // Obtenir les en-têtes depuis les clés du premier objet
  const headers = Object.keys(data[0])

  // Créer les lignes CSV
  const csvRows = [
    // En-têtes
    headers.join(','),
    // Données
    ...data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          // Gérer les valeurs avec virgules, guillemets ou sauts de ligne
          if (value === null || value === undefined) return ''
          const stringValue = String(value)
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`
          }
          return stringValue
        })
        .join(',')
    ),
  ]

  // Créer le contenu CSV
  const csvContent = csvRows.join('\n')

  // Créer le blob et télécharger
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Exporte des données en PDF (utilise window.print() pour l'instant)
 * Pour une vraie génération PDF, il faudrait utiliser une bibliothèque comme jsPDF
 */
export function exportToPDF(elementId: string, filename: string = 'export.pdf') {
  const element = document.getElementById(elementId)
  if (!element) {
    alert('Élément non trouvé pour l\'export PDF')
    return
  }

  // Créer une nouvelle fenêtre avec le contenu
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez les bloqueurs de popup.')
    return
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>${filename}</title>
        <style>
          body { font-family: 'Outfit', 'Inter', sans-serif; margin: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; font-weight: 600; }
          @media print {
            body { margin: 0; }
            @page { margin: 1cm; }
          }
        </style>
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.focus()
  
  // Attendre que le contenu soit chargé avant d'imprimer
  setTimeout(() => {
    printWindow.print()
  }, 250)
}

/**
 * Formate les données pour l'export CSV avec des colonnes personnalisées
 */
export function formatDataForExport(
  data: any[],
  columnMapping: Record<string, string>
): any[] {
  return data.map((row) => {
    const formattedRow: any = {}
    Object.entries(columnMapping).forEach(([key, label]) => {
      formattedRow[label] = row[key] || ''
    })
    return formattedRow
  })
}
