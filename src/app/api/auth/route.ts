import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    const validToken = process.env.MC_AUTH_TOKEN

    if (!validToken || token !== validToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const res = NextResponse.json({ ok: true })
    res.cookies.set('mc_auth', token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 días
      path: '/',
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.delete('mc_auth')
  return res
}
