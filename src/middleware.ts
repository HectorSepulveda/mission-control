import { NextRequest, NextResponse } from 'next/server'

// Rutas que no requieren autenticación
const PUBLIC_PATHS = ['/api/status']

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Paths públicos — siempre permitir
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Verificar token en cookie o header
  const tokenFromCookie = req.cookies.get('mc_auth')?.value
  const tokenFromHeader = req.headers.get('x-mc-token')
  const token = tokenFromCookie || tokenFromHeader

  const validToken = process.env.MC_AUTH_TOKEN
  if (!validToken) {
    // Sin token configurado: acceso libre (modo dev)
    return NextResponse.next()
  }

  if (token === validToken) {
    return NextResponse.next()
  }

  // No autenticado → mostrar login
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Redirigir a login
  const loginUrl = req.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.searchParams.set('from', pathname)
  return NextResponse.redirect(loginUrl)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|login).*)',
  ],
}
