'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center space-x-2 mb-4">
              <Image
                src="/logo.jpeg"
                alt="Fermier Pro Logo"
                width={32}
                height={32}
                className="rounded-lg object-contain"
              />
              <span className="text-xl font-bold text-white">Fermier Pro</span>
            </Link>
            <p className="text-sm mb-4">
              La solution intelligente pour la gestion de votre élevage porcin. Conçue pour
              l'Afrique.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com/fermierpro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/fermierpro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://instagram.com/fermierpro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://youtube.com/fermierpro"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
              >
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Produit */}
          <div>
            <h3 className="text-white font-semibold mb-4">Produit</h3>
            <ul className="space-y-2">
              <li>
                <Link href="#features" className="hover:text-white transition-colors text-sm">
                  Fonctionnalités
                </Link>
              </li>
              <li>
                <Link href="#producers" className="hover:text-white transition-colors text-sm">
                  Producteurs
                </Link>
              </li>
              <li>
                <Link href="#testimonials" className="hover:text-white transition-colors text-sm">
                  Témoignages
                </Link>
              </li>
              <li>
                <Link href="#download" className="hover:text-white transition-colors text-sm">
                  Télécharger
                </Link>
              </li>
            </ul>
          </div>

          {/* Ressources */}
          <div>
            <h3 className="text-white font-semibold mb-4">Ressources</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/guide" className="hover:text-white transition-colors text-sm">
                  Guide d'utilisation
                </Link>
              </li>
              <li>
                <Link href="/blog" className="hover:text-white transition-colors text-sm">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-white transition-colors text-sm">
                  Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                <span className="text-sm">Abidjan, Côte d'Ivoire</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-5 h-5 mr-2 flex-shrink-0" />
                <a href="tel:+2250700000000" className="text-sm hover:text-white transition-colors">
                  +225 07 00 00 00 00
                </a>
              </li>
              <li className="flex items-center">
                <Mail className="w-5 h-5 mr-2 flex-shrink-0" />
                <a
                  href="mailto:support@fermierpro.com"
                  className="text-sm hover:text-white transition-colors"
                >
                  support@fermierpro.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm">
            © {new Date().getFullYear()} Fermier Pro. Tous droits réservés.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-sm hover:text-white transition-colors">
              Confidentialité
            </Link>
            <Link href="/terms" className="text-sm hover:text-white transition-colors">
              Conditions
            </Link>
            <Link href="/cookies" className="text-sm hover:text-white transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
