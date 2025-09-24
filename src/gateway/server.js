const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const compression = require('compression')
const morgan = require('morgan')
const path = require('path')
const fs = require('fs').promises

require('dotenv').config()

const logger = require('../shared/logging/logger')
const { initializeDatabase } = require('../shared/db/database')
const errorHandler = require('../shared/errors/errorHandler')
const AppError = require('../shared/errors/AppError')
const EntityService = require('./services/EntityService')
const WebSocketService = require('./services/WebSocketService')

const app = express()
const PORT = process.env.PORT || 3000

// Trust proxy
app.set('trust proxy', 1)

// Global Middlewares
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdn.socket.io"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}))

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}))

app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }))
}

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../../uploads')))
app.use(express.static(path.join(__dirname, '../../frontend/dist')))

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// Entity discovery and routing
const setupEntityRoutes = async () => {
  try {
    const entitiesPath = path.join(__dirname, '../../entities')
    const entityFiles = await fs.readdir(entitiesPath)

    for (const file of entityFiles) {
      if (file.endsWith('.json')) {
        const entityPath = path.join(entitiesPath, file)
        const entityConfig = JSON.parse(await fs.readFile(entityPath, 'utf8'))

        console.log(`Processing entity: ${entityConfig.name}`)

        // Create routes for this entity
        const router = express.Router()
        let entityService
        try {
          entityService = new EntityService(entityConfig)
          console.log(`EntityService created for ${entityConfig.name}`)
        } catch (error) {
          console.error(`Failed to create EntityService for ${entityConfig.name}:`, error)
          continue
        }

        // CRUD routes
        router.get('/', entityService.getAll.bind(entityService))
        router.get('/:id', entityService.getById.bind(entityService))
        router.post('/', entityService.create.bind(entityService))
        router.put('/:id', entityService.update.bind(entityService))
        router.delete('/:id', entityService.delete.bind(entityService))

        // Method routes
        if (entityConfig.methods) {
          for (const [methodName, methodConfig] of Object.entries(entityConfig.methods)) {
            router.post(`/:id/action/${methodName}`, entityService.executeMethod.bind(entityService, methodName))
          }
        }

        // Mount entity routes (plural form)
        const routePath = `${entityConfig.name.toLowerCase()}s`
        app.use(`/api/${routePath}`, router)
        logger.info(`Entity routes mounted for: ${entityConfig.name} at /api/${routePath}`)
      }
    }
  } catch (error) {
    logger.error('Failed to setup entity routes:', error)
  }
}

// Initialize server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase()

    // Setup entity routes
    await setupEntityRoutes()

    // Authentication routes
    app.use('/api/auth', require('./routes/auth'))

    // Catch all unhandled routes
    app.all('/api/*', (req, res, next) => {
      next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404))
    })

    // Serve frontend for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'))
    })

    // Global error handling middleware
    app.use(errorHandler)

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`)
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
    })

    // Initialize WebSocket
    WebSocketService.initialize(server)

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`${signal} received, shutting down gracefully`)
      server.close(() => {
        logger.info('HTTP server closed')
        process.exit(0)
      })
    }

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
    process.on('SIGINT', () => gracefulShutdown('SIGINT'))

  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('UNCAUGHT EXCEPTION! 💥 Shutting down...')
  logger.error({ error: err.name, message: err.message, stack: err.stack })
  process.exit(1)
})

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! 💥 Shutting down...')
  logger.error({ error: err.name, message: err.message, stack: err.stack })
  process.exit(1)
})

startServer()

module.exports = app