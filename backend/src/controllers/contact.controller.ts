import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { sendEmail } from '../utils/email';
import { env } from '../config/env';

const contactFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(1, 'Message is required'),
});

export async function submitContactForm(req: Request, res: Response, next: NextFunction) {
  try {
    const data = contactFormSchema.parse(req.body);
    const { name, email, subject, message } = data;

    // Send email to the official admin/support mailbox
    const adminEmail = env.EMAIL_FROM || '2804blipzoinnovationptv@gmail.com';

    const text = `New Contact Form Submission\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject}\nMessage:\n${message}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px;">
          <span style="font-size: 24px; font-weight: 900; color: #111827; letter-spacing: -0.025em;">BLIPZO Support</span>
        </div>
        <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin-bottom: 16px;">New Contact Form Submission</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4b5563; width: 100px;">Name:</td>
            <td style="padding: 8px 0; color: #111827;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Email:</td>
            <td style="padding: 8px 0; color: #111827;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #4b5563;">Subject:</td>
            <td style="padding: 8px 0; color: #111827;">${subject}</td>
          </tr>
        </table>
        <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
          <p style="margin: 0; font-weight: bold; color: #4b5563; margin-bottom: 8px;">Message:</p>
          <p style="margin: 0; color: #374151; white-space: pre-wrap; line-height: 1.5;">${message}</p>
        </div>
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px;">
          This email was generated automatically from the BLIPZO Contact Us page.
        </p>
      </div>
    `;

    await sendEmail({
      email: adminEmail,
      subject: `[Contact Us] ${subject} - ${name}`,
      text,
      html,
    });

    res.json({
      success: true,
      message: 'Your message has been sent successfully. Support team will get back to you shortly.',
    });
  } catch (err) {
    next(err);
  }
}
