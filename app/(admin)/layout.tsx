import { ClerkProvider } from '@clerk/nextjs'
import '../globals.css'
import { Toaster } from 'sonner'
import AdminSidebar from '../components/AdminSidebar';
import { adminAuth } from '@/lib/adminAuth';

export const metadata = {
    title: 'OrtakBarkod - Süper Admin',
    description: 'Platform Yönetim Paneli',
    robots: {
        index: false,
        follow: false,
    },
}

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // Phase 1: Security Check
    await adminAuth();

    return (
        <div className="flex min-h-screen bg-[#020617] text-white">
            <AdminSidebar />
            <main className="flex-1 ml-64 p-8 relative overflow-y-auto">
                {children}
            </main>
            <Toaster position="top-right" theme="dark" />
        </div>
    )
}
