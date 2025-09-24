const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const logger = require('../../shared/logging/logger')

class WebSocketService {
  constructor () {
    this.io = null
    this.connections = new Map()
  }

  initialize (httpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    })

    this.io.use(this.authenticateSocket.bind(this))
    this.io.on('connection', this.handleConnection.bind(this))

    logger.info('WebSocket server initialized')
  }

  async authenticateSocket (socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1]

      if (!token) {
        return next(new Error('Authentication token required'))
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET)
      socket.userId = decoded.id
      socket.userRole = decoded.role

      logger.info('WebSocket client authenticated', { userId: decoded.id, socketId: socket.id })
      next()
    } catch (error) {
      logger.error('WebSocket authentication failed', { error: error.message })
      next(new Error('Authentication failed'))
    }
  }

  handleConnection (socket) {
    logger.info('Client connected to WebSocket', { userId: socket.userId, socketId: socket.id })

    // Store connection
    this.connections.set(socket.id, {
      socket,
      userId: socket.userId,
      userRole: socket.userRole,
      connectedAt: new Date()
    })

    // Join user-specific room
    socket.join(`user:${socket.userId}`)

    // Join role-specific room
    if (socket.userRole) {
      socket.join(`role:${socket.userRole}`)
    }

    // Handle entity subscriptions
    socket.on('subscribe', (data) => {
      this.handleSubscription(socket, data)
    })

    socket.on('unsubscribe', (data) => {
      this.handleUnsubscription(socket, data)
    })

    // Handle custom events
    socket.on('message', (data) => {
      this.handleMessage(socket, data)
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      this.handleDisconnection(socket)
    })

    // Send welcome message
    socket.emit('connected', {
      message: 'Connected to Entity Management System',
      userId: socket.userId,
      timestamp: new Date().toISOString()
    })
  }

  handleSubscription (socket, data) {
    try {
      const { entity, id } = data

      if (entity) {
        // Subscribe to entity-wide updates
        socket.join(`entity:${entity}`)
        logger.info('Client subscribed to entity', { userId: socket.userId, entity })

        if (id) {
          // Subscribe to specific record updates
          socket.join(`${entity}:${id}`)
          logger.info('Client subscribed to record', { userId: socket.userId, entity, id })
        }

        socket.emit('subscribed', { entity, id })
      }
    } catch (error) {
      logger.error('WebSocket subscription error', { error: error.message, userId: socket.userId })
      socket.emit('error', { message: 'Subscription failed' })
    }
  }

  handleUnsubscription (socket, data) {
    try {
      const { entity, id } = data

      if (entity) {
        socket.leave(`entity:${entity}`)

        if (id) {
          socket.leave(`${entity}:${id}`)
        }

        logger.info('Client unsubscribed', { userId: socket.userId, entity, id })
        socket.emit('unsubscribed', { entity, id })
      }
    } catch (error) {
      logger.error('WebSocket unsubscription error', { error: error.message, userId: socket.userId })
    }
  }

  handleMessage (socket, data) {
    try {
      logger.info('WebSocket message received', { userId: socket.userId, data })

      // Broadcast message to other clients (example)
      socket.broadcast.emit('message', {
        from: socket.userId,
        data,
        timestamp: new Date().toISOString()
      })
    } catch (error) {
      logger.error('WebSocket message error', { error: error.message, userId: socket.userId })
    }
  }

  handleDisconnection (socket) {
    this.connections.delete(socket.id)
    logger.info('Client disconnected from WebSocket', { userId: socket.userId, socketId: socket.id })
  }

  // Public methods for emitting events

  emit (event, data, options = {}) {
    try {
      if (!this.io) {
        logger.warn('WebSocket not initialized, cannot emit event', { event })
        return
      }

      const { room, userId, userRole, exclude } = options

      let target = this.io

      // Target specific room
      if (room) {
        target = this.io.to(room)
      }

      // Target specific user
      if (userId) {
        target = this.io.to(`user:${userId}`)
      }

      // Target specific role
      if (userRole) {
        target = this.io.to(`role:${userRole}`)
      }

      // Exclude specific socket
      if (exclude) {
        target = target.except(exclude)
      }

      target.emit(event, {
        ...data,
        timestamp: new Date().toISOString()
      })

      logger.debug('WebSocket event emitted', { event, options })
    } catch (error) {
      logger.error('WebSocket emit error', { error: error.message, event })
    }
  }

  // Entity-specific emit methods

  emitEntityCreated (entityName, data, userId = null) {
    this.emit(`${entityName}:created`, data, {
      room: `entity:${entityName}`,
      exclude: userId ? `user:${userId}` : null
    })
  }

  emitEntityUpdated (entityName, data, userId = null) {
    this.emit(`${entityName}:updated`, data, {
      room: `entity:${entityName}`,
      exclude: userId ? `user:${userId}` : null
    })

    // Also emit to specific record subscribers
    this.emit(`${entityName}:updated`, data, {
      room: `${entityName}:${data.id}`,
      exclude: userId ? `user:${userId}` : null
    })
  }

  emitEntityDeleted (entityName, data, userId = null) {
    this.emit(`${entityName}:deleted`, data, {
      room: `entity:${entityName}`,
      exclude: userId ? `user:${userId}` : null
    })

    // Also emit to specific record subscribers
    this.emit(`${entityName}:deleted`, data, {
      room: `${entityName}:${data.id}`,
      exclude: userId ? `user:${userId}` : null
    })
  }

  emitMethodExecuted (entityName, methodName, data, userId = null) {
    this.emit(`${entityName}:${methodName}`, data, {
      room: `entity:${entityName}`,
      exclude: userId ? `user:${userId}` : null
    })

    // Also emit to specific record subscribers
    this.emit(`${entityName}:${methodName}`, data, {
      room: `${entityName}:${data.id}`,
      exclude: userId ? `user:${userId}` : null
    })
  }

  // Utility methods

  getConnectionCount () {
    return this.connections.size
  }

  getUserConnections (userId) {
    return Array.from(this.connections.values())
      .filter(conn => conn.userId === userId)
  }

  broadcastToRole (role, event, data) {
    this.emit(event, data, { userRole: role })
  }

  broadcastToUser (userId, event, data) {
    this.emit(event, data, { userId })
  }
}

// Export singleton instance
module.exports = new WebSocketService()