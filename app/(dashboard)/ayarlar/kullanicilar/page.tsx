"use client";

import { useState, useEffect } from 'react';
import {
  Users, UserPlus, Trash2, Shield, Mail, CheckCircle, XCircle, Edit2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  getOrganizationUsersAction,
  createOrganizationUserAction,
  updateOrganizationUserAction,
  deleteOrganizationUserAction
} from '@/app/actions/settingsActions';

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "personel"
  });

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    const data = await getOrganizationUsersAction();
    setUsers(data);
  }

  const openModal = (user: any = null) => {
    if (user) {
      setEditingId(user.id);
      setFormData({
        email: user.email,
        password: "", // Password logic is tricky for edits, usually irrelevant
        full_name: user.full_name,
        role: user.role
      });
    } else {
      setEditingId(null);
      setFormData({ email: "", password: "", full_name: "", role: "personel" });
    }
    setIsModalOpen(true);
  };

  async function handleSave() {
    if (!formData.full_name) {
      toast.error("Ad Soyad zorunludur.");
      return;
    }
    // Create Mode Validations
    if (!editingId) {
      if (!formData.email || !formData.password) {
        toast.error("E-posta ve şifre zorunludur.");
        return;
      }
      if (formData.password.length < 8) {
        toast.error("Şifre en az 8 karakter olmalıdır.");
        return;
      }
    }

    setLoading(true);
    try {
      if (editingId) {
        // Update
        await updateOrganizationUserAction(editingId, {
          full_name: formData.full_name,
          role: formData.role
        });
        toast.success("Kullanıcı güncellendi.");
      } else {
        // Create
        await createOrganizationUserAction({
          email: formData.email,
          full_name: formData.full_name,
          role: formData.role,
          password: formData.password
        });
        toast.success("Kullanıcı başarıyla oluşturuldu.");
      }
      setIsModalOpen(false);
      loadUsers();

    } catch (error: any) {
      toast.error("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      await deleteOrganizationUserAction(id);
      toast.success("Kullanıcı silindi.");
      loadUsers();
    } catch (e: any) {
      toast.error("Silme hatası: " + e.message);
    }
  }

  return (
    <div className="md:p-8 p-4 bg-[#0B1120] min-h-screen text-gray-200">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Users className="text-blue-500" /> Kullanıcı Yönetimi
          </h1>
          <p className="text-gray-500 text-sm mt-1">Sisteme giriş yapabilecek personelleri yönetin.</p>
        </div>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20 transition"
        >
          <UserPlus size={20} /> Yeni Kullanıcı Ekle
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
                    {user.full_name ? user.full_name.charAt(0) : "U"}
                  </div>
                  {user.full_name || "-"}
                </td>
                <td className="px-6 py-4">{user.email}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${user.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.is_active ? (
                    <span className="text-green-400 flex items-center gap-1 text-xs font-bold"><CheckCircle size={14} /> Aktif</span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1 text-xs font-bold"><XCircle size={14} /> Pasif</span>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => openModal(user)}
                      className="p-2 text-gray-400 hover:text-blue-400 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-gray-400 hover:text-red-500 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out">
          <div className="bg-[#1F2937] border border-gray-700 rounded-2xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-6">
              {editingId ? 'Kullanıcıyı Düzenle' : 'Yeni Kullanıcı Oluştur'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Ad Soyad</label>
                <input type="text" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                  value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div>
                <label className="block text-xs text-gray-400 uppercase font-bold mb-1">E-Posta</label>
                <input
                  type="email"
                  className={`w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors ${editingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={!!editingId}
                  value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              {!editingId && (
                <div>
                  <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Şifre</label>
                  <input type="password" className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                    placeholder="En az 8 karakter"
                    value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                </div>
              )}
              <div>
                <label className="block text-xs text-gray-400 uppercase font-bold mb-1">Yetki Rolü</label>
                <select className="w-full bg-[#111827] border border-gray-600 rounded-lg p-3 text-white focus:border-blue-500 outline-none transition-colors"
                  value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                  <option value="personel">Personel (Sınırlı)</option>
                  <option value="admin">Yönetici (Tam Yetki)</option>
                  <option value="muhasebe">Muhasebe</option>
                  <option value="uretim">Üretim</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 rounded-xl bg-gray-700 text-gray-300 hover:bg-gray-600 transition font-bold">İptal</button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white hover:bg-blue-500 transition font-bold shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2"
                >
                  {loading ? <RefreshCw className="animate-spin" size={20} /> : (editingId ? <Edit2 size={20} /> : <UserPlus size={20} />)}
                  {editingId ? 'Güncelle' : 'Oluştur'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}