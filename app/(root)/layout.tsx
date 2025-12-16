export default function LandingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="bg-[#0B1120] text-white min-h-screen flex flex-col">
            <nav className="p-6 border-b border-white/10 flex justify-between items-center max-w-7xl mx-auto w-full">
                <div className="text-2xl font-black tracking-tight">Ortak<span className="text-blue-500">Barkod</span></div>
                <div className="flex gap-4">
                    <a href="/login" className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 font-bold transition">Giriş Yap</a>
                </div>
            </nav>
            <main className="flex-1">
                {children}
            </main>
            <footer className="p-8 border-t border-white/10 text-center text-gray-500 text-sm">
                &copy; 2025 OrtakBarkod. Tüm hakları saklıdır.
            </footer>
        </div>
    );
}
