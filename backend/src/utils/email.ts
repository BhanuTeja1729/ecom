import nodemailer from 'nodemailer';
import { env } from '../config/env';

interface SendEmailOptions {
  email: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  // 1. Check if Resend API Key is configured
  if (env.RESEND_API_KEY) {
    let sender = env.EMAIL_FROM || 'onboarding@resend.dev';
    // Resend sandbox account restriction requires using onboarding@resend.dev
    if (sender.endsWith('@gmail.com') || sender.includes('noreply@blipzo.com')) {
      sender = 'bhanuteja0741@gmail.com';
    }

    console.log(`📧 Sending email via Resend API to: ${options.email}`);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `BLIPZO <${sender}>`,
          to: [options.email],
          subject: options.subject,
          html: options.html,
          text: options.text,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Resend API error (${response.status}): ${JSON.stringify(errorData)}`);
      }

      const responseData = await response.json() as { id: string };
      console.log(`✅ Email sent successfully via Resend. ID: ${responseData.id}`);
      return;
    } catch (error) {
      console.error('❌ Failed to send email via Resend API:', error);
      throw error;
    }
  }

  // 2. Fallback to standard SMTP
  const host = env.SMTP_HOST;
  const port = env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : 587;
  const user = env.SMTP_USER;
  const pass = env.SMTP_PASS;
  const from = env.EMAIL_FROM || 'noreply@blipzo.com';

  if (!host || !user || !pass) {
    const logContent = `\n--- 📧 EMAIL OUTBOX (SMTP NOT CONFIGURED) ---\n` +
      `Date:    ${new Date().toISOString()}\n` +
      `To:      ${options.email}\n` +
      `Subject: ${options.subject}\n` +
      `Body (Text/HTML):\n${options.text || options.html}\n` +
      `--------------------------------------------\n`;

    console.warn(logContent);

    try {
      const fs = require('fs');
      const path = require('path');
      fs.appendFileSync(path.resolve(__dirname, '../../email-debug.log'), logContent);
    } catch (err) {
      console.error('Failed to write email to debug log file:', err);
    }
    return;
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from: `"BLIPZO" <${from}>`,
    to: options.email,
    subject: options.subject,
    text: options.text,
    html: options.html,
  };

  await transporter.sendMail(mailOptions);
}

export async function sendOtpEmail(to: string, otp: string): Promise<void> {
  const text = `Your verification code is: ${otp}. It is valid for 5 minutes.`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.025em;">BLIPZO</span>
      </div>
      <h2 style="font-size: 20px; font-weight: 700; color: #111827; margin-bottom: 16px; text-align: center;">Verify Your Email Address</h2>
      <p style="font-size: 16px; color: #4b5563; line-height: 24px; margin-bottom: 24px; text-align: center;">
        Thank you for signing up for BLIPZO. Please use the following One-Time Password (OTP) to verify your email address. This code is valid for 5 minutes.
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="display: inline-block; padding: 12px 24px; background-color: #f3f4f6; color: #111827; font-weight: 900; letter-spacing: 4px; font-size: 24px; border-radius: 8px; border: 1px solid #e5e7eb;">${otp}</span>
      </div>
      <p style="font-size: 14px; color: #9ca3af; line-height: 20px; text-align: center;">
        If you did not request this verification, please ignore this email.
      </p>
    </div>
  `;
  await sendEmail({ email: to, subject: 'Verify your BLIPZO Email', text, html });
}
