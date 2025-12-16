import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative flex min-h-screen items-center justify-center bg-[#0B1120]">
            <Link
                href="/"
                className="absolute top-8 left-8 flex items-center gap-2 text-gray-400 hover:text-white transition group"
            >
                <div className="p-2 rounded-full bg-white/5 border border-white/10 group-hover:bg-white/10 transition">
                    <ChevronLeft size={20} />
                </div>
                <span className="font-medium">Ana Sayfaya Dön</span>
            </Link>
            {children}
        </div>
    );
}
