'use client'

import { useState, useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Toaster, toast } from 'sonner'
import {
  Shirt, Clock, DollarSign, Package, PackageCheck, Truck, CheckCircle2, LogOut,
  User, RefreshCw, Star, TrendingUp, AlertCircle, Users, ShoppingBag,
  Warehouse, FlaskConical, MapPin, Plus, Trash2, Edit3, X, ChevronRight,
  LayoutDashboard, Boxes, Beaker, Route, Save, Eye,
} from 'lucide-react'

/* ══════════ Types ══════════ */
interface UserData {
  id: string; name: string; email: string; role: string
  phone: string; address: string; createdAt: string; updatedAt: string
}
interface GarmentData {
  id: string; orderId: string; type: string; description: string
  color: string; brand: string; quantity: number; status: string
  createdAt: string; updatedAt: string
}
interface InventoryItem {
  id: string; name: string; category: string; quantity: number
  unit: string; minStock: number; cost: number; createdAt: string; updatedAt: string
}
interface MaterialData {
  id: string; name: string; category: string; quantity: number
  unit: string; costPerUnit: number; supplier: string; createdAt: string; updatedAt: string
}
interface DeliveryData {
  id: string; orderId: string; driverName: string; status: string
  address: string; deliveredAt: string | null; notes: string
  order: { clientName: string; clientEmail: string; serviceType: string; price: number } | null
  createdAt: string; updatedAt: string
}
interface OrderData {
  id: string; clientName: string; clientEmail: string; serviceType: string
  status: string; pickupDate: string; pickupTime: string; price: number
  notes: string; createdAt: string; updatedAt: string
  garments?: GarmentData[]; delivery?: DeliveryData | null
}
interface Stats {
  totalOrders: number; todayOrders: number; totalRevenue: number; todayRevenue: number
  statusCounts: Record<string, number>; totalUsers: number; totalGarments: number
  lowStockItems: number; pendingDeliveries: number; totalMaterials: number
}

/* ══════════ Constants ══════════ */
const STATUS_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente', RECOGIDO: 'Recogido', EN_LAVADO: 'En lavado',
  LISTO: 'Listo para entregar', ENTREGADO: 'Entregado',
  RECIBIDA: 'Recibida', EN_PROCESO: 'En proceso', LAVADA: 'Lavada',
  ASIGNADA: 'Asignada', EN_CAMINO: 'En camino',
}
const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  RECOGIDO: 'bg-sky-100 text-sky-800 border-sky-300',
  EN_LAVADO: 'bg-violet-100 text-violet-800 border-violet-300',
  LISTO: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  ENTREGADO: 'bg-gray-100 text-gray-600 border-gray-300',
  RECIBIDA: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  EN_PROCESO: 'bg-violet-100 text-violet-800 border-violet-300',
  LAVADA: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  ASIGNADA: 'bg-sky-100 text-sky-800 border-sky-300',
  EN_CAMINO: 'bg-amber-100 text-amber-800 border-amber-300',
}
const SERVICE_LABELS: Record<string, string> = {
  LAVADO: 'Lavado', SECADO: 'Secado', PLANCHADO: 'Planchado', COMPLETO: 'Completo',
}
const STATUS_FLOW = ['PENDIENTE', 'RECOGIDO', 'EN_LAVADO', 'LISTO', 'ENTREGADO']
const DELIVERY_FLOW = ['PENDIENTE', 'ASIGNADA', 'EN_CAMINO', 'ENTREGADO']
const GARMENT_TYPES = ['Camisa', 'Pantalón', 'Vestido', 'Saco', 'Falda', 'Jeans', 'Blusa', 'Chaqueta', 'Sudadera', 'Ropa interior', 'Toalla', 'Sábana', 'Edredón', 'Otro']
const INV_CATEGORIES = ['DETERGENTE', 'SUAVIZANTE', 'CLORO', 'PERFUMINA', 'BOLSAS', 'GANCHOS', 'ETIQUETAS', 'GENERAL']
const MAT_CATEGORIES = ['QUIMICO', 'DETERGENTE', 'SUAVIZANTE', 'CLORO', 'SPOT', 'PERFUME', 'EMPACQUE', 'OTRO']
const formatPrice = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString('es-CO') } catch { return d } }

/* ══════════ Reusable Components ══════════ */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto border-0 shadow-2xl" onClick={e => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
    </div>
  )
}
function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className="border-0 shadow-md"><CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>{icon}</div>
        <div className="min-w-0"><p className="text-xs text-muted-foreground truncate">{label}</p><p className="text-lg font-bold truncate">{value}</p></div>
      </div>
    </CardContent></Card>
  )
}
function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return <div className="space-y-1.5"><Label className="text-sm">{label}{required && <span className="text-red-500 ml-0.5">*</span>}{!required && <span className="text-muted-foreground text-xs ml-1">(opcional)</span>}</Label>{children}</div>
}
function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`${STATUS_COLORS[status] || 'bg-gray-100 text-gray-600'} px-2 py-0.5 text-xs`}>{STATUS_LABELS[status] || status}</Badge>
}
function EmptyState({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return <div className="text-center py-10 text-muted-foreground"><div className="opacity-40 mx-auto mb-2">{icon}</div><p className="text-sm">{msg}</p></div>
}

/* ══════════ Main Component ══════════ */
export default function LaundryApp() {
  const [user, setUser] = useState<UserData | null>(null)
  const [orders, setOrders] = useState<OrderData[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [loading, setLoading] = useState(false)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Client form
  const [formService, setFormService] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formTime, setFormTime] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [formGarments, setFormGarments] = useState<{ type: string; color: string; quantity: number }[]>([{ type: '', color: '', quantity: 1 }])

  // Admin sub-views
  const [adminTab, setAdminTab] = useState('dashboard')
  const [users, setUsers] = useState<UserData[]>([])
  const [inventory, setInventory] = useState<InventoryItem[]>([])
  const [materials, setMaterials] = useState<MaterialData[]>([])
  const [deliveries, setDeliveries] = useState<DeliveryData[]>([])
  const [selectedOrder, setSelectedOrder] = useState<OrderData | null>(null)

  // Modals
  const [showUserModal, setShowUserModal] = useState(false)
  const [showInvModal, setShowInvModal] = useState(false)
  const [showMatModal, setShowMatModal] = useState(false)
  const [showDelModal, setShowDelModal] = useState(false)
  const [showOrderDetail, setShowOrderDetail] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)

  // Form states for modals
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'CLIENT', phone: '', address: '', password: '' })
  const [invForm, setInvForm] = useState({ name: '', category: 'GENERAL', quantity: 0, unit: 'unidad', minStock: 5, cost: 0 })
  const [matForm, setMatForm] = useState({ name: '', category: 'QUIMICO', quantity: 0, unit: 'litro', costPerUnit: 0, supplier: '' })
  const [delForm, setDelForm] = useState({ orderId: '', driverName: '', address: '', notes: '' })

  const apiFetch = useCallback(async (url: string, opts?: RequestInit) => {
    const res = await fetch(url, opts)
    return { data: await res.json(), ok: res.ok }
  }, [])

  const fetchOrders = useCallback(async (email?: string) => {
    const url = email ? `/api/orders?clientEmail=${email}` : '/api/orders'
    const { data } = await apiFetch(url)
    setOrders(data)
  }, [apiFetch])

  const fetchStats = useCallback(async () => {
    const { data } = await apiFetch('/api/stats')
    setStats(data)
  }, [apiFetch])

  const fetchAdminData = useCallback(async () => {
    const [u, i, m, d] = await Promise.all([
      apiFetch('/api/users'), apiFetch('/api/inventory'),
      apiFetch('/api/materials'), apiFetch('/api/deliveries'),
    ])
    setUsers(u.data); setInventory(i.data); setMaterials(m.data); setDeliveries(d.data)
  }, [apiFetch])

  // Socket
  useEffect(() => {
    const s = io('/?XTransformPort=3004', { transports: ['websocket', 'polling'], forceNew: true, reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1000 })
    setSocket(s)
    s.on('order-updated', (data: { action: string; order: OrderData }) => {
      setOrders(prev => {
        const idx = prev.findIndex(o => o.id === data.order.id)
        if (idx >= 0) { const u = [...prev]; u[idx] = data.order; return u }
        if (data.action === 'created') return [data.order, ...prev]
        return prev
      })
      fetchStats()
      toast.success(data.action === 'created' ? 'Nuevo pedido creado' : 'Estado actualizado')
    })
    return () => { s.disconnect() }
  }, [fetchStats])

  // Login
  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) return
    setLoading(true)
    try {
      const { data, ok } = await apiFetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })
      if (!ok) { toast.error(data.error || 'Error al iniciar sesión'); return }
      setUser(data)
      socket?.emit('join-role', data.role)
      if (data.role === 'CLIENT') fetchOrders(data.email)
      else { fetchOrders(); fetchStats(); fetchAdminData() }
    } catch { toast.error('Error de conexión') }
    finally { setLoading(false) }
  }

  // Client: Create order
  const handleCreateOrder = async () => {
    if (!user || !formService || !formDate || !formTime) { toast.error('Completa todos los campos requeridos'); return }
    const validGarments = formGarments.filter(g => g.type)
    setLoading(true)
    try {
      const { data, ok } = await apiFetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: user.name, clientEmail: user.email, serviceType: formService,
          pickupDate: formDate, pickupTime: formTime, notes: formNotes,
          garments: validGarments.length > 0 ? validGarments : undefined,
        }),
      })
      if (ok) {
        socket?.emit('order-created', data)
        setFormService(''); setFormDate(''); setFormTime(''); setFormNotes('')
        setFormGarments([{ type: '', color: '', quantity: 1 }])
        fetchOrders(user.email); toast.success('Pedido creado exitosamente')
      }
    } catch { toast.error('Error al crear pedido') }
    finally { setLoading(false) }
  }

  // Worker: Change status
  const handleChangeStatus = async (orderId: string, newStatus: string) => {
    setLoading(true)
    try {
      const { data, ok } = await apiFetch('/api/orders', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      })
      if (ok) { socket?.emit('order-status-changed', data); fetchOrders() }
    } catch { toast.error('Error al cambiar estado') }
    finally { setLoading(false) }
  }
  const getNextStatus = (current: string, flow: string[] = STATUS_FLOW): string | null => {
    const idx = flow.indexOf(current)
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null
  }

  // Generic CRUD helpers
  const crud = async (url: string, method: string, body?: object) => {
    setLoading(true)
    try {
      const { data, ok } = await apiFetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      })
      if (ok) { toast.success('Operación exitosa'); fetchAdminData(); fetchStats(); fetchOrders(); }
      else toast.error(data.error || 'Error')
      return { data, ok }
    } catch { toast.error('Error de conexión'); return { data: null, ok: false } }
    finally { setLoading(false) }
  }

  // User CRUD
  const openUserModal = (u?: UserData) => {
    if (u) { setEditId(u.id); setUserForm({ name: u.name, email: u.email, role: u.role, phone: u.phone || '', address: u.address || '', password: '' }) }
    else { setEditId(null); setUserForm({ name: '', email: '', role: 'CLIENT', phone: '', address: '', password: '1234' }) }
    setShowUserModal(true)
  }
  const saveUser = async () => {
    if (!userForm.name || !userForm.email) { toast.error('Nombre y correo requeridos'); return }
    if (editId) await crud('/api/users', 'PATCH', { id: editId, ...userForm, password: userForm.password || '1234' })
    else await crud('/api/users', 'POST', userForm)
    setShowUserModal(false)
  }
  const deleteUser = async (id: string) => { await crud(`/api/users?id=${id}`, 'DELETE') }

  // Inventory CRUD
  const openInvModal = (item?: InventoryItem) => {
    if (item) { setEditId(item.id); setInvForm({ name: item.name, category: item.category, quantity: item.quantity, unit: item.unit, minStock: item.minStock, cost: item.cost }) }
    else { setEditId(null); setInvForm({ name: '', category: 'GENERAL', quantity: 0, unit: 'unidad', minStock: 5, cost: 0 }) }
    setShowInvModal(true)
  }
  const saveInv = async () => {
    if (!invForm.name) { toast.error('Nombre requerido'); return }
    if (editId) await crud('/api/inventory', 'PATCH', { id: editId, ...invForm })
    else await crud('/api/inventory', 'POST', invForm)
    setShowInvModal(false)
  }
  const deleteInv = async (id: string) => { await crud(`/api/inventory?id=${id}`, 'DELETE') }

  // Material CRUD
  const openMatModal = (m?: MaterialData) => {
    if (m) { setEditId(m.id); setMatForm({ name: m.name, category: m.category, quantity: m.quantity, unit: m.unit, costPerUnit: m.costPerUnit, supplier: m.supplier || '' }) }
    else { setEditId(null); setMatForm({ name: '', category: 'QUIMICO', quantity: 0, unit: 'litro', costPerUnit: 0, supplier: '' }) }
    setShowMatModal(true)
  }
  const saveMat = async () => {
    if (!matForm.name) { toast.error('Nombre requerido'); return }
    if (editId) await crud('/api/materials', 'PATCH', { id: editId, ...matForm })
    else await crud('/api/materials', 'POST', matForm)
    setShowMatModal(false)
  }
  const deleteMat = async (id: string) => { await crud(`/api/materials?id=${id}`, 'DELETE') }

  // Delivery CRUD
  const openDelModal = (d?: DeliveryData, orderId?: string) => {
    if (d) { setEditId(d.id); setDelForm({ orderId: d.orderId, driverName: d.driverName, address: d.address || '', notes: d.notes || '' }) }
    else { setEditId(null); setDelForm({ orderId: orderId || '', driverName: '', address: '', notes: '' }) }
    setShowDelModal(true)
  }
  const saveDel = async () => {
    if (!delForm.orderId) { toast.error('Orden requerida'); return }
    if (editId) await crud('/api/deliveries', 'PATCH', { id: editId, ...delForm })
    else await crud('/api/deliveries', 'POST', delForm)
    setShowDelModal(false)
  }
  const changeDelStatus = async (id: string, status: string) => {
    await crud('/api/deliveries', 'PATCH', { id, status })
    fetchAdminData()
  }
  const deleteDel = async (id: string) => { await crud(`/api/deliveries?id=${id}`, 'DELETE') }

  const logout = () => {
    setUser(null); setOrders([]); setStats(null); setAdminTab('dashboard')
    setLoginEmail(''); setLoginPassword('')
  }

  /* ══════════ LOGIN SCREEN ══════════ */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-200/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-200/30 rounded-full blur-3xl" />
        </div>
        <Card className="w-full max-w-md relative z-10 shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <Shirt className="h-8 w-8 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">LavaClean SaaS</CardTitle>
            <CardDescription>Inicia sesión para continuar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            <Field label="Correo electrónico">
              <Input type="email" placeholder="tu@correo.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </Field>
            <Field label="Contraseña">
              <Input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
            </Field>
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700">
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center mb-3">Cuentas de prueba:</p>
              <div className="grid gap-2">
                {[
                  { email: 'cliente@lavanderia.com', role: 'Cliente', color: 'text-teal-600' },
                  { email: 'admin@lavanderia.com', role: 'Administrador', color: 'text-amber-600' },
                  { email: 'operario@lavanderia.com', role: 'Operario', color: 'text-violet-600' },
                ].map(acc => (
                  <button key={acc.email} onClick={() => { setLoginEmail(acc.email); setLoginPassword('1234') }}
                    className="flex items-center justify-between px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors text-left">
                    <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /><span className="text-sm">{acc.role}</span></div>
                    <span className="text-xs text-muted-foreground">{acc.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">Contraseña: 1234</p>
            </div>
          </CardContent>
        </Card>
        <Toaster position="top-center" />
      </div>
    )
  }

  /* ══════════ Shared Header ══════════ */
  const roleLabel = user.role === 'CLIENT' ? 'Cliente' : user.role === 'ADMIN' ? 'Administrador' : 'Operario'
  const roleColor = user.role === 'CLIENT' ? 'bg-teal-100 text-teal-700' : user.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : 'bg-violet-100 text-violet-700'

  const Header = () => (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <Shirt className="h-5 w-5 text-emerald-600" />
          <span className="font-bold text-lg">LavaClean</span>
          <Badge className={roleColor}>{roleLabel}</Badge>
        </div>
        <Button variant="ghost" size="sm" onClick={logout}><LogOut className="h-4 w-4 mr-1" /> Salir</Button>
      </div>
    </header>
  )

  /* ══════════ CLIENT SCREEN ══════════ */
  if (user.role === 'CLIENT') {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
          <h1 className="text-2xl font-bold">Hola, {user.name.split(' ')[0]}</h1>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Package className="h-5 w-5 text-emerald-600" /> Solicitar recogida</CardTitle>
              <CardDescription>Completa los datos para pedir tu servicio de lavandería</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Tipo de servicio" required>
                  <Select value={formService} onValueChange={setFormService}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LAVADO">Lavado — {formatPrice(15000)}</SelectItem>
                      <SelectItem value="SECADO">Secado — {formatPrice(10000)}</SelectItem>
                      <SelectItem value="PLANCHADO">Planchado — {formatPrice(12000)}</SelectItem>
                      <SelectItem value="COMPLETO">Completo — {formatPrice(30000)}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Fecha de recogida" required><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} /></Field>
                <Field label="Hora de recogida" required><Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} /></Field>
                <Field label="Notas adicionales"><Textarea placeholder="Instrucciones especiales..." value={formNotes} onChange={e => setFormNotes(e.target.value)} /></Field>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Prendas a lavar</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setFormGarments(p => [...p, { type: '', color: '', quantity: 1 }])}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                </div>
                {formGarments.map((g, idx) => (
                  <div key={idx} className="flex gap-2 items-end">
                    <div className="flex-1"><Label className="text-xs">Tipo</Label>
                      <Select value={g.type} onValueChange={v => { const n = [...formGarments]; n[idx].type = v; setFormGarments(n) }}>
                        <SelectTrigger className="h-9"><SelectValue placeholder="Tipo..." /></SelectTrigger>
                        <SelectContent>{GARMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="w-28"><Label className="text-xs">Color</Label><Input className="h-9" placeholder="Blanco" value={g.color} onChange={e => { const n = [...formGarments]; n[idx].color = e.target.value; setFormGarments(n) }} /></div>
                    <div className="w-20"><Label className="text-xs">Cant.</Label><Input type="number" min={1} className="h-9" value={g.quantity} onChange={e => { const n = [...formGarments]; n[idx].quantity = parseInt(e.target.value) || 1; setFormGarments(n) }} /></div>
                    {formGarments.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500" onClick={() => setFormGarments(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>}
                  </div>
                ))}
              </div>

              <Button onClick={handleCreateOrder} disabled={loading || !formService || !formDate || !formTime} className="w-full bg-emerald-600 hover:bg-emerald-700">
                Crear pedido
              </Button>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><Clock className="h-5 w-5 text-emerald-600" /> Mis pedidos</CardTitle>
              <CardDescription>Sigue el estado de tus pedidos en tiempo real</CardDescription>
            </CardHeader>
            <CardContent>
              {orders.length === 0 ? <EmptyState icon={<Package className="h-10 w-10" />} msg="No tienes pedidos aún" /> : (
                <ScrollArea className="max-h-96">
                  <div className="space-y-3">
                    {orders.map(order => (
                      <div key={order.id} className="flex items-start sm:items-center justify-between p-4 rounded-xl border bg-white gap-3 flex-col sm:flex-row">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className="font-semibold text-sm">{SERVICE_LABELS[order.serviceType]}</span>
                            <StatusBadge status={order.status} />
                          </div>
                          <p className="text-xs text-muted-foreground">{order.pickupDate} a las {order.pickupTime} · {formatPrice(order.price)}</p>
                          {order.notes && <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{order.notes}&rdquo;</p>}
                          {order.garments && order.garments.length > 0 && (
                            <div className="flex gap-1 mt-1.5 flex-wrap">{order.garments.map(g => <Badge key={g.id} variant="secondary" className="text-xs">{g.type}{g.color ? ` (${g.color})` : ''} x{g.quantity}</Badge>)}</div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 w-full sm:w-auto shrink-0">
                          {STATUS_FLOW.map((s, i) => (
                            <div key={s} className="flex items-center gap-1">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${STATUS_FLOW.indexOf(order.status) >= i ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                              {i < STATUS_FLOW.length - 1 && <div className={`h-0.5 w-4 sm:w-6 ${STATUS_FLOW.indexOf(order.status) > i ? 'bg-emerald-500' : 'bg-muted'}`} />}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </main>
        <Toaster position="top-center" />
      </div>
    )
  }

  /* ══════════ WORKER SCREEN ══════════ */
  if (user.role === 'WORKER') {
    const activeOrders = orders.filter(o => o.status !== 'ENTREGADO')
    const completedOrders = orders.filter(o => o.status === 'ENTREGADO')
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <Header />
        <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Órdenes de trabajo</h1>
            <Button variant="outline" size="sm" onClick={() => fetchOrders()}><RefreshCw className="h-4 w-4 mr-1" /> Actualizar</Button>
          </div>
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2"><RefreshCw className="h-5 w-5 text-violet-600" /> Activas ({activeOrders.length})</CardTitle>
              <CardDescription>Haz clic para avanzar al siguiente estado</CardDescription>
            </CardHeader>
            <CardContent>
              {activeOrders.length === 0 ? <EmptyState icon={<CheckCircle2 className="h-10 w-10" />} msg="Todas las órdenes están completadas" /> : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-3">{activeOrders.map(order => {
                    const next = getNextStatus(order.status)
                    return (
                      <div key={order.id} className="p-4 rounded-xl border bg-white space-y-3">
                        <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">{order.clientName}</span>
                              <Badge variant="secondary">{SERVICE_LABELS[order.serviceType]}</Badge>
                              <StatusBadge status={order.status} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">Recogida: {order.pickupDate} a las {order.pickupTime} · {formatPrice(order.price)}</p>
                            {order.notes && <p className="text-xs text-muted-foreground mt-1 italic">&ldquo;{order.notes}&rdquo;</p>}
                            {order.garments && order.garments.length > 0 && (
                              <div className="flex gap-1 mt-1.5 flex-wrap">{order.garments.map(g => <Badge key={g.id} variant="outline" className="text-xs">{g.type} x{g.quantity}</Badge>)}</div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 overflow-x-auto pb-1">
                          {STATUS_FLOW.map((s, i) => (
                            <div key={s} className="flex items-center gap-1 shrink-0">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-all ${STATUS_FLOW.indexOf(order.status) >= i ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground'}`}>{i + 1}</div>
                              {i < STATUS_FLOW.length - 1 && <div className={`h-1 w-5 sm:w-8 rounded ${STATUS_FLOW.indexOf(order.status) > i ? 'bg-emerald-500' : 'bg-muted'}`} />}
                            </div>
                          ))}
                        </div>
                        {next && (
                          <Button onClick={() => handleChangeStatus(order.id, next)} disabled={loading} className="w-full sm:w-auto bg-violet-600 hover:bg-violet-700">
                            <ChevronRight className="h-4 w-4" /><span className="ml-1">Cambiar a: {STATUS_LABELS[next]}</span>
                          </Button>
                        )}
                      </div>
                    )
                  })}</div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
          {completedOrders.length > 0 && (
            <Card className="border-0 shadow-md">
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-emerald-600" /> Completadas ({completedOrders.length})</CardTitle></CardHeader>
              <CardContent><ScrollArea className="max-h-64"><div className="space-y-2">{completedOrders.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 rounded-xl border bg-white opacity-70">
                  <div><span className="font-semibold text-sm">{o.clientName}</span><span className="text-xs text-muted-foreground ml-2">{SERVICE_LABELS[o.serviceType]}</span></div>
                  <StatusBadge status="ENTREGADO" />
                </div>
              ))}</div></ScrollArea></CardContent>
            </Card>
          )}
        </main>
        <Toaster position="top-center" />
      </div>
    )
  }

  /* ══════════ ADMIN SCREEN ══════════ */
  const tabs = [
    { key: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: 'orders', label: 'Pedidos', icon: <ShoppingBag className="h-4 w-4" /> },
    { key: 'users', label: 'Usuarios', icon: <Users className="h-4 w-4" /> },
    { key: 'garments', label: 'Prendas', icon: <Shirt className="h-4 w-4" /> },
    { key: 'inventory', label: 'Inventario', icon: <Boxes className="h-4 w-4" /> },
    { key: 'materials', label: 'Materiales', icon: <FlaskConical className="h-4 w-4" /> },
    { key: 'deliveries', label: 'Entregas', icon: <Route className="h-4 w-4" /> },
  ]

  const openOrderDetail = async (orderId: string) => {
    const { data } = await apiFetch(`/api/orders?include=garments`)
    const full = data.find((o: OrderData) => o.id === orderId)
    if (full) { setSelectedOrder(full); setShowOrderDetail(true) }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Tab nav */}
        <div className="flex gap-1 overflow-x-auto pb-1 -mx-4 px-4">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setAdminTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${adminTab === t.key ? 'bg-emerald-600 text-white shadow-sm' : 'bg-white border text-muted-foreground hover:bg-muted/50'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ═══ DASHBOARD ═══ */}
        {adminTab === 'dashboard' && stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={<DollarSign className="h-5 w-5 text-amber-600" />} label="Ingresos hoy" value={formatPrice(stats.todayRevenue)} color="bg-amber-100" />
              <StatCard icon={<TrendingUp className="h-5 w-5 text-emerald-600" />} label="Ingresos totales" value={formatPrice(stats.totalRevenue)} color="bg-emerald-100" />
              <StatCard icon={<Package className="h-5 w-5 text-sky-600" />} label="Pedidos hoy" value={stats.todayOrders} color="bg-sky-100" />
              <StatCard icon={<Star className="h-5 w-5 text-violet-600" />} label="Total pedidos" value={stats.totalOrders} color="bg-violet-100" />
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard icon={<Users className="h-5 w-5 text-teal-600" />} label="Usuarios" value={stats.totalUsers} color="bg-teal-100" />
              <StatCard icon={<Shirt className="h-5 w-5 text-pink-600" />} label="Prendas registradas" value={stats.totalGarments} color="bg-pink-100" />
              <StatCard icon={<AlertCircle className="h-5 w-5 text-red-600" />} label="Stock bajo" value={stats.lowStockItems} color="bg-red-100" />
              <StatCard icon={<Truck className="h-5 w-5 text-orange-600" />} label="Entregas pendientes" value={stats.pendingDeliveries} color="bg-orange-100" />
            </div>
            <Card className="border-0 shadow-md">
              <CardHeader className="pb-2"><CardTitle className="text-base">Distribución por estado</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FLOW.map(s => <Badge key={s} variant="outline" className={`${STATUS_COLORS[s]} px-3 py-1 text-sm`}>{STATUS_LABELS[s]}: {stats.statusCounts[s] || 0}</Badge>)}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* ═══ PEDIDOS ═══ */}
        {adminTab === 'orders' && (
          <Card className="border-0 shadow-md">
            <CardHeader><CardTitle className="text-lg">Todas las órdenes</CardTitle><CardDescription>Pedidos en tiempo real</CardDescription></CardHeader>
            <CardContent>
              {orders.length === 0 ? <EmptyState icon={<AlertCircle className="h-10 w-10" />} msg="No hay pedidos" /> : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">{orders.map(order => (
                    <div key={order.id} className="flex items-center justify-between p-3 rounded-xl border bg-white gap-3 flex-col sm:flex-row">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{order.clientName}</span>
                          <StatusBadge status={order.status} />
                          <Badge variant="secondary">{SERVICE_LABELS[order.serviceType]}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{order.pickupDate} · {order.pickupTime} · {formatPrice(order.price)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-emerald-600">{formatPrice(order.price)}</span>
                        <Button variant="ghost" size="sm" onClick={() => openOrderDetail(order.id)}><Eye className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}</div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ USUARIOS ═══ */}
        {adminTab === 'users' && (
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-lg">Gestión de Usuarios</CardTitle><CardDescription>{users.length} usuarios registrados</CardDescription></div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openUserModal()}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-2">{users.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 rounded-xl border bg-white gap-2 flex-col sm:flex-row">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{u.name}</span>
                        <Badge variant="outline" className={u.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : u.role === 'WORKER' ? 'bg-violet-100 text-violet-700' : 'bg-teal-100 text-teal-700'}>
                          {u.role === 'CLIENT' ? 'Cliente' : u.role === 'ADMIN' ? 'Admin' : 'Operario'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{u.email}{u.phone ? ` · ${u.phone}` : ''}{u.address ? ` · ${u.address}` : ''}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUserModal(u)}><Edit3 className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteUser(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                ))}</div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* ═══ PRENDAS ═══ */}
        {adminTab === 'garments' && (
          <Card className="border-0 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">Prendas por Pedido</CardTitle>
              <CardDescription>Selecciona un pedido para ver o agregar prendas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <Select value="" onValueChange={v => v && openOrderDetail(v)}>
                  <SelectTrigger className="max-w-xs"><SelectValue placeholder="Buscar pedido..." /></SelectTrigger>
                  <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.clientName} — {SERVICE_LABELS[o.serviceType]} ({o.pickupDate})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {selectedOrder && (
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/50 border">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{selectedOrder.clientName}</span>
                      <StatusBadge status={selectedOrder.status} />
                      <Badge variant="secondary">{SERVICE_LABELS[selectedOrder.serviceType]}</Badge>
                    </div>
                  </div>
                  {selectedOrder.garments && selectedOrder.garments.length > 0 ? (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2">{selectedOrder.garments.map(g => (
                        <div key={g.id} className="flex items-center justify-between p-3 rounded-xl border bg-white">
                          <div><span className="font-semibold text-sm">{g.type}</span><span className="text-xs text-muted-foreground ml-2">{g.color ? g.color : ''} {g.brand ? `· ${g.brand}` : ''}</span><span className="text-xs text-muted-foreground ml-2">x{g.quantity}</span></div>
                          <StatusBadge status={g.status} />
                        </div>
                      ))}</div>
                    </ScrollArea>
                  ) : <p className="text-sm text-muted-foreground text-center py-4">Este pedido no tiene prendas registradas</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ INVENTARIO ═══ */}
        {adminTab === 'inventory' && (
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-lg">Inventario</CardTitle><CardDescription>{inventory.length} items registrados</CardDescription></div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openInvModal()}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? <EmptyState icon={<Warehouse className="h-10 w-10" />} msg="Inventario vacío" /> : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">{inventory.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border bg-white gap-2 flex-col sm:flex-row ${item.quantity <= item.minStock ? 'border-red-200 bg-red-50/30' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{item.name}</span>
                          <Badge variant="secondary">{item.category}</Badge>
                          {item.quantity <= item.minStock && <Badge className="bg-red-100 text-red-700 border-red-300">Stock bajo</Badge>}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Stock: {item.quantity} {item.unit} · Mín: {item.minStock} · Costo: {formatPrice(item.cost)}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openInvModal(item)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteInv(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}</div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ MATERIALES ═══ */}
        {adminTab === 'materials' && (
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-lg">Materiales</CardTitle><CardDescription>{materials.length} materiales registrados</CardDescription></div>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => openMatModal()}><Plus className="h-4 w-4 mr-1" /> Nuevo</Button>
            </CardHeader>
            <CardContent>
              {materials.length === 0 ? <EmptyState icon={<FlaskConical className="h-10 w-10" />} msg="Sin materiales registrados" /> : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">{materials.map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border bg-white gap-2 flex-col sm:flex-row">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{m.name}</span>
                          <Badge variant="secondary">{m.category}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Stock: {m.quantity} {m.unit} · Costo/unidad: {formatPrice(m.costPerUnit)}{m.supplier ? ` · Proveedor: ${m.supplier}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMatModal(m)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteMat(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}</div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* ═══ ENTREGAS ═══ */}
        {adminTab === 'deliveries' && (
          <Card className="border-0 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between">
              <div><CardTitle className="text-lg">Gestión de Entregas</CardTitle><CardDescription>{deliveries.length} entregas registradas</CardDescription></div>
              <div className="flex gap-2">
                <Select value="" onValueChange={v => v && openDelModal(undefined, v)}>
                  <SelectTrigger className="w-48 h-9"><SelectValue placeholder="Nueva entrega..." /></SelectTrigger>
                  <SelectContent>{orders.filter(o => o.status === 'LISTO' && !deliveries.find(d => d.orderId === o.id)).map(o => (
                    <SelectItem key={o.id} value={o.id}>{o.clientName} — {SERVICE_LABELS[o.serviceType]}</SelectItem>
                  ))}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? <EmptyState icon={<Truck className="h-10 w-10" />} msg="Sin entregas registradas" /> : (
                <ScrollArea className="max-h-[500px]">
                  <div className="space-y-2">{deliveries.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-3 rounded-xl border bg-white gap-3 flex-col sm:flex-row">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm">{d.order?.clientName || 'N/A'}</span>
                          <StatusBadge status={d.status} />
                          <Badge variant="secondary">{d.order?.serviceType || ''}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Conductor: {d.driverName || 'Sin asignar'}{d.address ? ` · ${d.address}` : ''}{d.deliveredAt ? ` · Entregado: ${fmtDate(d.deliveredAt)}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        {d.status !== 'ENTREGADO' && (() => { const next = getNextStatus(d.status, DELIVERY_FLOW); return next ? (
                          <Button size="sm" variant="outline" onClick={() => changeDelStatus(d.id, next)} className="text-xs h-8">
                            <ChevronRight className="h-3 w-3 mr-0.5" /> {STATUS_LABELS[next]}
                          </Button>
                        ) : null })()}
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDelModal(d)}><Edit3 className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => deleteDel(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  ))}</div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* ═══ MODALS ═══ */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title={editId ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <div className="space-y-3">
          <Field label="Nombre" required><Input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} /></Field>
          <Field label="Correo" required><Input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} /></Field>
          <Field label="Rol" required>
            <Select value={userForm.role} onValueChange={v => setUserForm({ ...userForm, role: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="CLIENT">Cliente</SelectItem><SelectItem value="ADMIN">Administrador</SelectItem><SelectItem value="WORKER">Operario</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Teléfono"><Input value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} /></Field>
          <Field label="Dirección"><Input value={userForm.address} onChange={e => setUserForm({ ...userForm, address: e.target.value })} /></Field>
          <Field label="Contraseña"><Input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} /></Field>
          <Button onClick={saveUser} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700"><Save className="h-4 w-4 mr-1" /> Guardar</Button>
        </div>
      </Modal>

      <Modal open={showInvModal} onClose={() => setShowInvModal(false)} title={editId ? 'Editar Item' : 'Nuevo Item de Inventario'}>
        <div className="space-y-3">
          <Field label="Nombre" required><Input value={invForm.name} onChange={e => setInvForm({ ...invForm, name: e.target.value })} /></Field>
          <Field label="Categoría">
            <Select value={invForm.category} onValueChange={v => setInvForm({ ...invForm, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{INV_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad"><Input type="number" value={invForm.quantity} onChange={e => setInvForm({ ...invForm, quantity: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Unidad"><Input value={invForm.unit} onChange={e => setInvForm({ ...invForm, unit: e.target.value })} /></Field>
            <Field label="Stock mínimo"><Input type="number" value={invForm.minStock} onChange={e => setInvForm({ ...invForm, minStock: parseInt(e.target.value) || 0 })} /></Field>
            <Field label="Costo"><Input type="number" value={invForm.cost} onChange={e => setInvForm({ ...invForm, cost: parseFloat(e.target.value) || 0 })} /></Field>
          </div>
          <Button onClick={saveInv} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700"><Save className="h-4 w-4 mr-1" /> Guardar</Button>
        </div>
      </Modal>

      <Modal open={showMatModal} onClose={() => setShowMatModal(false)} title={editId ? 'Editar Material' : 'Nuevo Material'}>
        <div className="space-y-3">
          <Field label="Nombre" required><Input value={matForm.name} onChange={e => setMatForm({ ...matForm, name: e.target.value })} /></Field>
          <Field label="Categoría">
            <Select value={matForm.category} onValueChange={v => setMatForm({ ...matForm, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{MAT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad"><Input type="number" step="0.1" value={matForm.quantity} onChange={e => setMatForm({ ...matForm, quantity: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Unidad"><Input value={matForm.unit} onChange={e => setMatForm({ ...matForm, unit: e.target.value })} /></Field>
            <Field label="Costo/Unidad"><Input type="number" value={matForm.costPerUnit} onChange={e => setMatForm({ ...matForm, costPerUnit: parseFloat(e.target.value) || 0 })} /></Field>
            <Field label="Proveedor"><Input value={matForm.supplier} onChange={e => setMatForm({ ...matForm, supplier: e.target.value })} /></Field>
          </div>
          <Button onClick={saveMat} disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-700"><Save className="h-4 w-4 mr-1" /> Guardar</Button>
        </div>
      </Modal>

      <Modal open={showDelModal} onClose={() => setShowDelModal(false)} title={editId ? 'Editar Entrega' : 'Nueva Entrega'}>
        <div className="space-y-3">
          {!editId && (
            <Field label="Pedido" required>
              <Select value={delForm.orderId} onValueChange={v => setDelForm({ ...delForm, orderId: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar pedido..." /></SelectTrigger>
                <SelectContent>{orders.filter(o => o.status === 'LISTO' && !deliveries.find(d => d.orderId === o.id)).map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.clientName} — {SERVICE_LABELS[o.serviceType]}</SelectItem>
                ))}</SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Conductor"><Input value={delForm.driverName} onChange={e => setDelForm({ ...delForm, driverName: e.target.value })} placeholder="Nombre del conductor" /></Field>
          <Field label="Dirección de entrega"><Input value={delForm.address} onChange={e => setDelForm({ ...delForm, address: e.target.value })} placeholder="Dirección" /></Field>
          <Field label="Notas"><Textarea value={delForm.notes} onChange={e => setDelForm({ ...delForm, notes: e.target.value })} /></Field>
          <Button onClick={saveDel} disabled={loading || !delForm.orderId} className="w-full bg-emerald-600 hover:bg-emerald-700"><Save className="h-4 w-4 mr-1" /> Guardar</Button>
        </div>
      </Modal>

      <Modal open={showOrderDetail} onClose={() => setShowOrderDetail(false)} title="Detalle del Pedido">
        {selectedOrder && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-xs text-muted-foreground">Cliente</p><p className="font-semibold text-sm">{selectedOrder.clientName}</p></div>
              <div><p className="text-xs text-muted-foreground">Estado</p><StatusBadge status={selectedOrder.status} /></div>
              <div><p className="text-xs text-muted-foreground">Servicio</p><p className="text-sm">{SERVICE_LABELS[selectedOrder.serviceType]}</p></div>
              <div><p className="text-xs text-muted-foreground">Precio</p><p className="font-bold text-emerald-600">{formatPrice(selectedOrder.price)}</p></div>
              <div><p className="text-xs text-muted-foreground">Recogida</p><p className="text-sm">{selectedOrder.pickupDate} a las {selectedOrder.pickupTime}</p></div>
              <div><p className="text-xs text-muted-foreground">Creado</p><p className="text-sm">{fmtDate(selectedOrder.createdAt)}</p></div>
            </div>
            {selectedOrder.notes && <div><p className="text-xs text-muted-foreground">Notas</p><p className="text-sm italic">&ldquo;{selectedOrder.notes}&rdquo;</p></div>}
            <div>
              <p className="text-xs text-muted-foreground mb-2">Prendas ({selectedOrder.garments?.length || 0})</p>
              {selectedOrder.garments && selectedOrder.garments.length > 0 ? (
                <div className="space-y-1">{selectedOrder.garments.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-2 rounded-lg border bg-muted/30">
                    <span className="text-sm">{g.type} {g.color ? `(${g.color})` : ''}</span>
                    <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">x{g.quantity}</span><StatusBadge status={g.status} /></div>
                  </div>
                ))}</div>
              ) : <p className="text-sm text-muted-foreground">Sin prendas registradas</p>}
            </div>
          </div>
        )}
      </Modal>

      <Toaster position="top-center" />
    </div>
  )
}