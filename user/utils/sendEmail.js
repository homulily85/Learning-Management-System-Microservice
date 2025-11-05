import nodemailer from "nodemailer";
import configManager from '../config/configManager.js'

// async..await is not allowed in global scope, must use a wrapper
const sendEmail = async function (email, subject, message) {
  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: configManager.get('SMTP_HOST'),
    port: configManager.get('SMTP_PORT'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: configManager.get('SMTP_USERNAME'),
      pass: configManager.get('SMTP_PASSWORD'),
    },
  });

  // send mail with defined transport object
  await transporter.sendMail({
    from: configManager.get("SMTP_FROM_EMAIL"), // sender address
    to: email, // user email
    subject: subject, // Subject line
    html: message, // html body
  });
};

export default sendEmail;
