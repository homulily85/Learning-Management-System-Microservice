const { connect } = require('amqplib')
require('dotenv').config()

const RABBITMQ_URL = process.env.RABBITMQ_URL
const EXCHANGE_NAME = process.env.EXCHANGE_NAME
const SERVICE_NAME = process.env.SERVICE_NAME

let channel

async function connectRabbitMQ () {
  try {
    const connection = await connect(RABBITMQ_URL)
    channel = await connection.createChannel()

    await channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true,
    })

    console.log('Connected to RabbitMQ and exchange is ready.')

  } catch (error) {
    console.error('Failed to connect to RabbitMQ:', error)
    process.exit(1)
  }
}

// Helper function to publish a log (Unchanged)
function publishLog (logLevel, message) {
  if (!channel) {
    console.error('RabbitMQ channel is not available!')
    return
  }

  const logMessage = {
    service: SERVICE_NAME,
    level: logLevel,
    timestamp: new Date().toISOString(),
    message: message,
  }

  const routingKey = `${SERVICE_NAME}.${logLevel}`
  const payload = Buffer.from(JSON.stringify(logMessage))

  channel.publish(EXCHANGE_NAME, routingKey, payload, {
    persistent: true,
  })

  console.log(`[Producer] Sent log: ${routingKey}`)
}

module.exports = { publishLog, connectRabbitMQ };