'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Pazaryerleri page error:', error);
    }, [error]);

    return (
        <div className="w-full h-full bg-[#0B1120] p-8 flex items-center justify-center">
            <div className="bg-[#111827] border border-red-500/20 rounded-xl p-8 max-w-md w-full">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-red-500/10 rounded-lg">
                        <AlertTriangle className="text-red-500" size={32} />
                    </div>
                    <h2 className="text-xl font-bold text-white">Bir Hata Oluştu</h2>
                </div>

                <p className="text-gray-400 mb-6">
                    Pazaryeri ayarları yüklenirken bir sorun oluştu. Lütfen sayfayı yenilemeyi deneyin.
                </p>

                {error.message && (
                    <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 mb-6">
                        <p className="text-xs text-red-400 font-mono">{error.message}</p>
                    </div>
                )}

                <button
                    onClick={reset}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-lg transition flex items-center justify-center gap-2 font-bold"
                >
                    <RefreshCw size={18} />
                    Tekrar Dene
                </button>
            </div>
        </div>
    );
}
