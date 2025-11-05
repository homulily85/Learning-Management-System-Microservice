import express from 'express'
import bodyParser from 'body-parser'
import { promises as fs } from 'fs'
import path from 'path'
import dotenv from 'dotenv'
import morgan from 'morgan'
import { WebSocketServer } from 'ws'

dotenv.config()

const PORT = process.env.PORT
const app = express()
app.use(bodyParser.json())
app.use(morgan('dev'))

const configPath = path.resolve(process.cwd(), 'config.json')

let configs = {}

async function loadConfigs () {
  try {
    const raw = await fs.readFile(configPath, 'utf8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') {
      return {}
    }
    console.error('Failed to load config file:', err)
    return {}
  }
}

async function saveConfigs () {
  try {
    await fs.writeFile(configPath, JSON.stringify(configs, null, 2), 'utf8')
  } catch (err) {
    console.error('Failed to save config file:', err)
  }
}

function broadcast(message) {
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) {
      client.send(message)
    }
  }
}

// initialize configs (non-blocking; GET/POST will use current value)
loadConfigs().then(data => { configs = data })

app.get('/', (req, res) => {
  res.json(configs || {})
})

app.put('/', async (req, res) => {
  console.log(req.body)
  configs = { ...configs, ...req.body }
  // await saveConfigs()
  broadcast()
  res.json({ updated: true })
})

const server = app.listen(PORT,
  () => console.log(`Config service running on ${PORT}`))

const wss = new WebSocketServer({ server, path: '/ws'})
