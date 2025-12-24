const express = require('express')
const cors = require('cors')
const createProxyMiddleware = require(
  'http-proxy-middleware').createProxyMiddleware
const morgan = require('morgan')
const errorMiddlware = require('./middlewares/error.middleware.js')
const { connectRabbitMQ, publishLog } = require('./config/loggingCenterConnect')
const rateLimit = require('express-rate-limit')

require('dotenv').config()

const app = express()

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  }),
)

app.use('/configs',
  createProxyMiddleware({
    target: process.env.CONFIG_SERVICE_URL,
    changeOrigin: true,
    ws: true,
    pathRewrite: { '^/configs': '' },
  }),
)

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 250, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  message: 'Too many requests from this IP, please try again after 15 minutes.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
})

// Apply the rate limiting middleware to all requests
app.use(limiter)

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

app.use('/api/v1/course', createProxyMiddleware({
  target: process.env.COURSE_SERVICE_URL,
  changeOrigin: true,
}))

app.use('/api/v1/payment', createProxyMiddleware({
  target: process.env.PAYMENT_SERVICE_URL,
  changeOrigin: true,

}))

app.use('/api/v1/user', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL,
  changeOrigin: true,

}))

app.use('/api/v1/', createProxyMiddleware({
  target: process.env.MISC_SERVICE_URL,
  changeOrigin: true,
}))

app.all(/.*/, (_req, res) => {
  res.status(404).send('OOPS!! 404 page not found')
})

app.use(errorMiddlware)

connectRabbitMQ().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(
      `User service (producer) listening on http://localhost:${process.env.PORT}`)
  })
})