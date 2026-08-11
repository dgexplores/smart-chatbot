import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const getTransporter = () => {
  const host = config.smtpHost;
  const port = config.smtpPort;
  const user = config.smtpUser;
  const pass = config.smtpPass;

  if (!user || !pass) {
    // If no credentials, we return null to fall back to Console logger mock
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    auth: {
      user,
      pass
    }
  });
};

/**
 * Dispatches an email notification. Falls back to console log if SMTP credentials are blank.
 */
export const sendEmail = async (data: EmailData): Promise<boolean> => {
  const from = config.smtpFrom;
  const transporter = getTransporter();

  if (!transporter) {
    console.log(`[Email Mock Logger]
=========================================
FROM: ${from}
TO: ${data.to}
SUBJECT: ${data.subject}
MESSAGE:
${data.text}
=========================================`);
    return true;
  }

  try {
    await transporter.sendMail({
      from,
      to: data.to,
      subject: data.subject,
      text: data.text,
      html: data.html
    });
    console.log(`[Email Service] Email sent successfully to: ${data.to}`);
    return true;
  } catch (error) {
    console.error(`[Email Service] Failed to send email:`, error);
    return false;
  }
};
