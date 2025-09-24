import { EventBus } from '../utils/EventBus.js'

export class WebSocketService {
  constructor () {
    this.socket = null
    this.eventBus = new EventBus()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectInterval = 5000
    this.subscriptions = new Set()
  }

  async connect (token) {
    if (this.socket && this.socket.connected) {
      console.log('WebSocket already connected')
      return
    }

    try {
      // Import socket.io-client from global
      const io = window.io

      if (!io) {
        throw new Error('Socket.IO client library not loaded')
      }

      console.log('Connecting to WebSocket...')

      this.socket = io('/', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling'],
        upgrade: true,
        rememberUpgrade: true
      })

      this.setupEventListeners()
      this.eventBus.emit('websocket:connecting')
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error)
      this.eventBus.emit('websocket:error', error)
    }
  }

  disconnect () {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.subscriptions.clear()
    }
  }

  setupEventListeners () {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket connected')
      this.reconnectAttempts = 0
      this.eventBus.emit('websocket:connected')

      // Re-subscribe to previous subscriptions
      this.resubscribe()
    })

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason)
      this.eventBus.emit('websocket:disconnected', reason)

      // Attempt to reconnect if disconnected unexpectedly
      if (reason !== 'io client disconnect' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.attemptReconnect()
      }
    })

    this.socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error)
      this.eventBus.emit('websocket:error', error)
      this.attemptReconnect()
    })

    this.socket.on('error', (error) => {
      console.error('WebSocket error:', error)
      this.eventBus.emit('websocket:error', error)
    })

    // Entity-specific events
    this.socket.onAny((event, data) => {
      if (event.includes(':')) {
        const [entity, action] = event.split(':')
        this.eventBus.emit('entity:realtime', {
          entity,
          action,
          data
        })

        // Also emit specific event
        this.eventBus.emit(event, data)
      }
    })

    // Connection status updates
    this.socket.on('connected', (data) => {
      console.log('WebSocket welcome message:', data)
    })
  }

  attemptReconnect () {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)

    setTimeout(() => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect()
      }
    }, this.reconnectInterval * this.reconnectAttempts)
  }

  resubscribe () {
    this.subscriptions.forEach(subscription => {
      this.socket.emit('subscribe', subscription)
    })
  }

  subscribe (entity, id = null) {
    if (!this.socket || !this.socket.connected) {
      console.warn('WebSocket not connected, cannot subscribe')
      return
    }

    const subscription = { entity, id }
    this.subscriptions.add(subscription)
    this.socket.emit('subscribe', subscription)

    console.log(`Subscribed to ${entity}${id ? `:${id}` : ''}`)
  }

  unsubscribe (entity, id = null) {
    if (!this.socket || !this.socket.connected) {
      return
    }

    const subscription = { entity, id }
    this.subscriptions.delete(subscription)
    this.socket.emit('unsubscribe', subscription)

    console.log(`Unsubscribed from ${entity}${id ? `:${id}` : ''}`)
  }

  sendMessage (data) {
    if (!this.socket || !this.socket.connected) {
      console.warn('WebSocket not connected, cannot send message')
      return
    }

    this.socket.emit('message', data)
  }

  // Entity-specific subscription helpers
  subscribeToEntity (entityType) {
    this.subscribe(entityType.toLowerCase())
  }

  subscribeToRecord (entityType, recordId) {
    this.subscribe(entityType.toLowerCase(), recordId)
  }

  unsubscribeFromEntity (entityType) {
    this.unsubscribe(entityType.toLowerCase())
  }

  unsubscribeFromRecord (entityType, recordId) {
    this.unsubscribe(entityType.toLowerCase(), recordId)
  }

  // Event listening helpers
  onEntityCreated (entityType, callback) {
    this.eventBus.on(`${entityType.toLowerCase()}:created`, callback)
  }

  onEntityUpdated (entityType, callback) {
    this.eventBus.on(`${entityType.toLowerCase()}:updated`, callback)
  }

  onEntityDeleted (entityType, callback) {
    this.eventBus.on(`${entityType.toLowerCase()}:deleted`, callback)
  }

  onMethodExecuted (entityType, methodName, callback) {
    this.eventBus.on(`${entityType.toLowerCase()}:${methodName}`, callback)
  }

  // Remove event listeners
  offEntityCreated (entityType, callback) {
    this.eventBus.off(`${entityType.toLowerCase()}:created`, callback)
  }

  offEntityUpdated (entityType, callback) {
    this.eventBus.off(`${entityType.toLowerCase()}:updated`, callback)
  }

  offEntityDeleted (entityType, callback) {
    this.eventBus.off(`${entityType.toLowerCase()}:deleted`, callback)
  }

  offMethodExecuted (entityType, methodName, callback) {
    this.eventBus.off(`${entityType.toLowerCase()}:${methodName}`, callback)
  }

  isConnected () {
    return this.socket && this.socket.connected
  }

  getConnectionState () {
    if (!this.socket) return 'disconnected'
    if (this.socket.connected) return 'connected'
    if (this.socket.connecting) return 'connecting'
    return 'disconnected'
  }
}