import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-center px-4">
            <div className="bg-blue-600/10 p-6 rounded-full border border-blue-500/20 mb-8 animate-bounce">
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-blue-500"
                >
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
            </div>
            <h1 className="text-6xl font-black text-white mb-4 tracking-tighter">404</h1>
            <h2 className="text-2xl font-bold text-gray-300 mb-6">Sayfa Bulunamadı</h2>
            <p className="text-gray-500 max-w-md mb-8 text-lg">
                Aradığınız sayfa silinmiş, taşınmış veya hiç var olmamış olabilir.
            </p>
            <Link
                href="/"
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-bold transition flex items-center gap-2"
            >
                Ana Sayfaya Dön
            </Link>
        </div>
    );
}
