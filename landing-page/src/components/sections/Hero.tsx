'use client'

import { motion } from 'framer-motion'
import { Download, ArrowRight, Sparkles, Shield, Zap, Gift } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function Hero() {
  return (
    <section className="relative pt-32 pb-20 overflow-hidden bg-white">
      {/* Background Decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-100/50 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-success-50/50 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">

          {/* Main Content (Bento Large) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 flex flex-col justify-center p-8 sm:p-12 bento-card bg-gradient-to-br from-white to-brand-50/30"
          >
            <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-brand-100 text-brand-700 text-sm font-semibold mb-8 w-fit shadow-sm">
              <Sparkles className="w-4 h-4 mr-2 text-brand-500" />
              L'avenir de l'élevage porcin
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight mb-8 leading-[1.1]">
              Gérez votre{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-400">
                élevage avec brio
              </span>
            </h1>

            <p className="text-xl text-gray-600 mb-10 max-w-xl leading-relaxed">
              Suivi sanitaire, reproduction, nutrition et marketplace.
              Une solution tout-en-un pour les éleveurs modernes et ambitieux.
            </p>

            <div className="flex flex-col sm:flex-row gap-5 mb-12">
              <Link
                href="#download"
                className="group inline-flex items-center justify-center px-8 py-4 text-lg font-bold rounded-2xl text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-brand hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="w-5 h-5 mr-2 group-hover:animate-bounce" />
                Démarrer maintenant
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="#features"
                className="inline-flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-2xl text-gray-700 bg-white border border-gray-100 hover:bg-gray-50 transition-all shadow-sm hover:shadow-md"
              >
                Voir les fonctions
              </Link>
            </div>

            {/* Premium Stats Row */}
            <div className="grid grid-cols-3 gap-8 pt-10 border-t border-gray-100/80">
              <div className="group cursor-default">
                <div className="flex items-center text-brand-600 mb-1">
                  <Shield className="w-4 h-4 mr-2" />
                  <span className="text-2xl font-black text-gray-900">100%</span>
                </div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Sécurisé</div>
              </div>
              <div className="group cursor-default">
                <div className="flex items-center text-brand-600 mb-1">
                  <Zap className="w-4 h-4 mr-2 text-yellow-500" />
                  <span className="text-2xl font-black text-gray-900">5min</span>
                </div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Configuration</div>
              </div>
              <div className="group cursor-default">
                <div className="flex items-center text-brand-600 mb-1">
                  <Gift className="w-4 h-4 mr-2 text-pink-500" />
                  <span className="text-2xl font-black text-gray-900 text-transparent bg-clip-text bg-gradient-to-r from-success-600 to-brand-500">Gratuit</span>
                </div>
                <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">Version Découverte</div>
              </div>
            </div>
          </motion.div>

          {/* Image (Bento Side) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="lg:col-span-5 relative group"
          >
            <div className="h-full bento-card overflow-hidden bg-gradient-to-b from-brand-50 to-white flex items-center justify-center p-8 sm:p-12 border-none">
              <div className="relative w-full aspect-[4/5] max-w-sm">
                {/* Visual Depth Elements */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-brand-500/10 rounded-full blur-[80px] group-hover:bg-brand-500/20 transition-colors duration-700" />
                <Image
                  src="/app-mockup.png"
                  alt="Application Fermier Pro"
                  fill
                  className="object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)] group-hover:scale-[1.05] transition-transform duration-700 pointer-events-none"
                  priority
                />
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}
