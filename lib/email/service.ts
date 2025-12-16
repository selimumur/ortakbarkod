
import { Resend } from 'resend';

interface SendEmailParams {
    to: string | string[];
    subject: string;
    html: string;
    tag?: string; // e.g. 'welcome', 'invoice'
}

export class EmailService {
    private static instance: EmailService;
    private fromEmail = 'onboarding@resend.dev'; // Default testing email. USER MUST CHANGE THIS.
    private resendClient: Resend | null = null;

    private constructor() {
        if (process.env.EMAIL_FROM) {
            this.fromEmail = process.env.EMAIL_FROM;
        }
    }

    public static getInstance(): EmailService {
        if (!EmailService.instance) {
            EmailService.instance = new EmailService();
        }
        return EmailService.instance;
    }

    private getResend(): Resend {
        if (!this.resendClient) {
            const apiKey = process.env.RESEND_API_KEY || 're_123456789'; // Dummy default to prevent build crash if missing
            this.resendClient = new Resend(apiKey);
        }
        return this.resendClient;
    }

    public async sendEmail({ to, subject, html, tag }: SendEmailParams) {
        if (!process.env.RESEND_API_KEY) {
            console.warn("RESEND_API_KEY is not set. Email simulation:");
            console.log(`To: ${to}, Subject: ${subject}, Tag: ${tag}`);
            return { success: false, error: 'API Key Missing' };
        }

        try {
            const data = await this.getResend().emails.send({
                from: this.fromEmail,
                to,
                subject,
                html,
                tags: tag ? [{ name: 'category', value: tag }] : undefined
            });

            return { success: true, data };
        } catch (error: any) {
            console.error('Email Send Error:', error);
            return { success: false, error: error.message };
        }
    }
}

export const emailService = EmailService.getInstance();
