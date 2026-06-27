import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const items = await db.inventory.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(items)
  } catch {
    return NextResponse.json({ error: 'Error al obtener inventario' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, category, quantity, unit, minStock, cost } = body
    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    const item = await db.inventory.create({
      data: { name, category: category || 'GENERAL', quantity: quantity || 0, unit: unit || 'unidad', minStock: minStock || 5, cost: cost || 0 },
    })
    return NextResponse.json(item, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear item' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const item = await db.inventory.update({ where: { id }, data })
    return NextResponse.json(item)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar item' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    await db.inventory.delete({ where: { id } })
    return NextResponse.json({ message: 'Item eliminado' })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar item' }, { status: 500 })
  }
}