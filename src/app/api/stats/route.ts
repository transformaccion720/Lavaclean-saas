import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0]
    const allOrders = await db.order.findMany()
    const todayOrders = allOrders.filter(o => o.pickupDate === today)
    const deliveredOrders = allOrders.filter(o => o.status === 'ENTREGADO')
    const totalRevenue = deliveredOrders.reduce((sum, o) => sum + o.price, 0)
    const todayRevenue = todayOrders.filter(o => o.status === 'ENTREGADO').reduce((sum, o) => sum + o.price, 0)
    const statusCounts: Record<string, number> = {}
    for (const o of allOrders) {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1
    }
    const totalUsers = await db.user.count()
    const totalGarments = await db.garment.count()
    const lowStockItems = await db.inventory.count({ where: { quantity: { lte: 10 } } })
    const pendingDeliveries = await db.delivery.count({ where: { status: { not: 'ENTREGADO' } } })
    const totalMaterials = await db.material.count()

    return NextResponse.json({
      totalOrders: allOrders.length,
      todayOrders: todayOrders.length,
      totalRevenue,
      todayRevenue,
      statusCounts,
      totalUsers,
      totalGarments,
      lowStockItems,
      pendingDeliveries,
      totalMaterials,
    })
  } catch {
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 })
  }
}