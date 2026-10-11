import nodemailer from 'nodemailer';

const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
const smtpPort = Number(process.env.SMTP_PORT || 587);
const smtpSecure = process.env.SMTP_SECURE === 'true';

const smtpUser = process.env.SMTP_USER;
const smtpPassword = process.env.SMTP_PASSWORD;

if (!smtpUser || !smtpPassword) {
  console.warn(
    'SMTP configuration is incomplete. Email notifications will not work until SMTP_USER and SMTP_PASSWORD are configured.'
  );
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPassword,
  },
});

export type SendEmailOptions = {
  to: string;
  subject: string;
  text: string;
  html?: string;

  /**
   * Sender identity loaded from MongoDB.
   *
   * IMPORTANT:
   * The SMTP account must be authorized by your mail server
   * to send using this address.
   */
  senderName?: string;
  senderEmail?: string;
};

export async function sendEmail(options: SendEmailOptions) {
  if (!smtpUser) {
    throw new Error(
      'SMTP_USER is missing. Please configure SMTP_USER in the backend .env file.'
    );
  }

  if (!smtpPassword) {
    throw new Error(
      'SMTP_PASSWORD is missing. Please configure SMTP_PASSWORD in the backend .env file.'
    );
  }

  if (!options.to?.trim()) {
    throw new Error('Recipient email address is required.');
  }

  if (!options.subject?.trim()) {
    throw new Error('Email subject is required.');
  }

  if (!options.text?.trim()) {
    throw new Error('Email text content is required.');
  }

  /*
   * Use the MongoDB user identity when supplied.
   *
   * If senderEmail is not supplied, fall back to the SMTP account.
   */
  const senderEmail =
    options.senderEmail?.trim() || smtpUser;

  const senderName =
    options.senderName?.trim() || 'R&S Demo Equipment';

  const from = `${senderName} <${senderEmail}>`;

  try {
    const info = await transporter.sendMail({
      from,
      to: options.to.trim(),
      subject: options.subject.trim(),
      text: options.text,
      html: options.html,
    });

    console.log(
      `Email sent successfully`,
      {
        from,
        to: options.to.trim(),
        subject: options.subject.trim(),
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response,
      }
    );

    return info;
  } catch (error) {
    console.error(
      `Failed to send email`,
      {
        from,
        to: options.to.trim(),
        subject: options.subject.trim(),
        error,
      }
    );

    throw error;
  }
}

export async function verifyEmailConnection(): Promise<boolean> {
  if (!smtpUser || !smtpPassword) {
    console.warn(
      'SMTP verification skipped: SMTP_USER or SMTP_PASSWORD is missing.'
    );

    return false;
  }

  try {
    await transporter.verify();

    console.log(
      `SMTP connection verified successfully using ${smtpHost}:${smtpPort}`
    );

    return true;
  } catch (error) {
    console.error(
      'SMTP connection verification failed:',
      error
    );

    return false;
  }
}