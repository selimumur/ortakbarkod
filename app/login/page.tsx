"use client";

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Lock, Mail, Loader2, Barcode } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error("Giriş Başarısız: " + error.message);
      setLoading(false);
    } else {
      toast.success("Giriş Başarılı! Yönlendiriliyorsunuz...");
      router.push("/"); // Dashboard'a git
      router.refresh(); // Middleware'i tetikle
    }
  };

  return (
    <div className="min-h-screen bg-[#0B1120] flex items-center justify-center p-4">
      {/* Arkaplan Süslemesi */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-600/20 rounded-full blur-[100px]"></div>
         <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-md bg-[#111827] border border-gray-800 rounded-2xl p-8 shadow-2xl relative z-10">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/30">
             <Barcode size={32} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">ORTAK<span className="text-blue-500">BARKOD</span></h1>
          <p className="text-gray-500 text-sm mt-2">Yönetici Paneli Girişi</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">E-Posta Adresi</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-500 transition" size={20}/>
              <input 
                type="email" 
                required
                className="w-full bg-[#0f1623] border border-gray-700 rounded-xl py-3 pl-10 text-white focus:border-blue-500 outline-none transition"
                placeholder="isim@sirket.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Şifre</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-3 text-gray-500 group-focus-within:text-blue-500 transition" size={20}/>
              <input 
                type="password" 
                required
                className="w-full bg-[#0f1623] border border-gray-700 rounded-xl py-3 pl-10 text-white focus:border-blue-500 outline-none transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transform active:scale-95"
          >
            {loading ? <Loader2 className="animate-spin" size={22}/> : "Giriş Yap"}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-gray-600">
           &copy; 2025 OrtakBarkod SaaS. Tüm hakları saklıdır.
        </div>

      </div>
    </div>
  );
}