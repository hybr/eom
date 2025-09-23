import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import './models/database.js'
import personsRouter from './routes/persons.js'
import organizationsRouter from './routes/organizations.js'
import personCredentialsRouter from './routes/person-credentials.js'
import signupRouter from './routes/signup.js'
import authRouter from './routes/auth.js'
import continentsRouter from './routes/continents.js'
import countriesRouter from './routes/countries.js'
import organizationLegalTypesRouter from './routes/organization-legal-types.js'

const app = express()
const server = createServer(app)
const PORT = process.env.PORT || 3000

// Middleware
app.use(cors({
    origin: ['http://localhost:5173', 'http://localhost:4173'], // Vite dev and preview ports
    credentials: true
}))
app.use(express.json())

// Cookie parser middleware
app.use((req, res, next) => {
    const cookies = {}
    if (req.headers.cookie) {
        req.headers.cookie.split(';').forEach(cookie => {
            const [name, value] = cookie.trim().split('=')
            cookies[name] = decodeURIComponent(value)
        })
    }
    req.cookies = cookies
    next()
})

// Routes
app.use('/api/persons', personsRouter)
app.use('/api/organizations', organizationsRouter)
app.use('/api/person-credentials', personCredentialsRouter)
app.use('/api/signup', signupRouter)
app.use('/api/auth', authRouter)
app.use('/api/continents', continentsRouter)
app.use('/api/countries', countriesRouter)
app.use('/api/organization-legal-types', organizationLegalTypesRouter)

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// WebSocket setup
const wss = new WebSocketServer({
    server,
    path: '/ws'
})

wss.on('connection', (ws) => {
    console.log('New WebSocket connection')

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message)
            console.log('Received message:', data)

            // Echo back or handle specific message types
            ws.send(JSON.stringify({
                type: 'echo',
                data: data,
                timestamp: new Date().toISOString()
            }))
        } catch (error) {
            console.error('Error parsing WebSocket message:', error)
        }
    })

    ws.on('close', () => {
        console.log('WebSocket connection closed')
    })

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to EOM API WebSocket',
        timestamp: new Date().toISOString()
    }))
})

// Broadcast function for real-time updates
export function broadcast(message) {
    wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
            client.send(JSON.stringify(message))
        }
    })
}

// Start server
server.listen(PORT, () => {
    console.log(`🚀 EOM API server running on http://localhost:${PORT}`)
    console.log(`📡 WebSocket server available at ws://localhost:${PORT}/ws`)
})