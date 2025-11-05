const express = require('express')
const cors = require('cors')
const createProxyMiddleware = require(
  'http-proxy-middleware').createProxyMiddleware
const morgan = require('morgan')
const errorMiddlware = require('./middlewares/error.middleware.js')

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

// // Increase payload size limits
// app.use(express.json({ limit: '50mb' }))
// app.use(express.urlencoded({ limit: '50mb', extended: true }))

app.use(morgan('dev'))

// // Proxy configuration with increased limits
// const proxyOptions = {
//   limit: '50mb',
//   parseReqBody: true,
// }

app.use('/api/v1/course', createProxyMiddleware({
  target: process.env.COURSE_SERVICE_URL,
  changeOrigin: true
}))
app.use('/api/v1/payment', createProxyMiddleware({
  target: process.env.PAYMENT_SERVICE_URL,
  changeOrigin: true

}))

app.use('/api/v1/user', createProxyMiddleware({
  target: process.env.USER_SERVICE_URL,
  changeOrigin: true

}))

app.use('/api/v1/', createProxyMiddleware({
  target: process.env.MISC_SERVICE_URL,
  changeOrigin: true
}))

app.all(/.*/, (_req, res) => {
  res.status(404).send('OOPS!! 404 page not found')
})

app.use(errorMiddlware)

app.listen(process.env.PORT, () => {
  console.log(`API Gateway running on port ${process.env.PORT}`)
})