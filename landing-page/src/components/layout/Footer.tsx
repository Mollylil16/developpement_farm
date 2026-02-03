'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin, ArrowRight, ExternalLink } from 'lucide-react'

export default function Footer() {
  return (
    <footer id="contact" className="bg-white border-t border-gray-100 pt-24 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bento-card bg-gray-900 p-12 sm:p-16 overflow-hidden relative">
          {/* Background Decor */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/20 rounded-full blur-[100px] -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-success-600/10 rounded-full blur-[100px] -ml-32 -mb-32" />

          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">
            {/* Brand - Span 4 */}
            <div className="lg:col-span-4">
              <Link href="/" className="flex items-center space-x-3 mb-8 group">
                <div className="relative w-10 h-10 overflow-hidden rounded-xl shadow-lg border border-white/10 group-hover:scale-105 transition-transform duration-500">
                  <Image
                    src="/logo.jpeg"
                    alt="Fermier Pro Logo"
                    fill
                    className="object-cover"
                  />
                </div>
                <span className="text-xl font-black text-white tracking-tight">
                  Fermier<span className="text-brand-500">Pro</span>
                </span>
              </Link>
              <p className="text-gray-400 text-lg mb-8 leading-relaxed max-w-sm">
                La solution intelligente pour la gestion de votre élevage porcin. Conçue pour
                l'excellence et l'évolutivité.
              </p>
              <div className="flex space-x-4">
                {[Facebook, Twitter, Instagram, Youtube].map((Icon, i) => (
                  <a
                    key={i}
                    href="#"
                    className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center text-gray-400 hover:text-white transition-all duration-300 transform hover:-translate-y-1"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links - Span 2 each */}
            <div className="lg:col-span-2">
              <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Produit</h3>
              <ul className="space-y-4">
                {['Features', 'Producers', 'Testimonials', 'Download'].map((item) => (
                  <li key={item}>
                    <Link href={`#${item.toLowerCase()}`} className="text-gray-400 hover:text-white transition-colors flex items-center group">
                      <ArrowRight className="w-3 h-3 mr-2 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {item === 'Features' ? 'Fonctionnalités' : item === 'Producers' ? 'Producteurs' : item === 'Testimonials' ? 'Témoignages' : 'Télécharger'}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="lg:col-span-2">
              <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Ressources</h3>
              <ul className="space-y-4">
                {['Guide', 'Blog', 'Support'].map((item) => (
                  <li key={item}>
                    <Link href={`/${item.toLowerCase()}`} className="text-gray-400 hover:text-white transition-colors flex items-center group">
                      <ArrowRight className="w-3 h-3 mr-2 opacity-0 -ml-5 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                      {item === 'Guide' ? "Guide d'utilisation" : item}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact - Span 4 */}
            <div className="lg:col-span-4">
              <h3 className="text-white font-bold mb-6 text-sm uppercase tracking-widest">Contact</h3>
              <div className="space-y-6">
                <div className="flex items-start group cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-brand-500/50 transition-all duration-300">
                  <div className="w-10 h-10 bg-brand-500/10 rounded-xl flex items-center justify-center text-brand-500 mr-4 group-hover:bg-brand-500 group-hover:text-white transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-brand-500 font-bold uppercase tracking-wider mb-1">Email</div>
                    <a href="mailto:support@fermierpro.com" className="text-gray-200 font-medium">support@fermierpro.com</a>
                  </div>
                </div>

                <div className="flex items-start group cursor-pointer p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-success-500/50 transition-all duration-300">
                  <div className="w-10 h-10 bg-success-500/10 rounded-xl flex items-center justify-center text-success-500 mr-4 group-hover:bg-success-500 group-hover:text-white transition-colors">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-success-500 font-bold uppercase tracking-wider mb-1">Téléphone</div>
                    <a href="tel:+2250700000000" className="text-gray-200 font-medium">+225 07 00 00 00 00</a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="relative z-10 border-t border-white/10 mt-16 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-500">
            <p>© {new Date().getFullYear()} Fermier Pro. Tous droits réservés.</p>
            <div className="flex space-x-8 mt-6 md:mt-0">
              {['Confidentialité', 'Conditions', 'Cookies'].map((item) => (
                <Link key={item} href={`/${item.toLowerCase()}`} className="hover:text-white transition-colors flex items-center">
                  {item}
                  <ExternalLink className="w-3 h-3 ml-1 opacity-50" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
