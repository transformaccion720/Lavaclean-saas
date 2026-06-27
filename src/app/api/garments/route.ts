import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    const where = orderId ? { orderId } : {}
    const garments = await db.garment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(garments)
  } catch {
    return NextResponse.json({ error: 'Error al obtener prendas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, type, description, color, brand, quantity } = body
    if (!orderId || !type) {
      return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    }
    const garment = await db.garment.create({
      data: { orderId, type, description: description || '', color: color || '', brand: brand || '', quantity: quantity || 1 },
    })
    return NextResponse.json(garment, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear prenda' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const garment = await db.garment.update({ where: { id }, data })
    return NextResponse.json(garment)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar prenda' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    await db.garment.delete({ where: { id } })
    return NextResponse.json({ message: 'Prenda eliminada' })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar prenda' }, { status: 500 })
  }
}