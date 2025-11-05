import connectionToDB from './config/dbConnection.js'
import app from './app.js'

const PORT = process.env.PORT

app.listen(PORT, async () => {
  await connectionToDB()
  console.log(`App is running at  http:localhost:${PORT} `)
})