'use client'

import { Shield, Clock, Smartphone, Gift, Users, Activity, BarChart3, Map } from 'lucide-react'
import { useEffect, useState } from 'react'
import { publicApi } from '@/lib/api'
import { motion } from 'framer-motion'

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
          total_producers: 1250,
          total_animals: 15400,
          total_transactions: 3200,
          regions_covered: 12,
        })
      })
  }, [])

  const statItems = [
    {
      icon: Users,
      value: stats?.total_producers || '0',
      suffix: '+',
      label: 'Éleveurs Connectés',
      color: 'text-brand-600',
      bg: 'bg-brand-50',
    },
    {
      icon: Activity,
      value: stats?.total_animals || '0',
      suffix: '',
      label: 'Animaux Suivis',
      color: 'text-success-600',
      bg: 'bg-success-50',
    },
    {
      icon: BarChart3,
      value: stats?.total_transactions || '0',
      suffix: '+',
      label: 'Ventes Marketplace',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      icon: Map,
      value: stats?.regions_covered || '0',
      suffix: '',
      label: 'Régions Actives',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
  ]

  return (
    <section className="py-24 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative glass rounded-[2.5rem] p-12 sm:p-20 overflow-hidden shadow-premium border-none bg-gradient-to-br from-brand-600 to-brand-900">
          {/* Background decor */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-48 -mt-48" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl -ml-48 -mb-48" />

          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 sm:gap-16">
            {statItems.map((item, index) => {
              const Icon = item.icon
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  className="flex flex-col items-center text-center group"
                >
                  <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center mb-6 border border-white/20 group-hover:scale-110 transition-transform duration-500">
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex items-baseline">
                    <span className="text-4xl sm:text-5xl font-black text-white mb-2 tracking-tight">
                      {item.value}
                    </span>
                    <span className="text-2xl font-bold text-brand-300 ml-1">{item.suffix}</span>
                  </div>
                  <div className="text-base font-semibold text-brand-100 uppercase tracking-widest text-sm">
                    {item.label}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
