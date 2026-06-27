import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

const SERVICE_PRICES: Record<string, number> = {
  LAVADO: 15000,
  SECADO: 10000,
  PLANCHADO: 12000,
  COMPLETO: 30000,
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientEmail = searchParams.get('clientEmail')
    const includeGarments = searchParams.get('include') === 'garments'
    const where = clientEmail ? { clientEmail } : {}
    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        ...(includeGarments ? { garments: true, delivery: true } : {}),
      },
    })
    return NextResponse.json(orders)
  } catch {
    return NextResponse.json({ error: 'Error al obtener pedidos' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { clientName, clientEmail, serviceType, pickupDate, pickupTime, notes, garments } = body
    const price = SERVICE_PRICES[serviceType] || 15000
    const order = await db.order.create({
      data: {
        clientName,
        clientEmail,
        serviceType,
        status: 'PENDIENTE',
        pickupDate,
        pickupTime,
        price,
        notes: notes || '',
        garments: garments
          ? {
              create: garments.map((g: { type: string; description?: string; color?: string; brand?: string; quantity?: number }) => ({
                type: g.type,
                description: g.description || '',
                color: g.color || '',
                brand: g.brand || '',
                quantity: g.quantity || 1,
              })),
            }
          : undefined,
      },
      include: { garments: true },
    })
    return NextResponse.json(order, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear pedido' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status } = body
    const order = await db.order.update({ where: { id }, data: { status } })
    return NextResponse.json(order)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar pedido' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    await db.order.delete({ where: { id } })
    return NextResponse.json({ message: 'Pedido eliminado' })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar pedido' }, { status: 500 })
  }
}