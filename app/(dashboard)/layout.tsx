import Sidebar from '../components/Sidebar';
import NotificationListener from '../components/NotificationListener';
import BroadcastBanner from '@/components/BroadcastBanner';
import { enforceSubscription } from '@/lib/subscription';
import { headers } from 'next/headers';
import { adminAuth } from '@/lib/adminAuth';

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // 1. Get Path from Middleware Header
    const headersList = await headers();
    const currentPath = headersList.get('x-current-path') || '/dashboard';

    // 2. Enforce Subscription (Unless Admin?)
    // If Admin is browsing dashboard (e.g. testing), we might not want to lock them out.
    // But usually admins have their own /admin layout. If they visit /dashboard, they are treated as a user?
    // Let's assume admins using the app strictly for management might not need this check, or we check if they are "Super Admin".
    // But for now, let's just run the check. If the "Super Admin" user (selimumur) has no subscription, they will be locked!
    // FIX: whitelist super admin email or ID?
    // Actually, let's strict lock regardless. The Admin can give THEMSELVES a subscription via Admin Panel :) 
    // This is dogfooding.
    const access = await enforceSubscription(currentPath);

    return (
        <div className="flex min-h-screen">
            <Sidebar subscription={{
                plan: access.planId || 'free',
                daysRemaining: access.daysRemaining,
                status: access.status
            }} features={access.features} />
            <main className="flex-1 ml-0 md:ml-0 transition-all duration-300 relative">
                <BroadcastBanner />
                <NotificationListener />
                {children}
            </main>
        </div>
    );
}
