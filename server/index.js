import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const server = createServer(app);

// Middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    next();
});
app.use(express.json());

// WebSocket Server
const wss = new WebSocketServer({
    server,
    path: '/',
    verifyClient: (info) => {
        // Extract token from query string
        const url = new URL(info.req.url, 'http://localhost');
        const token = url.searchParams.get('token');

        if (!token) {
            console.log('WebSocket connection rejected: No token provided');
            return false;
        }

        try {
            // Simple token validation for demo
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.log('WebSocket connection rejected: Invalid token format');
                return false;
            }

            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp <= Date.now()) {
                console.log('WebSocket connection rejected: Token expired');
                return false;
            }

            // Store user info for later use
            info.req.user = payload;
            return true;

        } catch (error) {
            console.log('WebSocket connection rejected: Token validation failed', error.message);
            return false;
        }
    }
});

// Store active connections
const connections = new Map();
const subscriptions = new Map(); // topic -> Set of connection IDs

wss.on('connection', (ws, req) => {
    const connectionId = generateId();
    const user = req.user;

    console.log(`WebSocket client connected: ${connectionId} (user: ${user.userId})`);

    // Store connection
    connections.set(connectionId, {
        ws,
        user,
        subscriptions: new Set(),
        lastHeartbeat: Date.now()
    });

    // Auto-subscribe to user-specific topics
    subscribe(connectionId, `user:${user.userId}`);

    ws.on('message', (data) => {
        try {
            const message = JSON.parse(data.toString());
            handleMessage(connectionId, message);
        } catch (error) {
            console.error('Error parsing WebSocket message:', error);
            sendError(connectionId, 'Invalid JSON message');
        }
    });

    ws.on('close', () => {
        console.log(`WebSocket client disconnected: ${connectionId}`);
        cleanup(connectionId);
    });

    ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        cleanup(connectionId);
    });

    // Send welcome message
    send(connectionId, {
        type: 'connected',
        payload: {
            connectionId,
            userId: user.userId,
            timestamp: new Date().toISOString()
        }
    });
});

function handleMessage(connectionId, message) {
    const connection = connections.get(connectionId);
    if (!connection) return;

    console.log(`Message from ${connectionId}:`, message);

    switch (message.type) {
        case 'ping':
            connection.lastHeartbeat = Date.now();
            send(connectionId, {
                type: 'pong',
                payload: { timestamp: Date.now() }
            });
            break;

        case 'subscribe':
            if (message.topic) {
                subscribe(connectionId, message.topic);
                send(connectionId, {
                    type: 'subscription',
                    payload: {
                        success: true,
                        topic: message.topic
                    }
                });
            }
            break;

        case 'unsubscribe':
            if (message.topic) {
                unsubscribe(connectionId, message.topic);
                send(connectionId, {
                    type: 'unsubscription',
                    payload: {
                        success: true,
                        topic: message.topic
                    }
                });
            }
            break;

        case 'notification':
            // Broadcast notification to organization members
            if (message.organizationId) {
                broadcast(`org:${message.organizationId}`, {
                    type: 'notification',
                    payload: {
                        ...message.payload,
                        from: connection.user.userId,
                        timestamp: new Date().toISOString()
                    }
                });
            }
            break;

        case 'chat:message':
            // Broadcast chat message to organization
            if (message.organizationId) {
                broadcast(`org:${message.organizationId}`, {
                    type: 'chat:message',
                    payload: {
                        ...message.payload,
                        from: connection.user.userId,
                        timestamp: new Date().toISOString()
                    }
                });
            }
            break;

        case 'workflow:nodeStarted':
        case 'workflow:nodeCompleted':
        case 'workflow:instanceStarted':
        case 'workflow:instanceCompleted':
            // Broadcast workflow events to organization
            if (message.organizationId) {
                broadcast(`org:${message.organizationId}`, {
                    type: message.type,
                    payload: {
                        ...message.payload,
                        from: connection.user.userId,
                        timestamp: new Date().toISOString()
                    }
                });
            }
            break;

        default:
            console.warn(`Unknown message type: ${message.type}`);
    }
}

function subscribe(connectionId, topic) {
    const connection = connections.get(connectionId);
    if (!connection) return;

    // Add to connection's subscriptions
    connection.subscriptions.add(topic);

    // Add to global subscriptions
    if (!subscriptions.has(topic)) {
        subscriptions.set(topic, new Set());
    }
    subscriptions.get(topic).add(connectionId);

    console.log(`${connectionId} subscribed to ${topic}`);
}

function unsubscribe(connectionId, topic) {
    const connection = connections.get(connectionId);
    if (!connection) return;

    // Remove from connection's subscriptions
    connection.subscriptions.delete(topic);

    // Remove from global subscriptions
    if (subscriptions.has(topic)) {
        subscriptions.get(topic).delete(connectionId);
        if (subscriptions.get(topic).size === 0) {
            subscriptions.delete(topic);
        }
    }

    console.log(`${connectionId} unsubscribed from ${topic}`);
}

function send(connectionId, message) {
    const connection = connections.get(connectionId);
    if (!connection || connection.ws.readyState !== WebSocket.OPEN) {
        return false;
    }

    try {
        connection.ws.send(JSON.stringify(message));
        return true;
    } catch (error) {
        console.error(`Error sending message to ${connectionId}:`, error);
        cleanup(connectionId);
        return false;
    }
}

function sendError(connectionId, error) {
    send(connectionId, {
        type: 'error',
        payload: { error }
    });
}

function broadcast(topic, message) {
    const subscriberIds = subscriptions.get(topic);
    if (!subscriberIds) return 0;

    let sentCount = 0;
    subscriberIds.forEach(connectionId => {
        if (send(connectionId, message)) {
            sentCount++;
        }
    });

    console.log(`Broadcast to ${topic}: ${sentCount} recipients`);
    return sentCount;
}

function cleanup(connectionId) {
    const connection = connections.get(connectionId);
    if (!connection) return;

    // Remove from all subscriptions
    connection.subscriptions.forEach(topic => {
        if (subscriptions.has(topic)) {
            subscriptions.get(topic).delete(connectionId);
            if (subscriptions.get(topic).size === 0) {
                subscriptions.delete(topic);
            }
        }
    });

    // Remove connection
    connections.delete(connectionId);
}

function generateId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        connections: connections.size,
        subscriptions: subscriptions.size,
        uptime: process.uptime()
    });
});

// WebSocket info endpoint
app.get('/ws/info', (req, res) => {
    const topicStats = {};
    subscriptions.forEach((connectionIds, topic) => {
        topicStats[topic] = connectionIds.size;
    });

    res.json({
        totalConnections: connections.size,
        totalTopics: subscriptions.size,
        topicStats
    });
});

// Heartbeat cleanup
setInterval(() => {
    const now = Date.now();
    const staleThreshold = 60000; // 1 minute

    connections.forEach((connection, connectionId) => {
        if (now - connection.lastHeartbeat > staleThreshold) {
            console.log(`Cleaning up stale connection: ${connectionId}`);
            connection.ws.terminate();
            cleanup(connectionId);
        }
    });
}, 30000); // Check every 30 seconds

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
    console.log(`WebSocket server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`WebSocket info: http://localhost:${PORT}/ws/info`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Shutting down WebSocket server...');

    // Close all connections
    connections.forEach((connection, connectionId) => {
        connection.ws.close(1001, 'Server shutdown');
    });

    server.close(() => {
        console.log('WebSocket server shut down');
        process.exit(0);
    });
});

export { broadcast };