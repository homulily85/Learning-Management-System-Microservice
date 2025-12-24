import fs from 'fs'
import axios from 'axios'
import WebSocket from 'ws'
import { connectRabbitMQ, publishLog } from './config/loggingCenterConnect.js'

const CONFIG_FILE = 'config.json'
const CONFIG_SOURCE = 'http://localhost:3001/configs/'
const WS_URL = 'ws://localhost:3001/configs/ws' // your server will expose this

async function updateConfig () {
  try {
    const { data } = await axios.get(CONFIG_SOURCE)
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2))
    publishLog('info', '[Config Sidecar] Config updated successfully')
  } catch (err) {
    console.error('[Config Sidecar] Failed to fetch config:', err.message)
    publishLog('error',
      `[Config Sidecar] Failed to fetch config: ${err.message}`)
  }
}

// Initial fetch
await updateConfig()

// Connect WebSocket
function connectWebSocket () {
  const ws = new WebSocket(WS_URL)

  ws.on('open', () => {
    publishLog('info', '[Config Sidecar] Connected to WebSocket')
  })

  ws.on('message', async (message) => {
    publishLog('info', `[Config Sidecar] Change detected`)
    await updateConfig()
  })

  ws.on('close', () => {
    console.warn('[Config Sidecar] WebSocket closed, retrying in 5s...')
    publishLog('warn', '[Config Sidecar] WebSocket closed, retrying in 5s...')
    setTimeout(connectWebSocket, 5000)
  })

  ws.on('error', (err) => {
    console.error('[Config Sidecar] WebSocket error:', err.message)
    publishLog('error',
      `[Config Sidecar] WebSocket error: ${err.message}`)
    ws.close()
  })
}

await connectRabbitMQ()
connectWebSocket()
