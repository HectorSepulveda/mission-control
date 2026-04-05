'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useCallback } from 'react'

const navItems = [
  { href: '/', label: 'Inicio', icon: '🏠', badge: false },
  { href: '/tasks', label: 'Tareas', icon: '✅', badge: false },
  { href: '/approvals', label: 'Aprobar', icon: '📬', badge: true },
  { href: '/projects', label: 'Proyectos', icon: '📁', badge: false },
  { href: '/objectives', label: 'Objetivos', icon: '🎯', badge: false },
]

interface ApprovalsResponse {
  messages?: { id: number }[]
}

export default function BottomNav() {
  const pathname = usePathname()
  const [approvalCount, setApprovalCount] = useState(0)

  const fetchApprovals = useCallback(async () => {
    try {
      const res = await fetch('/api/approvals', { cache: 'no-store' })
      const data = await res.json() as ApprovalsResponse
      setApprovalCount(data.messages?.length ?? 0)
    } catch {
      // ignore
    }
  }, [])

  useEffect(() => {
    void fetchApprovals()
    const interval = setInterval(() => { void fetchApprovals() }, 60000)
    return () => clearInterval(interval)
  }, [fetchApprovals])

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
        const showBadge = item.badge && approvalCount > 0
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
            <span className="relative text-[20px] leading-none">
              {item.icon}
              {showBadge && (
                <span
                  className="absolute -top-1 -right-2 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                  style={{ background: '#fbbf24', color: '#0d0d10' }}
                >
                  {approvalCount > 9 ? '9+' : approvalCount}
                </span>
              )}
            </span>
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
