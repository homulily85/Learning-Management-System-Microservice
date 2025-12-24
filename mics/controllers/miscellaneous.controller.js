import asyncHandler from '../middlewares/asyncHAndler.middleware.js'
import User from '../models/usermodel.js'
import AppError from '../utils/error.util.js'
import configManager from '../config/configManager.js'
import { publishToEmailQueue } from '../utils/producer.js'

/**
 * @CONTACT_US
 * Handles the submission of the "Contact Us" form by the user.
 * Sends an email to the admin with the user's details.
 */
// export const contactUs = asyncHandler(async (req, res, next) => {
//     const { name, email, message } = req.body
//
//     if (!name || !email || !message) {
//         return next(new AppError('Name, Email, Message are required'))
//     }
//
//     try {
//         const subject = 'Contact Us Form'
//         const textMessage = `${name} - ${email} <br /> ${message}`
//
//         await sendEmail(configManager.get('CONTACT_US_EMAIL'), subject,
//             textMessage)
//     } catch (error) {
//         console.log(error)
//         return next(new AppError(error.message, 400))
//     }
//
//     res.status(200).json({
//         success: true,
//         message: 'Your request has been submitted successfully',
//     })
// })

export const contactUs = asyncHandler(async (req, res, next) => {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
        return next(new AppError('Name, Email, Message are required', 400));
    }

    try {
        // Prepare the payload for the worker
        const emailPayload = {
            to: configManager.get('CONTACT_US_EMAIL'),
            subject: 'Contact Us Form',
            // We pass raw data; html formatting happens in the worker
            bodyData: { name, email, message }
        };

        // 1. Add to Queue (Non-blocking I/O)
        await publishToEmailQueue(emailPayload);

    } catch (error) {
        console.error('Queue Error:', error);
        // If RabbitMQ is down, we must fail the request
        return next(new AppError('Service temporarily unavailable, please try again later.', 500));
    }

    // 2. Respond immediately
    res.status(200).json({
        success: true,
        message: 'Your request has been submitted successfully',
    });
});

/**
 * @USER_STATS
 * Fetches the statistics of the users (total users and active subscribers).
 */
export const userStats = asyncHandler(async (req, res, next) => {
    const allUsersCount = await User.countDocuments()

    const subscribedUsersCount = await User.countDocuments({
        'subscription.status': 'active', // subscription.status means we are
                                         // going inside an object and we have
                                         // to put this in quotes
    })

    res.status(200).json({
        success: true,
        message: 'All registered users count',
        allUsersCount,
        subscribedUsersCount,
    })
})