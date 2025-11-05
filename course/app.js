import cookieParser from 'cookie-parser'
import cors from 'cors'
import { config } from 'dotenv'
import express from 'express'
import morgan from 'morgan'

import errorMiddlware from './middlewares/error.middleware.js'
import courseRoutes from './routes/course.Routes.js'

config()

const app = express()

app.use(express.json())

app.use(express.urlencoded({ extended: true }))

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  }),
)

app.use(cookieParser())

app.use(morgan('dev'))

app.use('/', courseRoutes)

app.use(errorMiddlware)

export default app