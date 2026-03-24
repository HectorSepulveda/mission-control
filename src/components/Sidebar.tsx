'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/', label: 'Dashboard', icon: '🏠' },
  { href: '/projects', label: 'Proyectos', icon: '📁' },
  { href: '/agents', label: 'Agentes', icon: '🤖' },
  { href: '/tasks', label: 'Tareas', icon: '✅' },
  { href: '/costs', label: 'Costos', icon: '💰' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-dark-surface border-r border-dark-border flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-dark-border">
        <div className="flex items-center gap-2">
          <span className="text-2xl">⭐</span>
          <div>
            <div className="font-bold text-white text-sm">Mission Control</div>
            <div className="text-xs text-gray-500">Astro Dashboard</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-dark-border">
        <div className="text-xs text-gray-600 text-center">
          Astro ⭐ v0.1.0
        </div>
      </div>
    </aside>
  )
}
