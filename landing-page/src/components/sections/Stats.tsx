'use client'

import { Shield, Clock, Smartphone, Gift } from 'lucide-react'
import { useEffect, useState } from 'react'
import { publicApi } from '@/lib/api'

interface StatsData {
  total_producers: number
  total_animals: number
  total_transactions: number
  regions_covered: number
}

export default function Stats() {
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    publicApi
      .getStats()
      .then((data) => setStats(data))
      .catch(() => {
        // Fallback stats si l'API n'est pas disponible
        setStats({
          total_producers: 0,
          total_animals: 0,
          total_transactions: 0,
          regions_covered: 0,
        })
      })
  }, [])

  const statItems = [
    {
      icon: Shield,
      value: stats?.total_producers || '0',
      label: 'Éleveurs inscrits',
      color: 'text-brand-500',
    },
    {
      icon: Smartphone,
      value: stats?.total_animals || '0',
      label: 'Animaux suivis',
      color: 'text-green-500',
    },
    {
      icon: Gift,
      value: stats?.total_transactions || '0',
      label: 'Transactions',
      color: 'text-purple-500',
    },
    {
      icon: Clock,
      value: stats?.regions_covered || '0',
      label: 'Régions couvertes',
      color: 'text-orange-500',
    },
  ]

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {statItems.map((item, index) => {
            const Icon = item.icon
            return (
              <div
                key={index}
                className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
              >
                <Icon className={`w-8 h-8 ${item.color} mx-auto mb-4`} />
                <div className="text-3xl font-bold text-gray-900 mb-2">{item.value}</div>
                <div className="text-sm text-gray-600">{item.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
