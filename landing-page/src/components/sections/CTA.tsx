'use client'

import { Download, Check } from 'lucide-react'
import Link from 'next/link'

export default function CTA() {
  return (
    <section id="download" className="py-24 bg-gradient-to-br from-brand-500 to-brand-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Prêt à mieux gérer votre élevage ?
          </h2>
          <p className="text-lg text-brand-100 mb-8 max-w-2xl mx-auto">
            Rejoignez les éleveurs qui utilisent Fermier Pro pour suivre leur cheptel, gérer les
            gestations et optimiser l'alimentation.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 max-w-4xl mx-auto">
            {[
              'Inscription gratuite',
              'Aucune carte bancaire',
              'Données 100% sécurisées',
              'Fonctionne sur mobile',
            ].map((feature, index) => (
              <div key={index} className="flex items-center text-white">
                <Check className="w-5 h-5 mr-2 flex-shrink-0" />
                <span className="text-sm">{feature}</span>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://play.google.com/store/apps/details?id=com.farmtrackpro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-brand-600 bg-white hover:bg-gray-50 transition-colors shadow-lg"
            >
              <Download className="w-5 h-5 mr-2" />
              Télécharger sur Play Store
            </a>
            <a
              href="https://apps.apple.com/app/farmtrackpro"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-base font-medium rounded-lg text-white bg-transparent hover:bg-white/10 transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              Télécharger sur App Store
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
