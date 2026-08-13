import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'GACIA',
    short_name: 'GACIA',
    description: 'Sistema de gestión de inventario, ventas y caja para múltiples sucursales',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#2563eb',
    icons: [
      {
        src: '/LOGO GACIA.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/LOGO GACIA.png',
        sizes: '192x192',
        type: 'image/png',
      },
    ],
  }
}