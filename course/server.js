import cloudinary from 'cloudinary'
import connectionToDB from './config/dbConnection.js'
import app from './app.js'
import path from 'path'
import fs from 'fs'

const PORT = process.env.PORT
const CONFIG_FILE = path.join('config.json')

function loadConfig () {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'))
    cloudinary.v2.config({
      cloud_name: config.CLOUDINARY_CLOUD_NAME,
      api_key: config.CLOUDINARY_API_KEY,
      api_secret: config.CLOUDINARY_API_SECRET,
    })
  } catch (err) {
    console.error('[Config] Failed to read config file:', err.message)
  }
}

// --- Watch for config changes ---
fs.watch(CONFIG_FILE, (eventType) => {
  if (eventType === 'change') {
    loadConfig()
  }
})

// Load once at startup
loadConfig()

app.listen(PORT, async () => {
  await connectionToDB()
  console.log(`App is running at  http:localhost:${PORT} `)
})