import fs from 'fs'
import axios from 'axios'
import WebSocket from 'ws'

const CONFIG_FILE = 'config.json'
const CONFIG_SOURCE = 'http://localhost:3001/configs/'
const WS_URL = 'ws://localhost:3001/configs/ws' // your server will expose this

async function updateConfig() {
  try {
    const { data } = await axios.get(CONFIG_SOURCE)
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2))
    console.log(`[Config Sidecar] Updated config: ${JSON.stringify(data)}`)
  } catch (err) {
    console.error('[Config Sidecar] Failed to fetch config:', err.message)
  }
}

// Initial fetch
await updateConfig()

// Connect WebSocket
function connectWebSocket() {
  const ws = new WebSocket(WS_URL)

  ws.on('open', () => console.log('[Config Sidecar] Connected to WebSocket'))

  ws.on('message', async (message) => {
    console.log('[Config Sidecar] Change detected:', message.toString())
    await updateConfig()
  })

  ws.on('close', () => {
    console.warn('[Config Sidecar] WebSocket closed, retrying in 5s...')
    setTimeout(connectWebSocket, 5000)
  })

  ws.on('error', (err) => {
    console.error('[Config Sidecar] WebSocket error:', err.message)
    ws.close()
  })
}

connectWebSocket()
