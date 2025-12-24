// worker.js
import amqp from 'amqplib';
import sendEmail from './sendEmail.js'
import configManager from '../config/configManager';

const runWorker = async () => {
    try {
        const connection = await amqp.connect(configManager.get('RABBITMQ_URL') || 'amqp://localhost');
        const channel = await connection.createChannel();
        const queue = 'email_queue';

        await channel.assertQueue(queue, { durable: true });

        // Process 1 message at a time to prevent overwhelming the email provider
        channel.prefetch(1);

        console.log(`Waiting for messages in ${queue}...`);

        channel.consume(queue, async (msg) => {
            if (msg !== null) {
                const payload = JSON.parse(msg.content.toString());

                try {
                    // Reconstruct the HTML message here
                    const { name, email, message } = payload.bodyData;
                    const textMessage = `${name} - ${email} <br /> ${message}`;

                    // Perform the actual blocking operation
                    await sendEmail(payload.to, payload.subject, textMessage);

                    console.log(`Email sent to ${payload.to}`);

                    // ACKNOWLEDGE the message (removes it from queue)
                    channel.ack(msg);
                } catch (error) {
                    console.error('Failed to send email:', error);

                    // Optional: Reject message.
                    // requeue: false sends it to a Dead Letter Exchange if configured,
                    // requeue: true puts it back to be tried again (be careful of infinite loops)
                    channel.nack(msg, false, false);
                }
            }
        });
    } catch (error) {
        console.error('Worker error:', error);
    }
};

runWorker();