/**
 * Actions liées à la reproduction
 */

import { AgentActionResult, AgentContext } from '../../../types/chatAgent';
import { format, addDays, differenceInDays } from 'date-fns';
import apiClient from '../../../api/apiClient';

export class ReproductionActions {
  /**
   * Récupère les gestations en cours
   */
  static async getGestations(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    const enCours = paramsTyped.en_cours !== false; // Par défaut, on récupère les en cours

    // Récupérer les gestations depuis l'API backend
    const gestations = await apiClient.get<any[]>(`/reproduction/gestations`, {
      params: {
        projet_id: context.projetId,
        en_cours: enCours ? 'true' : undefined,
      },
    });

    if (gestations.length === 0) {
      return {
        success: true,
        message: enCours
          ? 'Aucune gestation en cours pour le moment.'
          : 'Aucune gestation enregistrée.',
        data: [],
      };
    }

    // Formater les gestations pour l'affichage
    // Note: Le backend utilise date_sautage (pas date_saillie) et nombre_porcelets_prevu (pas porcelets_prevus)
    const gestationsFormatees = gestations.map((g) => {
      const dateSautage = g.date_sautage ? new Date(g.date_sautage) : null;
      const dateMiseBasPrevue = g.date_mise_bas_prevue
        ? new Date(g.date_mise_bas_prevue)
        : dateSautage
          ? addDays(dateSautage, 114)
          : null;

      let joursRestants = null;
      if (dateMiseBasPrevue) {
        joursRestants = differenceInDays(dateMiseBasPrevue, new Date());
      }

      return {
        id: g.id,
        truie_id: g.truie_id,
        truie_nom: g.truie_nom || 'Truie inconnue',
        date_sautage: g.date_sautage,
        date_mise_bas_prevue: dateMiseBasPrevue?.toISOString().split('T')[0],
        jours_restants: joursRestants,
        statut: g.statut,
        nombre_porcelets_prevu: g.nombre_porcelets_prevu || null,
        nombre_porcelets_reel: g.nombre_porcelets_reel || null,
      };
    });

    let message = `Gestations ${enCours ? 'en cours' : ''} : ${gestations.length}\n`;
    gestationsFormatees.forEach((g) => {
      message += `\n• ${g.truie_nom}`;
      if (g.date_mise_bas_prevue) {
        message += ` - Mise bas prévue le ${format(new Date(g.date_mise_bas_prevue), 'dd/MM/yyyy')}`;
        if (g.jours_restants !== null) {
          if (g.jours_restants > 0) {
            message += ` (dans ${g.jours_restants} jour(s))`;
          } else if (g.jours_restants === 0) {
            message += ` (aujourd'hui !)`;
          } else {
            message += ` (il y a ${Math.abs(g.jours_restants)} jour(s))`;
          }
        }
      }
      if (g.nombre_porcelets_prevu) {
        message += ` - ${g.nombre_porcelets_prevu} porcelet(s) prévu(s)`;
      }
    });

    return {
      success: true,
      message,
      data: gestationsFormatees,
    };
  }

  /**
   * Récupère la gestation d'une truie spécifique
   */
  static async getGestationByTruie(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;

    // Récupérer l'ID de la truie depuis le code ou l'ID
    let truieId: string | undefined;
    const searchTerm = (paramsTyped.truie_id || paramsTyped.truie_code || paramsTyped.truie_nom || paramsTyped.search || '') as string;

    if (searchTerm) {
      // Rechercher la truie dans les animaux
      const animaux = await apiClient.get<any[]>(`/production/animaux`, {
        params: { projet_id: context.projetId },
      });

      const truie = animaux.find(
        (a) =>
          (a.code && a.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (a.nom && a.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
          a.id === searchTerm
      );

      if (truie) {
        truieId = truie.id;
      } else {
        return {
          success: false,
          message: `Je n'ai pas trouvé de truie correspondant à "${searchTerm}".`,
        };
      }
    } else {
      return {
        success: false,
        message: 'Veuillez spécifier la truie (code, nom ou ID).',
      };
    }

    // Récupérer les gestations de cette truie
    const gestations = await apiClient.get<any[]>(`/reproduction/gestations`, {
      params: {
        projet_id: context.projetId,
        en_cours: 'true',
      },
    });

    const gestation = gestations.find((g) => g.truie_id === truieId);

    if (!gestation) {
      return {
        success: true,
        message: `Aucune gestation en cours pour cette truie.`,
        data: null,
      };
    }

    const dateSaillie = gestation.date_saillie ? new Date(gestation.date_saillie) : null;
    const dateMiseBasPrevue = gestation.date_mise_bas_prevue
      ? new Date(gestation.date_mise_bas_prevue)
      : dateSaillie
        ? addDays(dateSaillie, 114)
        : null;

    let joursRestants = null;
    if (dateMiseBasPrevue) {
      joursRestants = differenceInDays(dateMiseBasPrevue, new Date());
    }

    // Le backend utilise date_sautage (pas date_saillie) et nombre_porcelets_prevu (pas porcelets_prevus)
    const dateSautage = gestation.date_sautage ? new Date(gestation.date_sautage) : null;
    const dateMiseBasPrevue = gestation.date_mise_bas_prevue
      ? new Date(gestation.date_mise_bas_prevue)
      : dateSautage
        ? addDays(dateSautage, 114)
        : null;

    let joursRestants = null;
    if (dateMiseBasPrevue) {
      joursRestants = differenceInDays(dateMiseBasPrevue, new Date());
    }

    let message = `Gestation de ${gestation.truie_nom || 'la truie'} :\n`;
    if (dateSautage) {
      message += `• Date de saillie : ${format(dateSautage, 'dd/MM/yyyy')}\n`;
    }
    if (dateMiseBasPrevue) {
      message += `• Mise bas prévue : ${format(dateMiseBasPrevue, 'dd/MM/yyyy')}`;
      if (joursRestants !== null) {
        if (joursRestants > 0) {
          message += ` (dans ${joursRestants} jour(s))`;
        } else if (joursRestants === 0) {
          message += ` (aujourd'hui !)`;
        } else {
          message += ` (il y a ${Math.abs(joursRestants)} jour(s))`;
        }
      }
      message += '\n';
    }
    if (gestation.nombre_porcelets_prevu) {
      message += `• Porcelets prévus : ${gestation.nombre_porcelets_prevu}\n`;
    }
    if (gestation.nombre_porcelets_reel) {
      message += `• Porcelets nés : ${gestation.nombre_porcelets_reel}\n`;
    }
    message += `• Statut : ${gestation.statut || 'en_cours'}`;

    return {
      success: true,
      message,
      data: {
        ...gestation,
        date_sautage: gestation.date_sautage,
        date_mise_bas_prevue: dateMiseBasPrevue?.toISOString().split('T')[0],
        jours_restants: joursRestants,
      },
    };
  }

  /**
   * Prédit la date de mise bas pour une truie
   */
  static async predictMiseBas(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    const searchTerm = (paramsTyped.truie_id || paramsTyped.truie_code || paramsTyped.truie_nom || paramsTyped.search || '') as string;

    if (!searchTerm) {
      return {
        success: false,
        message: 'Veuillez spécifier la truie (code, nom ou ID).',
      };
    }

    // Rechercher la truie
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });

    const truie = animaux.find(
      (a) =>
        (a.code && a.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (a.nom && a.nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
        a.id === searchTerm
    );

    if (!truie) {
      return {
        success: false,
        message: `Je n'ai pas trouvé de truie correspondant à "${searchTerm}".`,
      };
    }

    // Récupérer la gestation en cours
    const gestations = await apiClient.get<any[]>(`/reproduction/gestations`, {
      params: {
        projet_id: context.projetId,
        en_cours: 'true',
      },
    });

    const gestation = gestations.find((g) => g.truie_id === truie.id);

    if (!gestation) {
      return {
        success: false,
        message: `Aucune gestation en cours pour ${truie.nom || truie.code || 'cette truie'}.`,
      };
    }

    // Calculer la date de mise bas (date_sautage + 114 jours)
    // Le backend utilise date_sautage (pas date_saillie)
    const dateSautage = gestation.date_sautage ? new Date(gestation.date_sautage) : null;
    if (!dateSautage) {
      return {
        success: false,
        message: 'La date de saillie n\'est pas enregistrée pour cette gestation.',
      };
    }

    const dateMiseBasPrevue = addDays(dateSautage, 114);
    const joursRestants = differenceInDays(dateMiseBasPrevue, new Date());

    let message = `Date prévue de mise bas pour ${truie.nom || truie.code || 'la truie'} :\n`;
    message += `• ${format(dateMiseBasPrevue, 'dd/MM/yyyy')}`;
    if (joursRestants > 0) {
      message += ` (dans ${joursRestants} jour(s))`;
    } else if (joursRestants === 0) {
      message += ` (aujourd'hui !)`;
    } else {
      message += ` (il y a ${Math.abs(joursRestants)} jour(s))`;
    }

    return {
      success: true,
      message,
      data: {
        truie_id: truie.id,
        truie_nom: truie.nom || truie.code,
        date_sautage: gestation.date_sautage,
        date_mise_bas_prevue: dateMiseBasPrevue.toISOString().split('T')[0],
        jours_restants: joursRestants,
      },
    };
  }

  /**
   * Récupère les porcelets (naissances récentes)
   */
  static async getPorcelets(params: unknown, context: AgentContext): Promise<AgentActionResult> {
    const paramsTyped = params as Record<string, unknown>;
    const joursRecents = (paramsTyped.jours && typeof paramsTyped.jours === 'number' ? paramsTyped.jours : undefined) || 30;

    // Récupérer les animaux
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });

    // Filtrer les porcelets (categorie_poids === 'porcelet' ou date_naissance récente)
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - joursRecents);

    const porcelets = animaux.filter((a) => {
      if (a.categorie_poids === 'porcelet') {
        return true;
      }
      if (a.date_naissance) {
        const dateNaissance = new Date(a.date_naissance);
        return dateNaissance >= dateLimite;
      }
      return false;
    });

    if (porcelets.length === 0) {
      return {
        success: true,
        message: `Aucun porcelet trouvé dans les ${joursRecents} derniers jours.`,
        data: [],
      };
    }

    // Calculer l'âge de chaque porcelet
    const porceletsAvecAge = porcelets.map((p) => {
      let ageJours = null;
      if (p.date_naissance) {
        const dateNaissance = new Date(p.date_naissance);
        ageJours = differenceInDays(new Date(), dateNaissance);
      }

      return {
        id: p.id,
        code: p.code,
        nom: p.nom,
        date_naissance: p.date_naissance,
        age_jours: ageJours,
        poids_kg: p.poids_actuel || p.poids_kg || null,
        sexe: p.sexe,
      };
    });

    let message = `Porcelets (${joursRecents} derniers jours) : ${porcelets.length}\n`;
    porceletsAvecAge.slice(0, 10).forEach((p) => {
      message += `\n• ${p.nom || p.code || 'Porcelet'}`;
      if (p.age_jours !== null) {
        message += ` - ${p.age_jours} jour(s)`;
      }
      if (p.poids_kg) {
        message += ` - ${p.poids_kg} kg`;
      }
    });

    if (porcelets.length > 10) {
      message += `\n... et ${porcelets.length - 10} autre(s)`;
    }

    return {
      success: true,
      message,
      data: porceletsAvecAge,
    };
  }

  /**
   * Récupère les porcelets en transition (sevrage → croissance)
   * Note: Le backend ne stocke pas les IDs des porcelets dans les sevrages,
   * donc on utilise les gestations et les animaux pour identifier les porcelets récents
   */
  static async getPorceletsTransition(
    params: unknown,
    context: AgentContext
  ): Promise<AgentActionResult> {
    // Récupérer les sevrages récents
    const sevrages = await apiClient.get<any[]>(`/reproduction/sevrages`, {
      params: { projet_id: context.projetId },
    });

    // Filtrer les sevrages des 30 derniers jours
    const dateLimite = new Date();
    dateLimite.setDate(dateLimite.getDate() - 30);

    const sevragesRecents = sevrages.filter((s) => {
      if (s.date_sevrage) {
        const dateSevrage = new Date(s.date_sevrage);
        return dateSevrage >= dateLimite;
      }
      return false;
    });

    if (sevragesRecents.length === 0) {
      return {
        success: true,
        message: 'Aucun sevrage récent enregistré.',
        data: [],
      };
    }

    // Récupérer les gestations pour obtenir les truies
    const gestations = await apiClient.get<any[]>(`/reproduction/gestations`, {
      params: { projet_id: context.projetId },
    });

    // Récupérer les animaux (porcelets récents, âge 18-28 jours)
    const animaux = await apiClient.get<any[]>(`/production/animaux`, {
      params: { projet_id: context.projetId },
    });

    // Filtrer les porcelets en transition (âge 18-28 jours, catégorie porcelet)
    const porceletsTransition = animaux.filter((a) => {
      if (a.categorie_poids === 'porcelet' && a.date_naissance) {
        const dateNaissance = new Date(a.date_naissance);
        const ageJours = differenceInDays(new Date(), dateNaissance);
        return ageJours >= 18 && ageJours <= 28; // Période de sevrage
      }
      return false;
    });

    let message = `Porcelets en transition (sevrage, 18-28 jours) : ${porceletsTransition.length}\n`;
    message += `\nSevrages récents : ${sevragesRecents.length}\n`;
    sevragesRecents.slice(0, 5).forEach((s) => {
      message += `• ${format(new Date(s.date_sevrage), 'dd/MM/yyyy')} : ${s.nombre_porcelets_sevres || 0} porcelet(s) sevré(s)\n`;
    });

    message += `\nConseils pour la transition :\n`;
    message += `• Aliment de démarrage (18-20% protéines)\n`;
    message += `• Surveillance accrue de la santé\n`;
    message += `• Environnement propre et chaud\n`;
    message += `• Eau propre disponible en permanence`;

    return {
      success: true,
      message,
      data: {
        porcelets: porceletsTransition,
        sevrages: sevragesRecents,
        conseils: [
          'Aliment de démarrage (18-20% protéines)',
          'Surveillance accrue de la santé',
          'Environnement propre et chaud',
          'Eau propre disponible en permanence',
        ],
      },
    };
  }
}

