'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const mainNav = [
  { href: '/', label: 'Dashboard', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.5"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.8"/>
    </svg>
  )},
  { href: '/projects', label: 'Proyectos', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 3.5A1.5 1.5 0 012.5 2h4l1.5 2H13.5A1.5 1.5 0 0115 5.5v7A1.5 1.5 0 0113.5 14h-11A1.5 1.5 0 011 12.5v-9z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  )},
  { href: '/agents', label: 'Agentes', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )},
  { href: '/tasks', label: 'Tareas', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )},
]

const systemNav = [
  { href: '/costs', label: 'Costos IA', icon: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M8 4.5v7M6 6.5h3a1 1 0 010 2H7a1 1 0 000 2h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  )},
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-[220px] flex-shrink-0 flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.015)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, rgba(26,107,60,0.4), rgba(230,126,34,0.2))' }}
          >
            ⭐
          </div>
          <div>
            <div
              className="font-bold text-sm"
              style={{
                background: 'linear-gradient(135deg, #22c55e, #34d399 50%, #fb923c)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              Mission Control
            </div>
            <div className="text-xs" style={{ color: '#475569' }}>Astro Dashboard</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {/* MAIN section */}
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-2 pb-1.5" style={{ color: '#334155' }}>
          Main
        </p>
        {mainNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* SISTEMA section */}
        <p className="text-[10px] font-semibold uppercase tracking-widest px-3 pt-4 pb-1.5" style={{ color: '#334155' }}>
          Sistema
        </p>
        {systemNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${isActive ? 'active' : ''}`}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer — Astro avatar */}
      <div className="p-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.025)' }}
        >
          <div className="relative flex-shrink-0">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold"
              style={{ background: 'linear-gradient(135deg, #1A6B3C, #22c55e)' }}
            >
              A
            </div>
            {/* Status dot */}
            <span
              className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 dot-pulse"
              style={{ background: '#22c55e', borderColor: 'var(--surface)' }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>Astro ⭐</p>
            <p className="text-[10px]" style={{ color: '#22c55e' }}>Online</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
