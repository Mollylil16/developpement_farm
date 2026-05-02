import type { Metadata } from 'next'
import { Outfit, Inter } from 'next/font/google'
import './globals.css'

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-outfit',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Fermier Pro - Gestion Intelligente de votre Élevage Porcin',
  description: 'Application complète pour gérer votre élevage porcin : suivi sanitaire, reproduction, nutrition, et marketplace. Téléchargez l\'app maintenant !',
  keywords: 'élevage porcin, gestion ferme, porcs, Côte d\'Ivoire, agriculture, vétérinaire',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fr" className={`${outfit.variable} ${inter.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  )
}
