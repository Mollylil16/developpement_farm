'use client'

import { Star, Quote } from 'lucide-react'
import { useState } from 'react'

const testimonials = [
  {
    id: 1,
    name: 'Kouamé Y.',
    location: 'Éleveur à Bouaké',
    rating: 5,
    text: 'Le suivi de gestation est incroyable. Je sais exactement quand chaque truie va mettre bas et je peux me préparer.',
    avatar: null,
  },
  {
    id: 2,
    name: 'Aminata K.',
    location: 'Propriétaire de ferme à Abidjan',
    rating: 5,
    text: 'Le calculateur de rations m\'aide à optimiser l\'alimentation. J\'ai une meilleure visibilité sur mes coûts.',
    avatar: null,
  },
  {
    id: 3,
    name: 'Jean-Baptiste D.',
    location: 'Éleveur à Yamoussoukro',
    rating: 5,
    text: 'L\'application est très intuitive. Je peux tout gérer depuis mon téléphone, même quand je suis dans la ferme.',
    avatar: null,
  },
]

export default function Testimonials() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextTestimonial = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length)
  }

  const prevTestimonial = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }

  const currentTestimonial = testimonials[currentIndex]

  return (
    <section id="testimonials" className="py-24 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Ce que disent nos utilisateurs
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Témoignages représentatifs des retours de nos utilisateurs
          </p>
        </div>

        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-gray-200">
            <Quote className="w-12 h-12 text-brand-500 mb-6" />
            <p className="text-lg text-gray-700 mb-6 italic">"{currentTestimonial.text}"</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-brand-600 font-semibold">
                    {currentTestimonial.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{currentTestimonial.name}</div>
                  <div className="text-sm text-gray-600">{currentTestimonial.location}</div>
                </div>
              </div>
              <div className="flex items-center">
                {[...Array(currentTestimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center mt-8 space-x-4">
            <button
              onClick={prevTestimonial}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              aria-label="Témoignage précédent"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <div className="flex space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentIndex ? 'bg-brand-500' : 'bg-gray-300'
                  }`}
                  aria-label={`Aller au témoignage ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={nextTestimonial}
              className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
              aria-label="Témoignage suivant"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
