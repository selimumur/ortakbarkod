"use client";

import { useEffect, useState } from 'react';
import { getBroadcastMessageAction } from '@/app/actions/commonActions';
import { Megaphone, X } from 'lucide-react';

export default function BroadcastBanner() {
    const [message, setMessage] = useState("");
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const fetchMessage = async () => {
            try {
                const res = await getBroadcastMessageAction();
                if (res.message) {
                    setMessage(res.message);
                }
            } catch (e) {
                console.error("Broadcast fetch error", e);
            }
        };

        fetchMessage();

        // Optional: Poll every 60s to catch updates without refresh
        const interval = setInterval(fetchMessage, 60000);
        return () => clearInterval(interval);
    }, []);

    if (!message || !visible) return null;

    return (
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] animate-gradient-x text-white py-2 px-4 shadow-lg flex items-center justify-between relative z-50">
            <div className="flex items-center gap-3 mx-auto font-medium text-sm">
                <Megaphone size={16} className="animate-bounce" />
                <span>{message}</span>
            </div>
            <button
                onClick={() => setVisible(false)}
                className="absolute right-4 text-white/70 hover:text-white transition"
            >
                <X size={14} />
            </button>
        </div>
    );
}
