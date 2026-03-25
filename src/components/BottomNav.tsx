'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Inicio', icon: '🏠' },
  { href: '/flow', label: 'Flow', icon: '🔀' },
  { href: '/tasks', label: 'Tareas', icon: '✅' },
  { href: '/projects', label: 'Proyectos', icon: '📁' },
  { href: '/objectives', label: 'Objetivos', icon: '🎯' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex md:hidden"
      style={{
        background: 'rgba(6,6,8,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        height: 'calc(56px + env(safe-area-inset-bottom))',
      }}
    >
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all relative"
            style={{ color: isActive ? '#22c55e' : '#475569' }}
          >
            {/* Active top accent */}
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 rounded-b-full"
                style={{
                  width: '32px',
                  height: '2px',
                  background: 'linear-gradient(90deg, #1A6B3C, #22c55e)',
                }}
              />
            )}
            <span className="text-[20px] leading-none">{item.icon}</span>
            <span
              className="text-[9px] font-semibold leading-none tracking-wide"
              style={{ color: isActive ? '#22c55e' : '#64748b' }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
