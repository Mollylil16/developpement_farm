'use client'

import { motion } from 'framer-motion'
import {
  Heart,
  Baby,
  UtensilsCrossed,
  Syringe,
  BarChart3,
  Camera,
  Cloud,
  Bell,
  ArrowUpRight,
} from 'lucide-react'

const features = [
  {
    icon: Heart,
    title: 'Module Vétérinaire',
    description:
      'Enregistrez les cas sanitaires avec photos, suivez les traitements et marquez les résolutions.',
    className: 'md:col-span-2 md:row-span-2 bg-brand-50/50',
    iconBg: 'bg-brand-600',
  },
  {
    icon: Baby,
    title: 'Suivi Gestation',
    description:
      'Suivez chaque gestation avec calcul automatique du terme (114 jours) et progression visuelle.',
    className: 'md:col-span-2 bg-success-50/50',
    iconBg: 'bg-success-600',
  },
  {
    icon: UtensilsCrossed,
    title: 'Calcul des Rations',
    description: 'Calculez les besoins alimentaires par stade avec estimation des coûts.',
    className: 'md:col-span-1',
    iconBg: 'bg-orange-500',
  },
  {
    icon: Syringe,
    title: 'Vaccination',
    description: 'Calendrier de vaccination avec rappels automatiques.',
    className: 'md:col-span-1',
    iconBg: 'bg-purple-500',
  },
  {
    icon: BarChart3,
    title: 'Tableau de Bord',
    description: 'Visualisez vos statistiques avec des graphiques clairs.',
    className: 'md:col-span-1',
    iconBg: 'bg-indigo-500',
  },
  {
    icon: Cloud,
    title: 'Cloud Sync',
    description: 'Données sauvegardées et accessibles partout.',
    className: 'md:col-span-1',
    iconBg: 'bg-blue-500',
  },
  {
    icon: Bell,
    title: 'Alertes',
    description: 'Recevez des notifications pour les événements critiques.',
    className: 'md:col-span-2 bg-gray-900 text-white',
    iconBg: 'bg-brand-500',
    dark: true,
  },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function Features() {
  return (
    <section id="features" className="py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-sm font-black text-brand-600 uppercase tracking-widest mb-4">
              Fonctionnalités Clés
            </h2>
            <h3 className="text-3xl sm:text-5xl font-extrabold text-gray-900 mb-6 tracking-tight">
              Tout ce dont vous avez besoin pour{' '}
              <span className="text-gray-400">gérer votre élevage</span>
            </h3>
          </div>
          <p className="text-lg text-gray-600 max-w-md pb-2">
            Une suite complète d'outils conçus spécialement pour répondre aux défis quotidiens des éleveurs porcins.
          </p>
        </div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={index}
                variants={itemVariants}
                whileHover={{ y: -5, transition: { duration: 0.2 } }}
                className={`group relative p-8 bento-card flex flex-col justify-between overflow-hidden ${feature.className}`}
              >
                <div>
                  <div className={`w-12 h-12 ${feature.iconBg} rounded-2xl flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h4 className={`text-xl font-bold mb-3 ${feature.dark ? 'text-white' : 'text-gray-900'}`}>{feature.title}</h4>
                  <p className={`text-base leading-relaxed ${feature.dark ? 'text-gray-400' : 'text-gray-600'}`}>{feature.description}</p>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  {/* Decorative background circle */}
                  <div className={`absolute -bottom-8 -right-8 w-32 h-32 rounded-full opacity-10 group-hover:scale-150 transition-transform duration-700 ${feature.dark ? 'bg-white' : 'bg-brand-500'}`} />

                  <span className={`text-sm font-bold flex items-center group-hover:underline cursor-pointer ${feature.dark ? 'text-brand-400' : 'text-brand-600'}`}>
                    En savoir plus
                    <ArrowUpRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
