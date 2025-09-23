export default class WebSocketService {
    constructor() {
        this.ws = null;
        this.url = 'ws://localhost:3001';
        this.token = null;
        this.isConnected = false;
        this.subscriptions = new Set();
        this.listeners = {};
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 1000;
        this.heartbeatInterval = null;
        this.messageQueue = [];
    }

    async connect(token) {
        try {
            this.token = token;

            // Close existing connection
            if (this.ws) {
                this.disconnect();
            }

            console.log('Connecting to WebSocket server...');

            this.ws = new WebSocket(`${this.url}?token=${token}`);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.isConnected = true;
                this.reconnectAttempts = 0;

                // Start heartbeat
                this.startHeartbeat();

                // Send queued messages
                this.flushMessageQueue();

                // Emit connected event
                this.emit('connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleMessage(message);
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.isConnected = false;
                this.stopHeartbeat();

                // Emit disconnected event
                this.emit('disconnected');

                // Auto-reconnect if not intentional
                if (event.code !== 1000 && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.scheduleReconnect();
                }
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('error', error);
            };

        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            throw error;
        }
    }

    disconnect() {
        if (this.ws) {
            this.ws.close(1000, 'Client disconnect');
            this.ws = null;
        }

        this.isConnected = false;
        this.stopHeartbeat();
        this.subscriptions.clear();
    }

    scheduleReconnect() {
        const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts);
        console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts + 1})`);

        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect(this.token);
        }, delay);
    }

    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            if (this.isConnected) {
                this.send({
                    type: 'ping',
                    timestamp: Date.now()
                });
            }
        }, 30000); // 30 seconds
    }

    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    send(message) {
        if (this.isConnected && this.ws) {
            try {
                this.ws.send(JSON.stringify(message));
                return true;
            } catch (error) {
                console.error('Error sending WebSocket message:', error);
                this.messageQueue.push(message);
                return false;
            }
        } else {
            // Queue message for later
            this.messageQueue.push(message);
            return false;
        }
    }

    flushMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            this.send(message);
        }
    }

    handleMessage(message) {
        console.log('WebSocket message received:', message);

        switch (message.type) {
            case 'pong':
                // Heartbeat response
                break;

            case 'notification':
                this.emit('notification', message.payload);
                break;

            case 'workflow:nodeStarted':
                this.emit('workflow:nodeStarted', message.payload);
                break;

            case 'workflow:nodeCompleted':
                this.emit('workflow:nodeCompleted', message.payload);
                break;

            case 'workflow:instanceStarted':
                this.emit('workflow:instanceStarted', message.payload);
                break;

            case 'workflow:instanceCompleted':
                this.emit('workflow:instanceCompleted', message.payload);
                break;

            case 'chat:message':
                this.emit('chat:message', message.payload);
                break;

            case 'organization:memberAdded':
                this.emit('organization:memberAdded', message.payload);
                break;

            case 'organization:memberRemoved':
                this.emit('organization:memberRemoved', message.payload);
                break;

            case 'market:itemAdded':
                this.emit('market:itemAdded', message.payload);
                break;

            case 'subscription':
                if (message.payload.success) {
                    console.log(`Subscribed to: ${message.payload.topic}`);
                } else {
                    console.error(`Subscription failed: ${message.payload.error}`);
                }
                break;

            case 'unsubscription':
                if (message.payload.success) {
                    console.log(`Unsubscribed from: ${message.payload.topic}`);
                } else {
                    console.error(`Unsubscription failed: ${message.payload.error}`);
                }
                break;

            default:
                console.warn('Unknown message type:', message.type);
                this.emit('message', message);
        }
    }

    subscribe(topic) {
        if (!this.subscriptions.has(topic)) {
            this.subscriptions.add(topic);

            this.send({
                type: 'subscribe',
                topic: topic
            });

            console.log(`Subscribing to: ${topic}`);
        }
    }

    unsubscribe(topic) {
        if (this.subscriptions.has(topic)) {
            this.subscriptions.delete(topic);

            this.send({
                type: 'unsubscribe',
                topic: topic
            });

            console.log(`Unsubscribing from: ${topic}`);
        }
    }

    // Event handling
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    off(event, callback) {
        if (this.listeners[event]) {
            const index = this.listeners[event].indexOf(callback);
            if (index > -1) {
                this.listeners[event].splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in WebSocket event handler for ${event}:`, error);
                }
            });
        }
    }

    // Convenience methods for sending specific message types
    sendNotification(organizationId, notification) {
        this.send({
            type: 'notification',
            organizationId,
            payload: notification
        });
    }

    sendChatMessage(organizationId, message) {
        this.send({
            type: 'chat:message',
            organizationId,
            payload: message
        });
    }

    sendWorkflowEvent(organizationId, eventType, payload) {
        this.send({
            type: eventType,
            organizationId,
            payload
        });
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            reconnectAttempts: this.reconnectAttempts,
            subscriptions: Array.from(this.subscriptions),
            queuedMessages: this.messageQueue.length
        };
    }
}