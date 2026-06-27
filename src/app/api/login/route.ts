import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    const user = await db.user.findUnique({ where: { email } })

    if (!user || user.password !== password) {
      return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}