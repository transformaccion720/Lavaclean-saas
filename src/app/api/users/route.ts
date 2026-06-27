import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, email: true, role: true, phone: true, address: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json(users)
  } catch {
    return NextResponse.json({ error: 'Error al obtener usuarios' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, role, phone, address, password } = body
    if (!name || !email || !role || !password) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'El correo ya existe' }, { status: 409 })
    }
    const user = await db.user.create({
      data: { name, email, role, phone: phone || '', address: address || '', password },
      select: { id: true, name: true, email: true, role: true, phone: true, address: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json(user, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear usuario' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, email: true, role: true, phone: true, address: true, createdAt: true, updatedAt: true },
    })
    return NextResponse.json(user)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar usuario' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    await db.user.delete({ where: { id } })
    return NextResponse.json({ message: 'Usuario eliminado' })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar usuario' }, { status: 500 })
  }
}