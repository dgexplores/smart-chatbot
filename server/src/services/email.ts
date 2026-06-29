import nodemailer from 'nodemailer';

export interface EmailData {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

const getTransporter = () => {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '2525', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

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
  const from = process.env.SMTP_FROM || 'noreply@asep.local';
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
