let ws = null
let reconnectTimer = null
let pingInterval = null
let messageHandler = null
let connectHandler = null
let disconnectHandler = null

export function connect(onMsg, onConnect, onDisconnect) {
  messageHandler = onMsg
  connectHandler = onConnect
  disconnectHandler = onDisconnect
  _open()
}

function _open() {
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  let host
  if (import.meta.env.DEV) {
    host = 'localhost:8001'
  } else if (import.meta.env.VITE_BACKEND_URL) {
    host = import.meta.env.VITE_BACKEND_URL.replace(/^https?:\/\//, '')
  } else {
    host = location.host
  }
  ws = new WebSocket(`${protocol}://${host}/ws`)

  ws.onopen = () => {
    clearTimeout(reconnectTimer)
    clearInterval(pingInterval)
    pingInterval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 25000)
    connectHandler?.()
  }

  ws.onmessage = (e) => {
    try {
      messageHandler?.(JSON.parse(e.data))
    } catch (_) {}
  }

  ws.onclose = () => {
    clearInterval(pingInterval)
    pingInterval = null
    disconnectHandler?.()
    reconnectTimer = setTimeout(_open, 2000)
  }

  ws.onerror = () => ws.close()
}

export function send(type, data = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, ...data }))
  }
}

export function disconnect() {
  clearTimeout(reconnectTimer)
  clearInterval(pingInterval)
  ws?.close()
  ws = null
}
