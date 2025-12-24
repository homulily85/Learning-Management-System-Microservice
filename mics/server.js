import connectionToDB from './config/dbConnection.js'
import app from './app.js'
import { connectRabbitMQ } from './config/loggingCenterConnect.js'

const PORT = process.env.PORT

await connectRabbitMQ()

app.listen(PORT, async () => {
  await connectionToDB()
  console.log(`App is running at  http:localhost:${PORT} `)
})