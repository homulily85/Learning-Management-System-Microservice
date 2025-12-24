import amqp from 'amqplib';
import configManager from '../config/configManager.js';

let channel = null;

const connectRabbitMQ = async () => {
    try {
        const connection = await amqp.connect(configManager.get('RABBITMQ_URL') || 'amqp://localhost');
        channel = await connection.createChannel();
        // distinct queue for emails
        await channel.assertQueue('email_queue', { durable: true });
    } catch (error) {
        console.error('RabbitMQ connection failed', error);
    }
};

// Initialize connection immediately (or call this in your server startup)
connectRabbitMQ();

export const publishToEmailQueue = async (data) => {
    if (!channel) {
        await connectRabbitMQ();
    }

    try {
        // Send data as a Buffer
        channel.sendToQueue('email_queue', Buffer.from(JSON.stringify(data)), {
            persistent: true // Saves message to disk if RabbitMQ restarts
        });
    } catch (error) {
        throw new Error('Failed to queue email task');
    }
};