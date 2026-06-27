import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    // Users
    await db.user.upsert({ where: { email: 'cliente@lavanderia.com' }, update: {}, create: { name: 'María García', email: 'cliente@lavanderia.com', role: 'CLIENT', phone: '301-555-0101', address: 'Calle 10 #5-30, Bogotá', password: '1234' } })
    await db.user.upsert({ where: { email: 'admin@lavanderia.com' }, update: {}, create: { name: 'Carlos Admin', email: 'admin@lavanderia.com', role: 'ADMIN', phone: '302-555-0202', address: 'Av. El Dorado #80, Bogotá', password: '1234' } })
    await db.user.upsert({ where: { email: 'operario@lavanderia.com' }, update: {}, create: { name: 'Pedro Operario', email: 'operario@lavanderia.com', role: 'WORKER', phone: '303-555-0303', address: 'Cra 7 #40-15, Bogotá', password: '1234' } })
    await db.user.upsert({ where: { email: 'ana@correo.com' }, update: {}, create: { name: 'Ana López', email: 'ana@correo.com', role: 'CLIENT', phone: '304-555-0404', address: 'Calle 25 #15-8, Bogotá', password: '1234' } })

    // Orders with garments
    const orderData = [
      { client: 'María García', email: 'cliente@lavanderia.com', service: 'COMPLETO', status: 'LISTO', date: '2026-06-28', time: '08:00', price: 30000, garments: [{ type: 'Camisa', color: 'Blanca', brand: 'Polo', qty: 3 }, { type: 'Pantalón', color: 'Negro', brand: 'Levis', qty: 2 }] },
      { client: 'Ana López', email: 'ana@correo.com', service: 'LAVADO', status: 'EN_LAVADO', date: '2026-06-28', time: '09:00', price: 15000, garments: [{ type: 'Vestido', color: 'Rojo', brand: 'Zara', qty: 1 }] },
      { client: 'Juan Pérez', email: 'otro@email.com', service: 'PLANCHADO', status: 'RECOGIDO', date: '2026-06-28', time: '10:00', price: 12000, garments: [{ type: 'Saco', color: 'Gris', brand: 'Hugo Boss', qty: 1 }, { type: 'Camisa', color: 'Azul', qty: 2 }] },
      { client: 'Luis Torres', email: 'otro2@email.com', service: 'SECADO', status: 'PENDIENTE', date: '2026-06-28', time: '11:00', price: 10000, garments: [{ type: 'Jeans', color: 'Azul oscuro', brand: 'Wrangler', qty: 2 }] },
      { client: 'Sofía Martín', email: 'otro3@email.com', service: 'COMPLETO', status: 'ENTREGADO', date: '2026-06-27', time: '14:00', price: 30000, garments: [{ type: 'Sábana', color: 'Blanca', qty: 4 }, { type: 'Edredón', color: 'Beige', qty: 1 }] },
    ]

    for (const od of orderData) {
      const order = await db.order.create({
        data: { clientName: od.client, clientEmail: od.email, serviceType: od.service, status: od.status, pickupDate: od.date, pickupTime: od.time, price: od.price, notes: '',
          garments: { create: od.garments.map(g => ({ type: g.type, color: g.color, brand: g.brand, quantity: g.qty, status: od.status === 'ENTREGADO' ? 'LAVADA' : 'RECIBIDA' })) } },
        include: { garments: true },
      })
      // Create delivery for LISTO orders
      if (od.status === 'LISTO') {
        await db.delivery.create({ data: { orderId: order.id, driverName: 'Carlos Rodríguez', address: 'Calle 10 #5-30, Bogotá', status: 'PENDIENTE', notes: '' } })
      }
      if (od.status === 'ENTREGADO') {
        await db.delivery.create({ data: { orderId: order.id, driverName: 'Miguel Hernández', address: 'Cra 15 #80-5', status: 'ENTREGADO', deliveredAt: new Date('2026-06-27T17:00:00'), notes: '' } })
      }
    }

    // Inventory
    const invItems = [
      { name: 'Bolsas plásticas grandes', category: 'BOLSAS', quantity: 250, unit: 'unidad', minStock: 50, cost: 50 },
      { name: 'Ganchos para perchas', category: 'GANCHOS', quantity: 12, unit: 'unidad', minStock: 20, cost: 150 },
      { name: 'Etiquetas adhesivas', category: 'ETIQUETAS', quantity: 500, unit: 'unidad', minStock: 100, cost: 20 },
      { name: 'Perchas plásticas', category: 'GENERAL', quantity: 80, unit: 'unidad', minStock: 30, cost: 800 },
      { name: 'Cajas de empaque', category: 'EMPACQUE', quantity: 8, unit: 'caja', minStock: 10, cost: 2500 },
      { name: 'Cinta adhesiva', category: 'GENERAL', quantity: 5, unit: 'rollo', minStock: 8, cost: 3500 },
    ]
    for (const item of invItems) {
      await db.inventory.create({ data: { ...item } })
    }

    // Materials
    const matItems = [
      { name: 'Detergente en polvo ABC', category: 'DETERGENTE', quantity: 15, unit: 'kg', costPerUnit: 8500, supplier: 'Distribuidora Andina' },
      { name: 'Suavizante concentrado', category: 'SUAVIZANTE', quantity: 8, unit: 'litro', costPerUnit: 12000, supplier: 'Químicos del Sur' },
      { name: 'Cloro industrial', category: 'CLORO', quantity: 5, unit: 'galón', costPerUnit: 18000, supplier: 'Químicos del Sur' },
      { name: 'Spot removedor de manchas', category: 'SPOT', quantity: 3, unit: 'litro', costPerUnit: 25000, supplier: 'CleanPro' },
      { name: 'Perfume para ropa floral', category: 'PERFUME', quantity: 2, unit: 'litro', costPerUnit: 32000, supplier: 'Aromas SAS' },
      { name: 'Jabón líquido neutro', category: 'DETERGENTE', quantity: 10, unit: 'litro', costPerUnit: 9500, supplier: 'Distribuidora Andina' },
    ]
    for (const m of matItems) {
      await db.material.create({ data: { ...m } })
    }

    return NextResponse.json({ message: 'Seed data created successfully' })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed' }, { status: 500 })
  }
}