'use client'

import {
  Heart,
  Baby,
  UtensilsCrossed,
  Syringe,
  BarChart3,
  Camera,
  Cloud,
  Bell,
} from 'lucide-react'

const features = [
  {
    icon: Heart,
    title: 'Module Vétérinaire',
    description:
      'Enregistrez les cas sanitaires avec photos, suivez les traitements et marquez les résolutions.',
  },
  {
    icon: Baby,
    title: 'Suivi Gestation',
    description:
      'Suivez chaque gestation avec calcul automatique du terme (114 jours) et progression visuelle.',
  },
  {
    icon: UtensilsCrossed,
    title: 'Calcul des Rations',
    description:
      'Calculez les besoins alimentaires par catégorie et stade avec estimation des coûts en FCFA.',
  },
  {
    icon: Syringe,
    title: 'Vaccination',
    description: 'Gérez le calendrier de vaccination de tous vos animaux avec rappels automatiques.',
  },
  {
    icon: BarChart3,
    title: 'Tableau de Bord',
    description:
      'Visualisez vos statistiques d\'élevage avec des graphiques clairs et des alertes.',
  },
  {
    icon: Camera,
    title: 'Capture Photo',
    description:
      'Documentez vos animaux et cas sanitaires avec des photos depuis votre téléphone.',
  },
  {
    icon: Cloud,
    title: 'Synchronisation Cloud',
    description:
      'Vos données sont sauvegardées automatiquement et accessibles sur tous vos appareils.',
  },
  {
    icon: Bell,
    title: 'Alertes Intégrées',
    description:
      'Recevez des alertes dans l\'app pour les mise-bas proches et cas sanitaires urgents.',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Tout ce dont vous avez besoin pour gérer votre élevage
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Une suite complète d'outils conçus spécialement pour les éleveurs porcins
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="p-6 bg-white rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-brand-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-600">{feature.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
