import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/providers'

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'GACIA',
    template: '%s | GACIA',
  },
  description: 'Sistema de gestión de inventario, ventas y caja para múltiples sucursales',
  applicationName: 'GACIA',
  manifest: '/manifest.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'es_BO',
    siteName: 'GACIA',
    title: 'GACIA',
    description: 'Sistema de gestión de inventario, ventas y caja para múltiples sucursales',
    images: [
      {
        url: '/LOGO GACIA.png',
        width: 1024,
        height: 1024,
        alt: 'GACIA',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GACIA',
    description: 'Sistema de gestión de inventario, ventas y caja para múltiples sucursales',
    images: ['/LOGO GACIA.png'],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
