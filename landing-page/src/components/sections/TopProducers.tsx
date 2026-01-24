'use client'

import { useEffect, useState } from 'react'
import { MapPin, Phone, Users, Star, Download } from 'lucide-react'
import { publicApi } from '@/lib/api'
import { motion } from 'framer-motion'

interface Producer {
  id: string
  nom: string
  prenom: string
  localisation?: string
  telephone?: string
  total_animals: number
  rating?: number
  photo?: string
}

export default function TopProducers() {
  const [producers, setProducers] = useState<Producer[]>([])
  const [loading, setLoading] = useState(true)
  const [showDownloadModal, setShowDownloadModal] = useState(false)

  useEffect(() => {
    publicApi
      .getTopProducers()
      .then((data) => {
        setProducers(data.producers || [])
        setLoading(false)
      })
      .catch((error) => {
        console.error('Erreur lors du chargement des producteurs:', error)
        setLoading(false)
      })
  }, [])

  const handleContactClick = () => {
    setShowDownloadModal(true)
  }

  return (
    <>
      <section id="producers" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Nos Meilleurs Producteurs
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Découvrez les éleveurs les plus actifs de notre plateforme et contactez-les
              directement via l'application
            </p>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
              <p className="mt-4 text-gray-600">Chargement des producteurs...</p>
            </div>
          ) : producers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Aucun producteur disponible pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {producers.map((producer, index) => (
                <motion.div
                  key={producer.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl border border-gray-200 hover:border-brand-300 hover:shadow-lg transition-all overflow-hidden"
                >
                  {/* Photo ou placeholder */}
                  <div className="aspect-video bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center">
                    {producer.photo ? (
                      <img
                        src={producer.photo}
                        alt={`${producer.prenom} ${producer.nom}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Users className="w-16 h-16 text-brand-500" />
                    )}
                  </div>

                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {producer.prenom} {producer.nom}
                        </h3>
                        {producer.localisation && (
                          <div className="flex items-center text-sm text-gray-600 mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            {producer.localisation}
                          </div>
                        )}
                      </div>
                      {producer.rating && (
                        <div className="flex items-center">
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                          <span className="ml-1 text-sm font-medium text-gray-900">
                            {producer.rating.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center text-sm text-gray-600 mb-4">
                      <Users className="w-4 h-4 mr-2" />
                      <span>{producer.total_animals} animaux</span>
                    </div>

                    <button
                      onClick={handleContactClick}
                      className="w-full px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors font-medium"
                    >
                      Contacter ce producteur
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Modal de téléchargement */}
      {showDownloadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-8 max-w-md w-full"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Téléchargez l'application
            </h3>
            <p className="text-gray-600 mb-6">
              Pour contacter ce producteur, vous devez d'abord télécharger l'application
              Fermier Pro sur votre téléphone.
            </p>
            <div className="space-y-3">
              <a
                href="https://play.google.com/store/apps/details?id=com.farmtrackpro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Télécharger sur Play Store
              </a>
              <a
                href="https://apps.apple.com/app/farmtrackpro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-full px-4 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Download className="w-5 h-5 mr-2" />
                Télécharger sur App Store
              </a>
            </div>
            <button
              onClick={() => setShowDownloadModal(false)}
              className="mt-4 w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Fermer
            </button>
          </motion.div>
        </div>
      )}
    </>
  )
}
