const amqp = require('amqplib');
require('dotenv').config();

const RABBITMQ_URL = process.env.RABBITMQ_URL
const EXCHANGE_NAME = process.env.EXCHANGE_NAME
const QUEUE_NAME = process.env.QUEUE_NAME

async function startConsumer() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, 'topic', {
      durable: true
    });

    const q = await channel.assertQueue(QUEUE_NAME, {
      durable: true
    });

    const bindingKey = '#';
    await channel.bindQueue(q.queue, EXCHANGE_NAME, bindingKey);

    console.log('Waiting for logs. To exit press CTRL+C');

    channel.consume(q.queue, (msg) => {
      if (msg.content) {
        const logEntry = JSON.parse(msg.content.toString());

        console.log(`[Consumer] Received log from [${logEntry.service}]:`);
        console.log(JSON.stringify(logEntry, null, 2));
        console.log('---');

        channel.ack(msg);
      }
    }, {
      noAck: false
    });

  } catch (error) {
    console.error('Failed to start consumer:', error);
  }
}

startConsumer();