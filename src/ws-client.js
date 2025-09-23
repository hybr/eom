let socket
export function initWebSocket({ url = 'ws://localhost:3000/ws', onOpen, onMessage, onClose } = {}) {
    socket = new WebSocket(url)
    socket.addEventListener('open', () => onOpen && onOpen())
    socket.addEventListener('message', e => {
        let data = null
        try { data = JSON.parse(e.data) } catch (_) { data = e.data }
        onMessage && onMessage(data)
    })
    socket.addEventListener('close', () => onClose && onClose())
}


export function sendWS(obj) {
    if (!socket || socket.readyState !== WebSocket.OPEN) throw new Error('WS not open')
    socket.send(JSON.stringify(obj))
}