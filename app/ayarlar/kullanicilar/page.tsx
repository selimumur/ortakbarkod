"use client";

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { 
  Users, UserPlus, Trash2, Shield, Mail, CheckCircle, XCircle, Search 
} from 'lucide-react';
import { toast } from 'sonner';

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Yeni Kullanıcı Formu
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "personel" // Varsayılan rol
  });

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  // Kullanıcıları Listele
  async function fetchUsers() {
    setLoading(true);
    // profiles tablosundan çekiyoruz
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setUsers(data);
    setLoading(false);
  }

  // Yeni Kullanıcı Oluştur
  async function handleCreateUser() {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error("Lütfen tüm alanları doldurun.");
      return;
    }

    if (newUser.password.length < 6) {
        toast.error("Şifre en az 6 karakter olmalıdır.");
        return;
    }

    const toastId = toast.loading("Kullanıcı oluşturuluyor...");

    // 1. Supabase Auth'a Kayıt Et
    // Not: Bu işlem sırasında mevcut oturumun kapanmaması için 'signUp' yerine 
    // Admin API kullanmak en doğrusudur ama Client tarafında basit çözüm:
    // signUp yaparsak oturum değişebilir. O yüzden bu işlemi Backend API route'a taşımak en iyisidir.
    // Ancak şimdilik pratik çözüm olarak supabase.auth.signUp kullanacağız. 
    // DİKKAT: Bu işlemden sonra senin oturumun kapanabilir, tekrar giriş yapman gerekebilir.
    // Bunu engellemek için Backend Route (API) kullanmalıyız.
    
    // Şimdilik Backend API yazmak yerine veritabanına manuel ekleme simülasyonu yapalım 
    // ama doğrusu API Route kullanmaktır.
    // Basitlik adına: Supabase Dashboard'dan kullanıcı eklemek en temizidir.
    // Ama kodla yapmak istiyorsan buraya bir API Route (app/api/users/route.ts) eklememiz lazım.
    
    // Geçici Çözüm (API Route Olmadan):
    // Kullanıcıya "Şimdilik Supabase panelinden ekle" uyarısı verelim veya API yazalım.
    // Gel API yazalım, en temizi o.
    
    try {
        const response = await fetch('/api/admin/create-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser)
        });
        
        const result = await response.json();

        if (!response.ok) throw new Error(result.error);

        toast.dismiss(toastId);
        toast.success("Kullanıcı başarıyla oluşturuldu! 🎉");
        setIsModalOpen(false);
        setNewUser({ email: "", password: "", full_name: "", role: "personel" });
        fetchUsers();

    } catch (error: any) {
        toast.dismiss(toastId);
        toast.error("Hata: " + error.message);
    }
  }

  return (
    <div className="p-8 bg-[#0B1120] min-h-screen text-gray-200">
      
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-blue-500"/> Kullanıcı Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sisteme giriş yapabilecek personelleri yönetin.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition"
        >
          <UserPlus size={20}/> Yeni Kullanıcı Ekle
        </button>
      </div>

      {/* LİSTE */}
      <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-left text-sm text-gray-400">
          <thead className="bg-[#1F2937] text-gray-200 uppercase text-xs font-bold">
            <tr>
              <th className="px-6 py-4">Ad Soyad</th>
              <th className="px-6 py-4">E-Posta</th>
              <th className="px-6 py-4">Rol</th>
              <th className="px-6 py-4">Durum</th>
              <th className="px-6 py-4 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-800/50 transition">
                <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold">
                      {user.full_name?.charAt(0) || "U"}
                   </div>
                   {user.full_name || "-"}
                </td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                   <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                       user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                       'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                   }`}>
                      {user.role}
                   </span>
                </td>
                <td className="px-6 py-4">
                   {user.is_active ? (
                       <span className="text-green-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14}/> Aktif</span>
                   ) : (
                       <span className="text-red-400 flex items-center gap-1 text-xs font-bold"><XCircle size={14}/> Pasif</span>
                   )}
                </td>
                <td className="px-6 py-4 text-right">
                   <button className="text-gray-500 hover:text-red-500 transition"><Trash2 size={18}/></button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Henüz kullanıcı yok.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[#1F2937] border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-white mb-6">Yeni Kullanıcı Oluştur</h3>
              
              <div className="space-y-4">
                 <div>
                    <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Ad Soyad</label>
                    <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                       value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})}/>
                 </div>
                 <div>
                    <label className="block text-xs text-gray-400 uppercase font-bold mb-1">E-Posta</label>
                    <input type="email" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                       value={newUser.email} onChange={e => setNewUser({...newUser, email: e.target.value})}/>
                 </div>
                 <div>
                    <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Şifre</label>
                    <input type="password" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                       placeholder="En az 6 karakter"
                       value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})}/>
                 </div>
                 <div>
                    <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Yetki Rolü</label>
                    <select className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none"
                       value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value})}>
                       <option value="personel">Personel (Sınırlı)</option>
                       <option value="admin">Yönetici (Tam Yetki)</option>
                       <option value="muhasebe">Muhasebe</option>
                       <option value="uretim">Üretim</option>
                    </select>
                 </div>

                 <div className="flex gap-3 mt-6">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition font-bold">İptal</button>
                    <button onClick={handleCreateUser} className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition font-bold shadow-lg shadow-blue-900/20">Oluştur</button>
                 </div>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}