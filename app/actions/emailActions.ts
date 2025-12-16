'use server';

import { sendEmail } from "@/lib/email";
import { WelcomeEmail } from "@/components/emails/WelcomeEmail";
import { InviteEmail } from "@/components/emails/InviteEmail";

export async function sendWelcomeEmailAction(email: string, firstName: string) {
    try {
        const result = await sendEmail({
            to: email,
            subject: "OrtakBarkod'a Hoşgeldiniz!",
            react: WelcomeEmail({ firstName })
        });
        return result;
    } catch (error) {
        console.error("Failed to send welcome email:", error);
        return { success: false, error };
    }
}

export async function sendInviteEmailAction(
    email: string,
    inviterName: string,
    role: string,
    inviteLink: string
) {
    try {
        const result = await sendEmail({
            to: email,
            subject: `${inviterName} sizi OrtakBarkod ekibine davet etti`,
            react: InviteEmail({ inviterName, role, inviteLink })
        });
        return result;
    } catch (error) {
        console.error("Failed to send invite email:", error);
        return { success: false, error };
    }
}
