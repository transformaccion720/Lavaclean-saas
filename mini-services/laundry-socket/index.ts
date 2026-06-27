import { createServer } from 'http'
import { Server } from 'socket.io'

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
  pingTimeout: 60000,
  pingInterval: 25000,
})

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`)

  socket.on('join-role', (role: string) => {
    socket.join(role)
    socket.join('all')
    console.log(`${socket.id} joined room: ${role}`)
  })

  socket.on('order-created', (order: any) => {
    io.emit('order-updated', { action: 'created', order })
  })

  socket.on('order-status-changed', (order: any) => {
    io.emit('order-updated', { action: 'status-changed', order })
  })

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`)
  })
})

const PORT = 3004
httpServer.listen(PORT, () => {
  console.log(`Laundry Socket.io server running on port ${PORT}`)
})

process.on('SIGTERM', () => {
  httpServer.close(() => process.exit(0))
})
process.on('SIGINT', () => {
  httpServer.close(() => process.exit(0))
})