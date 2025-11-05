import Razorpay from 'razorpay'

import connectionToDB from './config/dbConnection.js'
import app from './app.js'

const PORT = process.env.PORT || 5000

/**
 * @Razorpay configuration for payment gateway
 */
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_SECRET,
})
app.listen(PORT, async () => {
  await connectionToDB()
  console.log(`App is running at  http:localhost:${PORT} `)
})