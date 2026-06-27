import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const orderId = searchParams.get('orderId')
    const where = orderId ? { orderId } : {}
    const deliveries = await db.delivery.findMany({
      where,
      include: { order: { select: { clientName: true, clientEmail: true, serviceType: true, price: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(deliveries)
  } catch {
    return NextResponse.json({ error: 'Error al obtener entregas' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { orderId, driverName, address, notes } = body
    if (!orderId) return NextResponse.json({ error: 'Orden requerida' }, { status: 400 })
    const existing = await db.delivery.findUnique({ where: { orderId } })
    if (existing) return NextResponse.json({ error: 'Ya existe entrega para esta orden' }, { status: 409 })
    const delivery = await db.delivery.create({
      data: { orderId, driverName: driverName || '', address: address || '', notes: notes || '', status: 'PENDIENTE' },
      include: { order: { select: { clientName: true, clientEmail: true, serviceType: true, price: true } } },
    })
    return NextResponse.json(delivery, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear entrega' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, ...data } = body
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    if (data.status === 'ENTREGADO') data.deliveredAt = new Date()
    const delivery = await db.delivery.update({
      where: { id },
      data,
      include: { order: { select: { clientName: true, clientEmail: true, serviceType: true, price: true } } },
    })
    return NextResponse.json(delivery)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar entrega' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    await db.delivery.delete({ where: { id } })
    return NextResponse.json({ message: 'Entrega eliminada' })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar entrega' }, { status: 500 })
  }
}