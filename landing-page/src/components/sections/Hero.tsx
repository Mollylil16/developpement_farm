'use client'

import { motion } from 'framer-motion'
import { Download, ArrowRight, Smartphone, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden bg-gradient-to-br from-brand-50 via-white to-brand-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-100 text-brand-700 text-sm font-medium mb-6">
              <Sparkles className="w-4 h-4 mr-2" />
              Application de gestion d'élevage porcin
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 mb-6">
              Gérez votre{' '}
              <span className="text-brand-500">élevage en toute simplicité</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl">
              Suivi sanitaire, gestion des reproductions, calcul des rations alimentaires et
              marketplace - tout en une seule application simple et intuitive.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link
                href="#download"
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-brand-500 hover:bg-brand-600 transition-colors shadow-lg shadow-brand-500/25"
              >
                <Download className="w-5 h-5 mr-2" />
                Télécharger l'application
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Découvrir les fonctionnalités
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
              <div>
                <div className="text-2xl font-bold text-gray-900">100%</div>
                <div className="text-sm text-gray-600">Sécurisé</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">5min</div>
                <div className="text-sm text-gray-600">Prise en main</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">Gratuit</div>
                <div className="text-sm text-gray-600">Au démarrage</div>
              </div>
            </div>
          </motion.div>

          {/* Image/Illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative aspect-square max-w-lg mx-auto">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-400 to-brand-600 rounded-3xl transform rotate-6"></div>
              <div className="relative bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                <div className="aspect-square bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl flex items-center justify-center">
                  <Smartphone className="w-32 h-32 text-brand-500" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
