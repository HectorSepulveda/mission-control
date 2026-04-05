'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

function LoginForm() {
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })

      if (res.ok) {
        window.location.href = from
      } else {
        setError('Token incorrecto')
        setLoading(false)
      }
    } catch {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #0a0f0a 0%, #0d1a0d 100%)' }}>
      <div className="w-full max-w-sm px-6">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">⚡</div>
          <h1 className="text-2xl font-bold text-white">Mission Control</h1>
          <p className="text-sm text-gray-500 mt-1">Software Factory — Astro</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="card space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-400 block mb-2">
              Token de acceso
            </label>
            <input
              type="password"
              value={token}
              onChange={e => setToken(e.target.value)}
              placeholder="••••••••••••••••"
              className="w-full px-4 py-3 rounded-xl text-sm text-white bg-dark-muted border border-dark-border focus:outline-none focus:border-green-500/50 transition-colors"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="text-xs text-red-400 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !token}
            className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{
              background: loading ? 'rgba(34,197,94,0.3)' : 'rgba(34,197,94,0.15)',
              border: '1px solid rgba(34,197,94,0.4)',
              color: '#4ade80',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Verificando...' : 'Ingresar →'}
          </button>
        </form>

        <p className="text-center text-xs text-gray-700 mt-4">
          Acceso restringido — Software Factory
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
