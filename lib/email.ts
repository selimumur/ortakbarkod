import { Resend } from 'resend';

// Use environment variable or fallback to empty string (which will cause error on send if missing)
// We avoid hardcoding keys.
const resend = new Resend(process.env.RESEND_API_KEY || '');

export interface EmailPayload {
    to: string | string[];
    subject: string;
    react: React.ReactNode;
    from?: string;
}

const DEFAULT_FROM = 'OrtakBarkod <onboarding@resend.dev>'; // Default for testing

export async function sendEmail({ to, subject, react, from = DEFAULT_FROM }: EmailPayload) {
    if (!process.env.RESEND_API_KEY) {
        console.warn("RESEND_API_KEY is missing. Email skipped:", subject, to);
        return { success: false, error: "Missing API Key" };
    }

    try {
        const data = await resend.emails.send({
            from,
            to,
            subject,
            react,
        });

        return { success: true, data };
    } catch (error) {
        console.error("Email Error:", error);
        return { success: false, error };
    }
}
