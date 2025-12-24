import cloudinary from 'cloudinary'

import connectionToDB from './config/dbConnection.js'
import app from './app.js'
import configManager from './config/configManager.js'
import { connectRabbitMQ } from './config/loggingCenterConnect.js'

const PORT = process.env.PORT

// --- Initial Cloudinary setup ---
const applyCloudinaryConfig = (cfg) => {
  cloudinary.v2.config({
    cloud_name: cfg.CLOUDINARY_CLOUD_NAME,
    api_key: cfg.CLOUDINARY_API_KEY,
    api_secret: cfg.CLOUDINARY_API_SECRET,
  })
  console.log('[Cloudinary] Config applied')
}

// Apply current config
applyCloudinaryConfig(configManager.get())

// Re-apply when config updates
configManager.on('update', applyCloudinaryConfig)

await connectRabbitMQ()

app.listen(PORT, async () => {
  await connectionToDB()
  console.log(`App is running at  http:localhost:${PORT} `)
})