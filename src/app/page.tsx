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
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Separator } from '@/components/ui/separator'
import { Toaster, toast } from 'sonner'
import {
  Shirt, Clock, DollarSign, Package, PackageCheck, Truck, CheckCircle2, LogOut,
  User, RefreshCw, Star, TrendingUp, AlertCircle, Users, ShoppingBag,
  Warehouse, FlaskConical, MapPin, Plus, Trash2, Edit3, X, ChevronRight,
  LayoutDashboard, Boxes, Beaker, Route, Save, Eye, Menu, CircleDot,
  ClipboardList, HandMetal, Droplets, Wind, Iron, PackageOpen, Home,
  ChevronLeft, Sparkles, BarChart3, Timer, ArrowUpRight, ArrowDownRight,
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
  LISTO: 'Listo', ENTREGADO: 'Entregado',
  RECIBIDA: 'Recibida', EN_PROCESO: 'En proceso', LAVADA: 'Lavada',
  ASIGNADA: 'Asignada', EN_CAMINO: 'En camino',
}
const STATUS_COLORS: Record<string, string> = {
  PENDIENTE: 'bg-amber-50 text-amber-700 border-amber-200',
  RECOGIDO: 'bg-sky-50 text-sky-700 border-sky-200',
  EN_LAVADO: 'bg-violet-50 text-violet-700 border-violet-200',
  LISTO: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ENTREGADO: 'bg-slate-100 text-slate-500 border-slate-200',
  RECIBIDA: 'bg-amber-50 text-amber-700 border-amber-200',
  EN_PROCESO: 'bg-violet-50 text-violet-700 border-violet-200',
  LAVADA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ASIGNADA: 'bg-sky-50 text-sky-700 border-sky-200',
  EN_CAMINO: 'bg-orange-50 text-orange-700 border-orange-200',
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

// Journey steps with icons and colors
const JOURNEY_STEPS = [
  { key: 'PENDIENTE', label: 'Pedido', icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-500' },
  { key: 'RECOGIDO', label: 'Recogida', icon: HandMetal, color: 'text-sky-500', bg: 'bg-sky-500' },
  { key: 'EN_LAVADO', label: 'Lavado', icon: Droplets, color: 'text-violet-500', bg: 'bg-violet-500' },
  { key: 'LISTO', label: 'Listo', icon: PackageCheck, color: 'text-emerald-500', bg: 'bg-emerald-500' },
  { key: 'ENTREGADO', label: 'Entregado', icon: Home, color: 'text-slate-400', bg: 'bg-slate-400' },
]

/* ══════════ Reusable Components ══════════ */
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto border shadow-2xl bg-white" onClick={e => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={onClose}><X className="h-4 w-4" /></Button>
        </CardHeader>
        <CardContent className="pt-4">{children}</CardContent>
      </Card>
    </div>
  )
}

function JourneyTracker({ status, size = 'md', showLabels = true }: { status: string; size?: 'sm' | 'md' | 'lg'; showLabels?: boolean }) {
  const currentIdx = STATUS_FLOW.indexOf(status)
  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4'
  const dotSize = size === 'sm' ? 'w-7 h-7' : size === 'lg' ? 'w-11 h-11' : 'w-9 h-9'
  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-sm' : 'text-xs'
  return (
    <div className="flex items-center w-full">
      {JOURNEY_STEPS.map((step, i) => {
        const StepIcon = step.icon
        const isCompleted = currentIdx > i
        const isCurrent = currentIdx === i
        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className={`${dotSize} rounded-full flex items-center justify-center transition-all duration-500 ${isCompleted || isCurrent ? step.bg + ' text-white shadow-md' : 'bg-slate-100 text-slate-300'}`}>
                <StepIcon className={iconSize} />
              </div>
              {showLabels && <span className={`${textSize} font-medium ${isCurrent ? 'text-slate-900' : isCompleted ? 'text-slate-500' : 'text-slate-300'}`}>{step.label}</span>}
            </div>
            {i < JOURNEY_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-1 rounded-full transition-all duration-500 ${currentIdx > i ? step.bg : 'bg-slate-100'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function StatCard({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string | number; trend?: 'up' | 'down'; color: string }) {
  return (
    <Card className="border border-slate-200/60 bg-white hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
          </div>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>{icon}</div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trend === 'up' ? <ArrowUpRight className="h-3 w-3 text-emerald-500" /> : <ArrowDownRight className="h-3 w-3 text-red-500" />}
            <span className={`text-xs font-medium ${trend === 'up' ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend === 'up' ? '+12%' : '-5%'} vs ayer
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return <div className="space-y-1.5"><Label className="text-xs font-medium text-slate-600">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</Label>{children}</div>
}

function StatusBadge({ status }: { status: string }) {
  return <Badge variant="outline" className={`${STATUS_COLORS[status] || 'bg-slate-50 text-slate-500'} px-2.5 py-0.5 text-[11px] font-medium rounded-md`}>{STATUS_LABELS[status] || status}</Badge>
}

function EmptyState({ icon, msg }: { icon: React.ReactNode; msg: string }) {
  return <div className="text-center py-12 text-slate-400"><div className="opacity-30 mx-auto mb-3">{icon}</div><p className="text-sm">{msg}</p></div>
}

function SectionHeader({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        {description && <p className="text-sm text-slate-500 mt-0.5">{description}</p>}
      </div>
      {action}
    </div>
  )
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

  // Admin/Worker tab
  const [activeTab, setActiveTab] = useState('dashboard')
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
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Form states
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
      setActiveTab(data.role === 'CLIENT' ? 'orders' : 'dashboard')
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

  // Generic CRUD
  const crud = async (url: string, method: string, body?: object) => {
    setLoading(true)
    try {
      const { data, ok } = await apiFetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
      })
      if (ok) { toast.success('Operación exitosa'); fetchAdminData(); fetchStats(); fetchOrders() }
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
    setUser(null); setOrders([]); setStats(null); setActiveTab('dashboard')
    setLoginEmail(''); setLoginPassword('')
  }

  // Sidebar nav items
  const adminTabs = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'journey', label: 'Journey', icon: Route },
    { key: 'orders', label: 'Pedidos', icon: ShoppingBag },
    { key: 'users', label: 'Usuarios', icon: Users },
    { key: 'garments', label: 'Prendas', icon: Shirt },
    { key: 'inventory', label: 'Inventario', icon: Boxes },
    { key: 'materials', label: 'Materiales', icon: FlaskConical },
    { key: 'deliveries', label: 'Entregas', icon: Truck },
  ]
  const workerTabs = [
    { key: 'active', label: 'Activas', icon: RefreshCw },
    { key: 'completed', label: 'Completadas', icon: CheckCircle2 },
  ]
  const clientTabs = [
    { key: 'new', label: 'Nuevo Pedido', icon: Plus },
    { key: 'orders', label: 'Mis Pedidos', icon: Package },
  ]

  const currentTabs = user?.role === 'ADMIN' ? adminTabs : user?.role === 'WORKER' ? workerTabs : clientTabs

  const openOrderDetail = async (orderId: string) => {
    const { data } = await apiFetch(`/api/orders?include=garments`)
    const full = data.find((o: OrderData) => o.id === orderId)
    if (full) { setSelectedOrder(full); setShowOrderDetail(true) }
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
          <Shirt className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base tracking-tight">LavaClean</h1>
          <p className="text-slate-400 text-[10px] font-medium uppercase tracking-widest">SaaS Platform</p>
        </div>
      </div>
      <Separator className="bg-slate-700/50" />

      {/* Nav */}
      <ScrollArea className="flex-1 py-3 px-3">
        <nav className="space-y-1">
          {currentTabs.map(t => {
            const Icon = t.icon
            const isActive = activeTab === t.key
            return (
              <button
                key={t.key}
                onClick={() => { setActiveTab(t.key); setSidebarOpen(false) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-white/10 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-emerald-400' : ''}`} />
                {t.label}
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400" />}
              </button>
            )
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-slate-700/50" />
      {/* User */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${
            user?.role === 'ADMIN' ? 'bg-amber-500/20 text-amber-400' : user?.role === 'WORKER' ? 'bg-violet-500/20 text-violet-400' : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            {user?.name?.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name}</p>
            <p className="text-[11px] text-slate-400 truncate">{user?.role === 'CLIENT' ? 'Cliente' : user?.role === 'ADMIN' ? 'Administrador' : 'Operario'}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg" onClick={logout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )

  /* ══════════ LOGIN SCREEN ══════════ */
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-slate-500/5 rounded-full blur-3xl" />
        </div>
        <Card className="w-full max-w-sm relative z-10 bg-slate-900 border-slate-800">
          <CardHeader className="text-center pb-2 pt-8">
            <div className="mx-auto w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
              <Shirt className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white tracking-tight">LavaClean</CardTitle>
            <CardDescription className="text-slate-400">Inicia sesión para continuar</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-8 pb-8">
            <Field label="Correo electrónico">
              <Input type="email" placeholder="tu@correo.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11" />
            </Field>
            <Field label="Contraseña">
              <Input type="password" placeholder="••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-11" />
            </Field>
            <Button onClick={handleLogin} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 font-medium rounded-lg shadow-lg shadow-emerald-500/20">
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </Button>
            <div className="pt-4 border-t border-slate-800">
              <p className="text-[10px] text-slate-500 text-center mb-3 uppercase tracking-wider font-medium">Cuentas de prueba</p>
              <div className="space-y-1.5">
                {[
                  { email: 'cliente@lavanderia.com', role: 'Cliente', color: 'text-emerald-400' },
                  { email: 'admin@lavanderia.com', role: 'Administrador', color: 'text-amber-400' },
                  { email: 'operario@lavanderia.com', role: 'Operario', color: 'text-violet-400' },
                ].map(acc => (
                  <button key={acc.email} onClick={() => { setLoginEmail(acc.email); setLoginPassword('1234') }}
                    className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 transition-colors text-left w-full">
                    <div className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-500" /><span className="text-sm text-slate-300">{acc.role}</span></div>
                    <span className={`text-xs ${acc.color} font-mono`}>{acc.email}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-600 text-center mt-2">Contraseña: 1234</p>
            </div>
          </CardContent>
        </Card>
        <Toaster position="top-center" />
      </div>
    )
  }

  /* ══════════ APP LAYOUT (Sidebar + Content) ══════════ */
  return (
    <div className="h-screen flex bg-slate-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-slate-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-64 p-0 bg-slate-900 border-slate-800">
          <SheetTitle className="sr-only">Navegación</SheetTitle>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-slate-200 bg-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden h-9 w-9" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5 text-slate-600" />
            </Button>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {currentTabs.find(t => t.key === activeTab)?.label || 'Dashboard'}
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-[10px] font-medium rounded-md ${
              user.role === 'ADMIN' ? 'border-amber-200 bg-amber-50 text-amber-700' : user.role === 'WORKER' ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}>
              {user.role === 'CLIENT' ? 'Cliente' : user.role === 'ADMIN' ? 'Admin' : 'Operario'}
            </Badge>
          </div>
        </header>

        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="max-w-6xl mx-auto space-y-6">

            {/* ══════════ CLIENT SCREEN ══════════ */}
            {user.role === 'CLIENT' && activeTab === 'new' && (
              <>
                <SectionHeader title="Solicitar Servicio" description="Completa los datos para pedir tu servicio de lavandería" />
                <Card className="border border-slate-200/60 bg-white">
                  <CardContent className="pt-6 space-y-5">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Field label="Tipo de servicio" required>
                        <Select value={formService} onValueChange={setFormService}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="LAVADO">Lavado — {formatPrice(15000)}</SelectItem>
                            <SelectItem value="SECADO">Secado — {formatPrice(10000)}</SelectItem>
                            <SelectItem value="PLANCHADO">Planchado — {formatPrice(12000)}</SelectItem>
                            <SelectItem value="COMPLETO">Completo — {formatPrice(30000)}</SelectItem>
                          </SelectContent>
                        </Select>
                      </Field>
                      <Field label="Fecha de recogida" required><Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="h-10" /></Field>
                      <Field label="Hora de recogida" required><Input type="time" value={formTime} onChange={e => setFormTime(e.target.value)} className="h-10" /></Field>
                      <Field label="Notas adicionales"><Textarea placeholder="Instrucciones especiales..." value={formNotes} onChange={e => setFormNotes(e.target.value)} className="h-10" /></Field>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium text-slate-600">Prendas a lavar</Label>
                        <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={() => setFormGarments(p => [...p, { type: '', color: '', quantity: 1 }])}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
                      </div>
                      {formGarments.map((g, idx) => (
                        <div key={idx} className="flex gap-2 items-end">
                          <div className="flex-1"><Label className="text-[10px] text-slate-500">Tipo</Label>
                            <Select value={g.type} onValueChange={v => { const n = [...formGarments]; n[idx].type = v; setFormGarments(n) }}>
                              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Tipo..." /></SelectTrigger>
                              <SelectContent>{GARMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                          </div>
                          <div className="w-28"><Label className="text-[10px] text-slate-500">Color</Label><Input className="h-9 text-sm" placeholder="Blanco" value={g.color} onChange={e => { const n = [...formGarments]; n[idx].color = e.target.value; setFormGarments(n) }} /></div>
                          <div className="w-20"><Label className="text-[10px] text-slate-500">Cant.</Label><Input type="number" min={1} className="h-9 text-sm" value={g.quantity} onChange={e => { const n = [...formGarments]; n[idx].quantity = parseInt(e.target.value) || 1; setFormGarments(n) }} /></div>
                          {formGarments.length > 1 && <Button variant="ghost" size="icon" className="h-9 w-9 text-red-400 hover:text-red-600" onClick={() => setFormGarments(p => p.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                      ))}
                    </div>
                    <Button onClick={handleCreateOrder} disabled={loading || !formService || !formDate || !formTime} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-11 font-medium rounded-lg">
                      Crear pedido
                    </Button>
                  </CardContent>
                </Card>
              </>
            )}

            {user.role === 'CLIENT' && activeTab === 'orders' && (
              <>
                <SectionHeader title="Mis Pedidos" description="Sigue el estado de tus pedidos en tiempo real" />
                {orders.length === 0 ? (
                  <Card className="border border-slate-200/60 bg-white"><CardContent><EmptyState icon={<Package className="h-10 w-10" />} msg="No tienes pedidos aún" /></CardContent></Card>
                ) : (
                  <div className="space-y-4">
                    {orders.map(order => (
                      <Card key={order.id} className="border border-slate-200/60 bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-slate-900">{SERVICE_LABELS[order.serviceType]}</span>
                                <StatusBadge status={order.status} />
                                <span className="text-sm font-bold text-slate-900 ml-auto">{formatPrice(order.price)}</span>
                              </div>
                              <p className="text-xs text-slate-400 mt-1">{order.pickupDate} a las {order.pickupTime}</p>
                              {order.notes && <p className="text-xs text-slate-400 mt-1 italic">&ldquo;{order.notes}&rdquo;</p>}
                              {order.garments && order.garments.length > 0 && (
                                <div className="flex gap-1.5 mt-2 flex-wrap">{order.garments.map(g => <Badge key={g.id} variant="secondary" className="text-[11px] rounded-md">{g.type}{g.color ? ` (${g.color})` : ''} x{g.quantity}</Badge>)}</div>
                              )}
                            </div>
                          </div>
                          <JourneyTracker status={order.status} size="sm" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ══════════ WORKER SCREEN ══════════ */}
            {user.role === 'WORKER' && activeTab === 'active' && (() => {
              const activeOrders = orders.filter(o => o.status !== 'ENTREGADO')
              return (
                <>
                  <div className="flex items-center justify-between">
                    <SectionHeader title="Órdenes Activas" description={`${activeOrders.length} órdenes en proceso`} />
                    <Button variant="outline" size="sm" className="h-9" onClick={() => fetchOrders()}><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Actualizar</Button>
                  </div>
                  {activeOrders.length === 0 ? (
                    <Card className="border border-slate-200/60 bg-white"><CardContent><EmptyState icon={<CheckCircle2 className="h-10 w-10" />} msg="Todas las órdenes están completadas" /></CardContent></Card>
                  ) : (
                    <div className="space-y-4">
                      {activeOrders.map(order => {
                        const next = getNextStatus(order.status)
                        return (
                          <Card key={order.id} className="border border-slate-200/60 bg-white hover:shadow-md transition-shadow">
                            <CardContent className="p-5 space-y-4">
                              <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-semibold text-slate-900">{order.clientName}</span>
                                    <Badge variant="secondary" className="rounded-md text-[11px]">{SERVICE_LABELS[order.serviceType]}</Badge>
                                    <StatusBadge status={order.status} />
                                    <span className="text-sm font-bold text-slate-900 sm:ml-auto">{formatPrice(order.price)}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 mt-1">Recogida: {order.pickupDate} a las {order.pickupTime}</p>
                                  {order.notes && <p className="text-xs text-slate-400 mt-0.5 italic">&ldquo;{order.notes}&rdquo;</p>}
                                  {order.garments && order.garments.length > 0 && (
                                    <div className="flex gap-1.5 mt-2 flex-wrap">{order.garments.map(g => <Badge key={g.id} variant="outline" className="text-[11px] rounded-md">{g.type} x{g.quantity}</Badge>)}</div>
                                  )}
                                </div>
                              </div>
                              <JourneyTracker status={order.status} />
                              {next && (
                                <Button onClick={() => handleChangeStatus(order.id, next)} disabled={loading} className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 text-white h-10 font-medium rounded-lg">
                                  <ChevronRight className="h-4 w-4" /><span className="ml-1">Avanzar a: {STATUS_LABELS[next]}</span>
                                </Button>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                    </div>
                  )}
                </>
              )
            })()}

            {user.role === 'WORKER' && activeTab === 'completed' && (() => {
              const completedOrders = orders.filter(o => o.status === 'ENTREGADO')
              return (
                <>
                  <SectionHeader title="Órdenes Completadas" description={`${completedOrders.length} entregas finalizadas`} />
                  {completedOrders.length === 0 ? (
                    <Card className="border border-slate-200/60 bg-white"><CardContent><EmptyState icon={<Package className="h-10 w-10" />} msg="Sin entregas completadas" /></CardContent></Card>
                  ) : (
                    <div className="space-y-2">
                      {completedOrders.map(o => (
                        <Card key={o.id} className="border border-slate-200/60 bg-white">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-slate-400" /></div>
                              <div><p className="font-medium text-sm text-slate-700">{o.clientName}</p><p className="text-xs text-slate-400">{SERVICE_LABELS[o.serviceType]} · {formatPrice(o.price)}</p></div>
                            </div>
                            <StatusBadge status="ENTREGADO" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}

            {/* ══════════ ADMIN: DASHBOARD ══════════ */}
            {user.role === 'ADMIN' && activeTab === 'dashboard' && stats && (
              <>
                <SectionHeader title="Panel de Control" description="Resumen general de la operación" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<DollarSign className="h-5 w-5 text-white" />} label="Ingresos Hoy" value={formatPrice(stats.todayRevenue)} color="bg-emerald-500" trend="up" />
                  <StatCard icon={<TrendingUp className="h-5 w-5 text-white" />} label="Ingresos Totales" value={formatPrice(stats.totalRevenue)} color="bg-slate-800" />
                  <StatCard icon={<Package className="h-5 w-5 text-white" />} label="Pedidos Hoy" value={stats.todayOrders} color="bg-sky-500" trend="up" />
                  <StatCard icon={<BarChart3 className="h-5 w-5 text-white" />} label="Total Pedidos" value={stats.totalOrders} color="bg-violet-500" />
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard icon={<Users className="h-5 w-5 text-white" />} label="Usuarios" value={stats.totalUsers} color="bg-amber-500" />
                  <StatCard icon={<Shirt className="h-5 w-5 text-white" />} label="Prendas" value={stats.totalGarments} color="bg-pink-500" />
                  <StatCard icon={<AlertCircle className="h-5 w-5 text-white" />} label="Stock Bajo" value={stats.lowStockItems} color="bg-red-500" />
                  <StatCard icon={<Truck className="h-5 w-5 text-white" />} label="Entregas Pend." value={stats.pendingDeliveries} color="bg-orange-500" />
                </div>
                <Card className="border border-slate-200/60 bg-white">
                  <CardHeader className="pb-3"><CardTitle className="text-sm font-semibold text-slate-900">Distribución por Estado</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_FLOW.map(s => {
                        const count = stats.statusCounts[s] || 0
                        return (
                          <div key={s} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-100 bg-slate-50/50">
                            <div className={`w-2 h-2 rounded-full ${JOURNEY_STEPS.find(j => j.key === s)?.bg || 'bg-slate-300'}`} />
                            <span className="text-xs text-slate-500">{STATUS_LABELS[s]}</span>
                            <span className="text-sm font-bold text-slate-900">{count}</span>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* ══════════ ADMIN: JOURNEY ══════════ */}
            {user.role === 'ADMIN' && activeTab === 'journey' && (
              <>
                <SectionHeader title="Journey de Pedidos" description="Vista pipeline del recorrido de cada pedido en tiempo real" />
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {JOURNEY_STEPS.map(step => {
                    const stepOrders = orders.filter(o => o.status === step.key)
                    return (
                      <div key={step.key} className="space-y-3">
                        <div className="flex items-center gap-2 px-1">
                          <div className={`w-7 h-7 rounded-lg ${step.bg} flex items-center justify-center shadow-sm`}>
                            <step.icon className="h-3.5 w-3.5 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-900">{step.label}</p>
                            <p className="text-[10px] text-slate-400">{stepOrders.length} pedidos</p>
                          </div>
                        </div>
                        <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                          {stepOrders.map(o => (
                            <Card key={o.id} className="border border-slate-200/60 bg-white hover:shadow-sm transition-shadow cursor-pointer" onClick={() => openOrderDetail(o.id)}>
                              <CardContent className="p-3 space-y-2">
                                <p className="text-xs font-semibold text-slate-900 truncate">{o.clientName}</p>
                                <div className="flex items-center justify-between">
                                  <Badge variant="secondary" className="text-[10px] rounded-md">{SERVICE_LABELS[o.serviceType]}</Badge>
                                  <span className="text-xs font-bold text-emerald-600">{formatPrice(o.price)}</span>
                                </div>
                                <p className="text-[10px] text-slate-400">{o.pickupDate} · {o.pickupTime}</p>
                                {o.garments && o.garments.length > 0 && (
                                  <div className="flex gap-1 flex-wrap">{o.garments.slice(0, 3).map(g => <Badge key={g.id} variant="outline" className="text-[9px] rounded px-1.5 py-0">{g.type}</Badge>)}
                                    {o.garments.length > 3 && <span className="text-[9px] text-slate-400">+{o.garments.length - 3}</span>}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                          {stepOrders.length === 0 && <p className="text-[10px] text-slate-300 text-center py-4">Vacío</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* ══════════ ADMIN: PEDIDOS ══════════ */}
            {user.role === 'ADMIN' && activeTab === 'orders' && (
              <>
                <SectionHeader title="Todas las Órdenes" description={`${orders.length} pedidos registrados`} />
                {orders.length === 0 ? (
                  <Card className="border border-slate-200/60 bg-white"><CardContent><EmptyState icon={<ShoppingBag className="h-10 w-10" />} msg="No hay pedidos" /></CardContent></Card>
                ) : (
                  <Card className="border border-slate-200/60 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cliente</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Servicio</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Fecha</th>
                            <th className="text-right px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Precio</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {orders.map(order => (
                            <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-900">{order.clientName}</td>
                              <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{SERVICE_LABELS[order.serviceType]}</td>
                              <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                              <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{order.pickupDate}</td>
                              <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatPrice(order.price)}</td>
                              <td className="px-4 py-3"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openOrderDetail(order.id)}><Eye className="h-4 w-4 text-slate-400" /></Button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ══════════ ADMIN: USUARIOS ══════════ */}
            {user.role === 'ADMIN' && activeTab === 'users' && (
              <>
                <SectionHeader title="Gestión de Usuarios" description={`${users.length} usuarios registrados`} action={<Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-9" onClick={() => openUserModal()}><Plus className="h-3.5 w-3.5 mr-1.5" />Nuevo</Button>} />
                <Card className="border border-slate-200/60 bg-white overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Nombre</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Correo</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Rol</th>
                          <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Teléfono</th>
                          <th className="px-4 py-3"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {users.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  u.role === 'ADMIN' ? 'bg-amber-100 text-amber-700' : u.role === 'WORKER' ? 'bg-violet-100 text-violet-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>{u.name.charAt(0)}</div>
                                <span className="font-medium text-slate-900">{u.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{u.email}</td>
                            <td className="px-4 py-3">
                              <Badge className={`text-[10px] rounded-md font-medium ${
                                u.role === 'ADMIN' ? 'bg-amber-50 text-amber-700 border-amber-200' : u.role === 'WORKER' ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              }`} variant="outline">{u.role === 'CLIENT' ? 'Cliente' : u.role === 'ADMIN' ? 'Admin' : 'Operario'}</Badge>
                            </td>
                            <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{u.phone || '—'}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openUserModal(u)}><Edit3 className="h-3.5 w-3.5 text-slate-400" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deleteUser(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </>
            )}

            {/* ══════════ ADMIN: PRENDAS ══════════ */}
            {user.role === 'ADMIN' && activeTab === 'garments' && (
              <>
                <SectionHeader title="Prendas por Pedido" description="Selecciona un pedido para ver sus prendas" />
                <Card className="border border-slate-200/60 bg-white">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex gap-2">
                      <Select value="" onValueChange={v => v && openOrderDetail(v)}>
                        <SelectTrigger className="max-w-xs h-10"><SelectValue placeholder="Buscar pedido..." /></SelectTrigger>
                        <SelectContent>{orders.map(o => <SelectItem key={o.id} value={o.id}>{o.clientName} — {SERVICE_LABELS[o.serviceType]} ({o.pickupDate})</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    {selectedOrder && (
                      <div className="space-y-4">
                        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-slate-900">{selectedOrder.clientName}</span>
                            <StatusBadge status={selectedOrder.status} />
                            <Badge variant="secondary" className="rounded-md text-[11px]">{SERVICE_LABELS[selectedOrder.serviceType]}</Badge>
                          </div>
                          <div className="mt-3"><JourneyTracker status={selectedOrder.status} size="sm" /></div>
                        </div>
                        {selectedOrder.garments && selectedOrder.garments.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b border-slate-100 bg-slate-50/50">
                                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Prenda</th>
                                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Color</th>
                                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Marca</th>
                                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Cant.</th>
                                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Estado</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-50">
                                {selectedOrder.garments.map(g => (
                                  <tr key={g.id} className="hover:bg-slate-50/50">
                                    <td className="px-4 py-3 font-medium text-slate-900">{g.type}</td>
                                    <td className="px-4 py-3 text-slate-500">{g.color || '—'}</td>
                                    <td className="px-4 py-3 text-slate-400 hidden sm:table-cell">{g.brand || '—'}</td>
                                    <td className="px-4 py-3 text-slate-500">x{g.quantity}</td>
                                    <td className="px-4 py-3"><StatusBadge status={g.status} /></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : <p className="text-sm text-slate-400 text-center py-6">Este pedido no tiene prendas registradas</p>}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* ══════════ ADMIN: INVENTARIO ══════════ */}
            {user.role === 'ADMIN' && activeTab === 'inventory' && (
              <>
                <SectionHeader title="Inventario" description={`${inventory.length} items registrados`} action={<Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-9" onClick={() => openInvModal()}><Plus className="h-3.5 w-3.5 mr-1.5" />Nuevo</Button>} />
                {inventory.length === 0 ? (
                  <Card className="border border-slate-200/60 bg-white"><CardContent><EmptyState icon={<Warehouse className="h-10 w-10" />} msg="Inventario vacío" /></CardContent></Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {inventory.map(item => (
                      <Card key={item.id} className={`border bg-white hover:shadow-md transition-shadow ${item.quantity <= item.minStock ? 'border-red-200' : 'border-slate-200/60'}`}>
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                              <Badge variant="secondary" className="text-[10px] rounded-md mt-1">{item.category}</Badge>
                            </div>
                            {item.quantity <= item.minStock && <Badge className="bg-red-50 text-red-600 border-red-200 text-[10px] rounded-md">Bajo</Badge>}
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <div><p className="text-[10px] text-slate-400 uppercase">Stock</p><p className="text-sm font-bold text-slate-900">{item.quantity} <span className="text-[10px] font-normal text-slate-400">{item.unit}</span></p></div>
                            <div><p className="text-[10px] text-slate-400 uppercase">Mínimo</p><p className="text-sm text-slate-600">{item.minStock}</p></div>
                            <div><p className="text-[10px] text-slate-400 uppercase">Costo</p><p className="text-sm text-slate-600">{formatPrice(item.cost)}</p></div>
                          </div>
                          <div className="flex items-center gap-1 pt-1 border-t border-slate-50">
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-400" onClick={() => openInvModal(item)}><Edit3 className="h-3 w-3 mr-1" />Editar</Button>
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-red-400 hover:text-red-600 ml-auto" onClick={() => deleteInv(item.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ══════════ ADMIN: MATERIALES ══════════ */}
            {user.role === 'ADMIN' && activeTab === 'materials' && (
              <>
                <SectionHeader title="Materiales" description={`${materials.length} materiales registrados`} action={<Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-white h-9" onClick={() => openMatModal()}><Plus className="h-3.5 w-3.5 mr-1.5" />Nuevo</Button>} />
                {materials.length === 0 ? (
                  <Card className="border border-slate-200/60 bg-white"><CardContent><EmptyState icon={<FlaskConical className="h-10 w-10" />} msg="Sin materiales registrados" /></CardContent></Card>
                ) : (
                  <Card className="border border-slate-200/60 bg-white overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50/50">
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Material</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Categoría</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Stock</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Costo/U</th>
                            <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Proveedor</th>
                            <th className="px-4 py-3"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {materials.map(m => (
                            <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-4 py-3 font-medium text-slate-900">{m.name}</td>
                              <td className="px-4 py-3 text-slate-400 hidden sm:table-cell"><Badge variant="secondary" className="text-[10px] rounded-md">{m.category}</Badge></td>
                              <td className="px-4 py-3 text-slate-600">{m.quantity} {m.unit}</td>
                              <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{formatPrice(m.costPerUnit)}</td>
                              <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{m.supplier || '—'}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openMatModal(m)}><Edit3 className="h-3.5 w-3.5 text-slate-400" /></Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deleteMat(m.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                )}
              </>
            )}

            {/* ══════════ ADMIN: ENTREGAS ══════════ */}
            {user.role === 'ADMIN' && activeTab === 'deliveries' && (
              <>
                <SectionHeader title="Gestión de Entregas" description={`${deliveries.length} entregas registradas`} action={
                  <Select value="" onValueChange={v => v && openDelModal(undefined, v)}>
                    <SelectTrigger className="w-44 h-9 text-xs"><SelectValue placeholder="Nueva entrega..." /></SelectTrigger>
                    <SelectContent>{orders.filter(o => o.status === 'LISTO' && !deliveries.find(d => d.orderId === o.id)).map(o => (
                      <SelectItem key={o.id} value={o.id}>{o.clientName} — {SERVICE_LABELS[o.serviceType]}</SelectItem>
                    ))}</SelectContent>
                  </Select>
                } />
                {deliveries.length === 0 ? (
                  <Card className="border border-slate-200/60 bg-white"><CardContent><EmptyState icon={<Truck className="h-10 w-10" />} msg="Sin entregas registradas" /></CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {deliveries.map(d => (
                      <Card key={d.id} className="border border-slate-200/60 bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm text-slate-900">{d.order?.clientName || 'N/A'}</span>
                                <StatusBadge status={d.status} />
                                {d.order && <Badge variant="secondary" className="text-[10px] rounded-md">{SERVICE_LABELS[d.order.serviceType]}</Badge>}
                              </div>
                              <p className="text-xs text-slate-400 mt-1">Conductor: {d.driverName || 'Sin asignar'}{d.address ? ` · ${d.address}` : ''}{d.deliveredAt ? ` · Entregado: ${fmtDate(d.deliveredAt)}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {d.status !== 'ENTREGADO' && (() => { const next = getNextStatus(d.status, DELIVERY_FLOW); return next ? (
                                <Button size="sm" variant="outline" onClick={() => changeDelStatus(d.id, next)} className="text-[11px] h-8 border-slate-200">
                                  <ChevronRight className="h-3 w-3 mr-0.5" /> {STATUS_LABELS[next]}
                                </Button>
                              ) : null })()}
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openDelModal(d)}><Edit3 className="h-3.5 w-3.5 text-slate-400" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => deleteDel(d.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </div>
                          <JourneyTracker status={d.status === 'ENTREGADO' ? 'ENTREGADO' : d.status === 'EN_CAMINO' ? 'LISTO' : d.status === 'ASIGNADA' ? 'RECOGIDO' : 'PENDIENTE'} size="sm" showLabels={false} />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        </main>
      </div>

      {/* ═══ MODALS ═══ */}
      <Modal open={showUserModal} onClose={() => setShowUserModal(false)} title={editId ? 'Editar Usuario' : 'Nuevo Usuario'}>
        <div className="space-y-3">
          <Field label="Nombre" required><Input value={userForm.name} onChange={e => setUserForm({ ...userForm, name: e.target.value })} className="h-10" /></Field>
          <Field label="Correo" required><Input type="email" value={userForm.email} onChange={e => setUserForm({ ...userForm, email: e.target.value })} className="h-10" /></Field>
          <Field label="Rol" required>
            <Select value={userForm.role} onValueChange={v => setUserForm({ ...userForm, role: v })}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="CLIENT">Cliente</SelectItem><SelectItem value="ADMIN">Administrador</SelectItem><SelectItem value="WORKER">Operario</SelectItem></SelectContent>
            </Select>
          </Field>
          <Field label="Teléfono"><Input value={userForm.phone} onChange={e => setUserForm({ ...userForm, phone: e.target.value })} className="h-10" /></Field>
          <Field label="Dirección"><Input value={userForm.address} onChange={e => setUserForm({ ...userForm, address: e.target.value })} className="h-10" /></Field>
          <Field label="Contraseña"><Input type="password" value={userForm.password} onChange={e => setUserForm({ ...userForm, password: e.target.value })} className="h-10" /></Field>
          <Button onClick={saveUser} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-10 font-medium rounded-lg mt-2"><Save className="h-4 w-4 mr-1.5" />Guardar</Button>
        </div>
      </Modal>

      <Modal open={showInvModal} onClose={() => setShowInvModal(false)} title={editId ? 'Editar Item' : 'Nuevo Item de Inventario'}>
        <div className="space-y-3">
          <Field label="Nombre" required><Input value={invForm.name} onChange={e => setInvForm({ ...invForm, name: e.target.value })} className="h-10" /></Field>
          <Field label="Categoría">
            <Select value={invForm.category} onValueChange={v => setInvForm({ ...invForm, category: v })}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>{INV_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad"><Input type="number" value={invForm.quantity} onChange={e => setInvForm({ ...invForm, quantity: parseInt(e.target.value) || 0 })} className="h-10" /></Field>
            <Field label="Unidad"><Input value={invForm.unit} onChange={e => setInvForm({ ...invForm, unit: e.target.value })} className="h-10" /></Field>
            <Field label="Stock mínimo"><Input type="number" value={invForm.minStock} onChange={e => setInvForm({ ...invForm, minStock: parseInt(e.target.value) || 0 })} className="h-10" /></Field>
            <Field label="Costo"><Input type="number" value={invForm.cost} onChange={e => setInvForm({ ...invForm, cost: parseFloat(e.target.value) || 0 })} className="h-10" /></Field>
          </div>
          <Button onClick={saveInv} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-10 font-medium rounded-lg mt-2"><Save className="h-4 w-4 mr-1.5" />Guardar</Button>
        </div>
      </Modal>

      <Modal open={showMatModal} onClose={() => setShowMatModal(false)} title={editId ? 'Editar Material' : 'Nuevo Material'}>
        <div className="space-y-3">
          <Field label="Nombre" required><Input value={matForm.name} onChange={e => setMatForm({ ...matForm, name: e.target.value })} className="h-10" /></Field>
          <Field label="Categoría">
            <Select value={matForm.category} onValueChange={v => setMatForm({ ...matForm, category: v })}>
              <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
              <SelectContent>{MAT_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Cantidad"><Input type="number" step="0.1" value={matForm.quantity} onChange={e => setMatForm({ ...matForm, quantity: parseFloat(e.target.value) || 0 })} className="h-10" /></Field>
            <Field label="Unidad"><Input value={matForm.unit} onChange={e => setMatForm({ ...matForm, unit: e.target.value })} className="h-10" /></Field>
            <Field label="Costo/Unidad"><Input type="number" value={matForm.costPerUnit} onChange={e => setMatForm({ ...matForm, costPerUnit: parseFloat(e.target.value) || 0 })} className="h-10" /></Field>
            <Field label="Proveedor"><Input value={matForm.supplier} onChange={e => setMatForm({ ...matForm, supplier: e.target.value })} className="h-10" /></Field>
          </div>
          <Button onClick={saveMat} disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-10 font-medium rounded-lg mt-2"><Save className="h-4 w-4 mr-1.5" />Guardar</Button>
        </div>
      </Modal>

      <Modal open={showDelModal} onClose={() => setShowDelModal(false)} title={editId ? 'Editar Entrega' : 'Nueva Entrega'}>
        <div className="space-y-3">
          {!editId && (
            <Field label="Pedido" required>
              <Select value={delForm.orderId} onValueChange={v => setDelForm({ ...delForm, orderId: v })}>
                <SelectTrigger className="h-10"><SelectValue placeholder="Seleccionar pedido..." /></SelectTrigger>
                <SelectContent>{orders.filter(o => o.status === 'LISTO' && !deliveries.find(d => d.orderId === o.id)).map(o => (
                  <SelectItem key={o.id} value={o.id}>{o.clientName} — {SERVICE_LABELS[o.serviceType]}</SelectItem>
                ))}</SelectContent>
              </Select>
            </Field>
          )}
          <Field label="Conductor"><Input value={delForm.driverName} onChange={e => setDelForm({ ...delForm, driverName: e.target.value })} placeholder="Nombre del conductor" className="h-10" /></Field>
          <Field label="Dirección de entrega"><Input value={delForm.address} onChange={e => setDelForm({ ...delForm, address: e.target.value })} placeholder="Dirección" className="h-10" /></Field>
          <Field label="Notas"><Textarea value={delForm.notes} onChange={e => setDelForm({ ...delForm, notes: e.target.value })} /></Field>
          <Button onClick={saveDel} disabled={loading || !delForm.orderId} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white h-10 font-medium rounded-lg mt-2"><Save className="h-4 w-4 mr-1.5" />Guardar</Button>
        </div>
      </Modal>

      <Modal open={showOrderDetail} onClose={() => setShowOrderDetail(false)} title="Detalle del Pedido">
        {selectedOrder && (
          <div className="space-y-4">
            <JourneyTracker status={selectedOrder.status} />
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-[10px] text-slate-400 uppercase font-medium">Cliente</p><p className="font-semibold text-sm text-slate-900">{selectedOrder.clientName}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium">Estado</p><StatusBadge status={selectedOrder.status} /></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium">Servicio</p><p className="text-sm text-slate-700">{SERVICE_LABELS[selectedOrder.serviceType]}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium">Precio</p><p className="font-bold text-emerald-600">{formatPrice(selectedOrder.price)}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium">Recogida</p><p className="text-sm text-slate-700">{selectedOrder.pickupDate} a las {selectedOrder.pickupTime}</p></div>
              <div><p className="text-[10px] text-slate-400 uppercase font-medium">Creado</p><p className="text-sm text-slate-500">{fmtDate(selectedOrder.createdAt)}</p></div>
            </div>
            {selectedOrder.notes && <div><p className="text-[10px] text-slate-400 uppercase font-medium mb-1">Notas</p><p className="text-sm italic text-slate-500">&ldquo;{selectedOrder.notes}&rdquo;</p></div>}
            <div>
              <p className="text-[10px] text-slate-400 uppercase font-medium mb-2">Prendas ({selectedOrder.garments?.length || 0})</p>
              {selectedOrder.garments && selectedOrder.garments.length > 0 ? (
                <div className="space-y-1.5">{selectedOrder.garments.map(g => (
                  <div key={g.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                    <span className="text-sm text-slate-700">{g.type} {g.color ? `(${g.color})` : ''}</span>
                    <div className="flex items-center gap-2"><span className="text-xs text-slate-400">x{g.quantity}</span><StatusBadge status={g.status} /></div>
                  </div>
                ))}</div>
              ) : <p className="text-sm text-slate-400">Sin prendas registradas</p>}
            </div>
          </div>
        )}
      </Modal>

      <Toaster position="top-center" />
    </div>
  )
}