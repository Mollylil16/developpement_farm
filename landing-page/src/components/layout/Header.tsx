'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Menu, X, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-4' : 'py-6'
      }`}>
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`glass rounded-2xl px-6 py-3 flex items-center justify-between shadow-premium transition-all duration-300 ${scrolled ? 'translate-y-0' : 'translate-y-2'
          }`}>
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative w-10 h-10 overflow-hidden rounded-xl shadow-sm group-hover:shadow-md transition-all">
              <Image
                src="/logo.jpeg"
                alt="Fermier Pro Logo"
                fill
                className="object-cover"
              />
            </div>
            <span className="text-xl font-black text-gray-900 tracking-tight">
              Fermier<span className="text-brand-600">Pro</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {[
              { name: 'Fonctionnalités', href: '#features' },
              { name: 'Producteurs', href: '#producers' },
              { name: 'Témoignages', href: '#testimonials' },
              { name: 'Contact', href: '#contact' },
            ].map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-brand-600 hover:bg-brand-50/50 rounded-xl transition-all"
              >
                {item.name}
              </Link>
            ))}
            <div className="w-px h-6 bg-gray-200 mx-2" />
            <a
              href={process.env.NEXT_PUBLIC_ADMIN_URL || 'https://fermier-pro-admin.onrender.com'}
              className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Admin
            </a>
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              href="#download"
              className="inline-flex items-center px-6 py-2.5 text-sm font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-brand hover:scale-[1.02] active:scale-[0.98]"
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 rounded-xl text-gray-600 hover:text-brand-600 hover:bg-brand-50 transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden mt-4"
            >
              <div className="glass rounded-2xl p-6 shadow-premium flex flex-col space-y-2">
                {[
                  { name: 'Fonctionnalités', href: '#features' },
                  { name: 'Producteurs', href: '#producers' },
                  { name: 'Témoignages', href: '#testimonials' },
                  { name: 'Contact', href: '#contact' },
                ].map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="px-4 py-3 text-base font-semibold text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
                <a
                  href={process.env.NEXT_PUBLIC_ADMIN_URL || 'https://fermier-pro-admin.onrender.com'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-3 text-base font-semibold text-gray-600 hover:text-brand-600 hover:bg-brand-50 rounded-xl transition-all"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Admin
                </a>
                <div className="pt-4 border-t border-gray-100">
                  <Link
                    href="#download"
                    className="flex items-center justify-center w-full px-6 py-4 text-base font-bold rounded-xl text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-brand"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Download className="w-5 h-5 mr-3" />
                    Télécharger l'app
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  )
}
