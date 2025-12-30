/**
 * Extracteur de paramètres amélioré pour Kouakou
 * Améliore l'extraction de paramètres avec contexte conversationnel et validation
 */

import { ParameterExtractor, ExtractedParams, ExtractionContext } from './ParameterExtractor';
import { DateExtractor } from './extractors/DateExtractor';
import { MontantExtractor } from './extractors/MontantExtractor';
import { CategoryNormalizer } from './extractors/CategoryNormalizer';

export class EnhancedParameterExtractor extends ParameterExtractor {
  /**
   * Extrait tous les paramètres avec améliorations contextuelles
   */
  extractAllEnhanced(text: string, actionType?: string): ExtractedParams {
    const params = this.extractAll(text);
    
    // Améliorations selon le type d'action
    if (actionType) {
      switch (actionType) {
        case 'create_visite_veterinaire':
          return this.enhanceVisiteVeterinaireParams(params, text);
        case 'create_depense':
          return this.enhanceDepenseParams(params, text);
        case 'create_revenu':
          return this.enhanceRevenuParams(params, text);
        case 'create_vaccination':
          return this.enhanceVaccinationParams(params, text);
        case 'create_pesee':
          return this.enhancePeseeParams(params, text);
        default:
          return params;
      }
    }
    
    return params;
  }

  /**
   * Améliore l'extraction pour les visites vétérinaires
   */
  private enhanceVisiteVeterinaireParams(params: ExtractedParams, text: string): ExtractedParams {
    const normalized = text.toLowerCase();
    
    // Extraire le nom du vétérinaire
    if (!params.veterinaire) {
      // Patterns: "Dr. Traoré", "vétérinaire Traoré", "veto Kouassi"
      const vetPatterns = [
        /(?:dr\.?|docteur|veterinaire|veto|vet|toubib)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /(?:appeler|contacter|voir|consulter)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
        /avec\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
      ];
      
      for (const pattern of vetPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          params.veterinaire = match[1].trim();
          break;
        }
      }
    }

    // Extraire le motif/raison de la visite
    if (!params.motif) {
      const motifPatterns = [
        /(?:pour|motif|raison|cause|problème|souci)[:\s]+(.+?)(?:\.|,|$)/i,
        /(?:visite|consultation|rdv)\s+(?:pour|à cause de|en raison de)\s+(.+?)(?:\.|,|$)/i,
        /(?:les porcs|les animaux|mes porcs)\s+(?:ont|sont|souffrent de)\s+(.+?)(?:\.|,|$)/i,
      ];
      
      for (const pattern of motifPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          params.motif = match[1].trim();
          break;
        }
      }

      // Si pas de motif explicite, chercher des indices de problèmes
      if (!params.motif) {
        const problemIndicators = [
          'malade', 'maladie', 'fièvre', 'diarrhée', 'toux', 'respiration',
          'blessure', 'blessé', 'plaie', 'vaccination', 'examen', 'contrôle',
          'consultation', 'bilan', 'visite de routine',
        ];
        
        for (const indicator of problemIndicators) {
          if (normalized.includes(indicator)) {
            params.motif = indicator;
            break;
          }
        }
      }
    }

    // Extraire la date de visite (avec contextes spécifiques aux rendez-vous)
    if (!params.date_visite) {
      const dateContext = text.match(/(?:rdv|rendez[- ]vous|visite|consultation)[\s\S]*?(\d{1,2}[\/\-]\d{1,2}(?:\/\d{2,4})?|[a-z]+)/i);
      if (dateContext) {
        const dateStr = DateExtractor.extract(dateContext[1] || text);
        if (dateStr) {
          params.date_visite = dateStr;
        }
      } else {
        // Par défaut pour rendez-vous futur
        if (normalized.includes('prendre') || normalized.includes('fixer') || normalized.includes('planifier')) {
          // Rendez-vous futur → demain par défaut
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          params.date_visite = tomorrow.toISOString().split('T')[0];
        } else if (normalized.includes('aujourd') || normalized.includes('maintenant')) {
          params.date_visite = new Date().toISOString().split('T')[0];
        }
      }
    }

    return params;
  }

  /**
   * Améliore l'extraction pour les dépenses
   * Utilise le contexte conversationnel pour enrichir les paramètres
   */
  private enhanceDepenseParams(params: ExtractedParams, text: string): ExtractedParams {
    // Chercher le libellé/description dans le contexte
    if (!params.libelle && !params.commentaire) {
      // Patterns: "dépense pour X", "acheté X", "payé X"
      const libellePatterns = [
        /(?:depense|achete|paye|payé|dépense)\s+(?:pour|de)?\s+(.+?)(?:\.|,|\spour|\sà|\sde|\sdu|\sà\s)/i,
        /(?:achete|paye|payé)\s+(.+?)(?:\.|,|\sà|\spour|\sde)/i,
      ];
      
      for (const pattern of libellePatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          const libelle = match[1].trim();
          // Ne pas prendre si c'est juste un montant
          if (!/^\d+[\s,.]*\d*\s*(fcfa|francs?|f)?$/i.test(libelle)) {
            params.commentaire = libelle;
            break;
          }
        }
      }
    }

    // Utiliser le contexte conversationnel pour enrichir les paramètres manquants
    if (!params.montant && this.context.lastMontant) {
      // Si pas de montant explicite mais qu'un montant a été mentionné récemment
      // Utiliser le montant du contexte seulement si le message le suggère ("pour ça", "même montant")
      const normalized = text.toLowerCase();
      if (normalized.match(/\b(?:pour\s+ca|pour\s+cela|meme\s+montant|meme\s+prix|le\s+meme)\b/i)) {
        params.montant = this.context.lastMontant;
      }
    }

    if (!params.categorie && this.context.lastCategorie) {
      const normalized = text.toLowerCase();
      if (normalized.match(/\b(?:pour\s+ca|pour\s+cela|meme|le\s+meme|la\s+meme)\b/i)) {
        params.categorie = this.context.lastCategorie;
      }
    }

    return params;
  }

  /**
   * Améliore l'extraction pour les revenus (ventes)
   */
  private enhanceRevenuParams(params: ExtractedParams, text: string): ExtractedParams {
    // Chercher l'acheteur dans le contexte
    if (!params.acheteur) {
      const acheteurPatterns = [
        /(?:vendu|vente|vendre)\s+(?:à|pour|chez)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        /(?:acheteur|client|achete)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:a\s+achete|a\s+pris)/i,
      ];
      
      for (const pattern of acheteurPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          params.acheteur = match[1].trim();
          break;
        }
      }

      // Chercher dans l'historique conversationnel
      if (!params.acheteur && this.context.recentTransactions) {
        const lastTransaction = this.context.recentTransactions[this.context.recentTransactions.length - 1];
        if (lastTransaction?.acheteur) {
          params.acheteur = lastTransaction.acheteur;
        }
      }
      
      // Utiliser le dernier acheteur du contexte si mention implicite
      if (!params.acheteur && this.context.lastAcheteur) {
        const normalized = text.toLowerCase();
        if (normalized.match(/\b(?:pour\s+ca|pour\s+cela|meme|le\s+meme|la\s+meme|au\s+meme)\b/i)) {
          params.acheteur = this.context.lastAcheteur;
        }
      }
    }

    // Utiliser le dernier montant du contexte si mention implicite
    if (!params.montant && this.context.lastMontant) {
      const normalized = text.toLowerCase();
      if (normalized.match(/\b(?:pour\s+ca|pour\s+cela|meme\s+montant|meme\s+prix|le\s+meme)\b/i)) {
        params.montant = this.context.lastMontant;
      }
    }

    return params;
  }

  /**
   * Améliore l'extraction pour les vaccinations
   */
  private enhanceVaccinationParams(params: ExtractedParams, text: string): ExtractedParams {
    // Extraire le type de vaccin
    if (!params.vaccin && !params.nom_vaccin) {
      const vaccinPatterns = [
        /(?:vaccin|vaccination|vacciner)\s+(?:contre|de|pour)\s+([a-z]+(?:\s+[a-z]+)?)/i,
        /(?:vaccin|vaccination)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      ];
      
      for (const pattern of vaccinPatterns) {
        const match = text.match(pattern);
        if (match && match[1]) {
          params.vaccin = match[1].trim();
          break;
        }
      }

      // Types de vaccins courants
      const vaccinsCourants = [
        'rouget', 'mycoplasme', 'peste', 'circovirus', 'parvovirose',
        'leptospirose', 'prrs', 'fer', 'vermifuge',
      ];
      
      const normalized = text.toLowerCase();
      for (const vaccin of vaccinsCourants) {
        if (normalized.includes(vaccin)) {
          params.vaccin = vaccin;
          break;
        }
      }
    }

    return params;
  }

  /**
   * Améliore l'extraction pour les pesées
   */
  private enhancePeseeParams(params: ExtractedParams, text: string): ExtractedParams {
    // Si pas de code animal mais qu'on parle d'une loge en mode batch
    if (!params.animal_code && !params.animal_id) {
      const logePattern = /(?:loge|bande|pen)[:\s]+([A-Z0-9]+)/i;
      const match = text.match(logePattern);
      if (match && match[1]) {
        params.batch_id = match[1].trim();
      }
    }

    return params;
  }

  /**
   * Vérifie si les paramètres requis sont présents
   */
  static checkRequiredParams(params: ExtractedParams, actionType: string): {
    missing: string[];
    valid: boolean;
  } {
    const required: Record<string, string[]> = {
      create_depense: ['montant'],
      create_revenu: ['montant'],
      create_pesee: ['poids_kg'],
      create_visite_veterinaire: [], // Tous optionnels mais recommandés
      create_vaccination: [], // Optionnel mais recommandé: animal_code ou animal_id
    };

    const requiredFields = required[actionType] || [];
    const missing: string[] = [];

    for (const field of requiredFields) {
      if (params[field] === undefined || params[field] === null || params[field] === '') {
        missing.push(field);
      }
    }

    return {
      missing,
      valid: missing.length === 0,
    };
  }

  /**
   * Génère un message de clarification pour les paramètres manquants
   */
  static generateClarificationMessage(missingParams: string[], actionType: string): string {
    const fieldLabels: Record<string, string> = {
      montant: 'le montant',
      poids_kg: 'le poids',
      animal_code: "le code de l'animal",
      animal_id: "l'ID de l'animal",
      date: 'la date',
      categorie: 'la catégorie',
      acheteur: "le nom de l'acheteur",
      veterinaire: 'le nom du vétérinaire',
      motif: 'le motif de la visite',
    };

    const missingLabels = missingParams.map(p => fieldLabels[p] || p);

    if (missingLabels.length === 0) {
      return '';
    }

    const actionMessages: Record<string, string> = {
      create_depense: `Pour enregistrer cette dépense, j'ai besoin de ${missingLabels.join(', ')}.`,
      create_revenu: `Pour enregistrer cette vente, j'ai besoin de ${missingLabels.join(', ')}.`,
      create_pesee: `Pour enregistrer cette pesée, j'ai besoin de ${missingLabels.join(', ')}.`,
      create_visite_veterinaire: `Pour enregistrer ce rendez-vous, peux-tu me donner ${missingLabels.join(', ')} ?`,
      create_vaccination: `Pour enregistrer cette vaccination, j'ai besoin de ${missingLabels.join(', ')}.`,
    };

    return actionMessages[actionType] || `J'ai besoin de ${missingLabels.join(', ')}.`;
  }
}

