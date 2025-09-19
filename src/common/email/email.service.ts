import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: any | null = null;

  constructor() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nodemailer = require('nodemailer');
      const host = process.env.SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || '587', 10);
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;
      if (host && user && pass) {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user, pass },
        });
      }
    } catch (e) {
      this.transporter = null;
    }
  }

  async send(to: string, subject: string, text: string, html?: string) {
    const from = process.env.NOTIFICATION_FROM_EMAIL || process.env.SMTP_USER || 'no-reply@example.com';
    if (this.transporter) {
      try {
        await this.transporter.sendMail({ from, to, subject, text, html });
        return { ok: true };
      } catch (err) {
        this.logger.warn(`Email send failed: ${err?.message}`);
      }
    }
    // Fallback: log email content for dev environments
    this.logger.log(`[EMAIL Fallback] To=${to} Subject=${subject} Text=${text}`);
    return { ok: false, fallback: true };
  }
}

