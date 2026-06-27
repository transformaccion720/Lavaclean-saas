import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    const materials = await db.material.findMany({ orderBy: { createdAt: 'desc' } })
    return NextResponse.json(materials)
  } catch {
    return NextResponse.json({ error: 'Error al obtener materiales' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, category, quantity, unit, costPerUnit, supplier } = body
    if (!name) return NextResponse.json({ error: 'Nombre requerido' }, { status: 400 })
    const material = await db.material.create({
      data: { name, category: category || 'QUIMICO', quantity: quantity || 0, unit: unit || 'litro', costPerUnit: costPerUnit || 0, supplier: supplier || '' },
    })
    return NextResponse.json(material, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear material' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    const material = await db.material.update({ where: { id }, data })
    return NextResponse.json(material)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar material' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    await db.material.delete({ where: { id } })
    return NextResponse.json({ message: 'Material eliminado' })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar material' }, { status: 500 })
  }
}