import cookieParser from 'cookie-parser'
import cors from 'cors'
import { config } from 'dotenv'
import express from 'express'
import morgan from 'morgan'

import errorMiddlware from './middlewares/error.middleware.js'
import userRoutes from './routes/user.Routes.js'
import { publishLog } from './config/loggingCenterConnect.js'

config()

const app = express()

app.use(express.json())

app.use(express.urlencoded({ extended: true }))

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  }),
)

app.use(cookieParser())

process.on('uncaughtException', (error) => {
  console.error('--- UNCAUGHT EXCEPTION ---')
  console.error(error)
  publishLog('fatal', `Uncaught Exception: ${error.stack}`)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('--- UNHANDLED REJECTION ---')
  console.error(reason)
  publishLog('fatal', `Unhandled Rejection: ${reason.stack || reason}`)
})

const rabbitMqMorganStream = {
  write: (message) => {
    publishLog('info', message.trim())
  },
}

app.use(morgan('combined', { stream: rabbitMqMorganStream }))

app.use('/', userRoutes)

app.use(errorMiddlware)

export default app