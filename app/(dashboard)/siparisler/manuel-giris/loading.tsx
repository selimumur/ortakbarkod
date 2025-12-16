
import { Loader2 } from "lucide-react";

export default function Loading() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-[#0B1120] text-white">
            <Loader2 className="animate-spin mr-2" />
            Yükleniyor...
        </div>
    );
}
