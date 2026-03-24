import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Mission Control ⭐',
  description: 'Astro Mission Control Dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" className="dark">
      <body className="font-sans min-h-screen" style={{ background: '#060608', color: '#f1f5f9' }}>
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-auto" style={{ background: '#060608' }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
