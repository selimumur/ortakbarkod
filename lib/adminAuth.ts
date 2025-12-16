import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const SUPER_ADMIN_EMAILS = ["selimumur@gmail.com"];

export async function adminAuth() {
    const user = await currentUser();

    if (!user) {
        redirect("/sign-in");
    }

    const email = user.emailAddresses.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses[0]?.emailAddress;

    if (!email || !SUPER_ADMIN_EMAILS.includes(email)) {
        console.error(`Unauthorized Admin Access Attempt: ${email} (${user.id})`);
        redirect("/"); // Return to dashboard if not admin
    }

    return user;
}
