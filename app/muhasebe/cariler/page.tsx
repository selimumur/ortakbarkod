"use client";

import { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Users, 
  Phone, 
  Mail, 
  MoreHorizontal, 
  X,
  CheckCircle,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';
import { toast } from 'sonner';
import Link from 'next/link'; // Link bileşeni eklendi

// TİP TANIMLAMALARI
type ContactType = 'customer' | 'supplier';

interface Contact {
  id: string; // id string oldu (c-1, s-2 gibi)
  original_id: number;
  type: ContactType;
  name: string;
  phone: string;
  email: string;
  balance: number;
}

export default function CurrentAccountsPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'supplier'>('all');

  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    type: 'customer',
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchContacts();
  }, []);

  // 1. VERİLERİ ÇEK VE BİRLEŞTİR
  async function fetchContacts() {
    setLoading(true);
    try {
      // Müşterileri Çek
      const { data: customers, error: custErr } = await supabase.from('customers').select('*');
      if (custErr) throw custErr;

      // Tedarikçileri Çek
      const { data: suppliers, error: supErr } = await supabase.from('suppliers').select('*');
      if (supErr) throw supErr;

      // Verileri normalize et ve birleştir
      const formattedCustomers = (customers || []).map(c => ({
        ...c,
        original_id: c.id,
        type: 'customer' as ContactType,
        id: `c-${c.id}` 
      }));

      const formattedSuppliers = (suppliers || []).map(s => ({
        ...s,
        original_id: s.id,
        type: 'supplier' as ContactType,
        id: `s-${s.id}`
      }));

      setContacts([...formattedCustomers, ...formattedSuppliers]);

    } catch (error: any) {
      toast.error("Veriler yüklenirken hata: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // 2. YENİ CARİ EKLEME
  async function handleCreateContact() {
    if (!newContact.name) return toast.error("İsim alanı zorunludur.");
    
    setModalLoading(true);
    try {
      const table = newContact.type === 'customer' ? 'customers' : 'suppliers';
      
      const { error } = await supabase.from(table).insert({
        name: newContact.name,
        phone: newContact.phone,
        email: newContact.email,
        address: newContact.address,
        balance: 0 
      });

      if (error) throw error;

      toast.success(`${newContact.type === 'customer' ? 'Müşteri' : 'Tedarikçi'} başarıyla oluşturuldu!`);
      setIsModalOpen(false);
      setNewContact({ type: 'customer', name: '', phone: '', email: '', address: '' });
      fetchContacts(); 

    } catch (error: any) {
      toast.error("Hata: " + error.message);
    } finally {
      setModalLoading(false);
    }
  }

  // FİLTRELEME MANTIĞI
  const filteredContacts = contacts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (c.phone && c.phone.includes(searchTerm)) || 
                          (c.email && c.email.toLowerCase().includes(searchTerm));
    const matchesType = filterType === 'all' || c.type === filterType;
    return matchesSearch && matchesType;
  });

  // ÖZET İSTATİSTİKLER
  const totalReceivables = contacts.filter(c => c.type === 'customer').reduce((acc, curr) => acc + (curr.balance || 0), 0);
  const totalPayables = contacts.filter(c => c.type === 'supplier').reduce((acc, curr) => acc + (curr.balance || 0), 0);

  return (
    <div className="p-8 min-h-screen bg-[#0B1120] text-white font-sans">
      
      {/* ÜST BAŞLIK VE ÖZET */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Users className="text-blue-500" /> Cari Hesaplar
          </h1>
          <p className="text-gray-400 mt-1">Müşteri ve tedarikçi bakiyelerini yönetin.</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-[#111827] border border-gray-800 px-4 py-2 rounded-xl">
             <p className="text-xs text-gray-500 uppercase">Toplam Alacak</p>
             <p className="text-lg font-bold text-green-400">₺{totalReceivables.toLocaleString()}</p>
          </div>
          <div className="bg-[#111827] border border-gray-800 px-4 py-2 rounded-xl">
             <p className="text-xs text-gray-500 uppercase">Toplam Borç</p>
             <p className="text-lg font-bold text-red-400">₺{totalPayables.toLocaleString()}</p>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl font-bold flex items-center gap-2 transition shadow-lg shadow-blue-900/20"
          >
            <Plus size={20} /> Yeni Cari Ekle
          </button>
        </div>
      </div>

      {/* FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input 
            type="text" 
            placeholder="Cari adı, telefon veya e-posta ara..." 
            className="w-full bg-[#111827] border border-gray-800 text-white pl-10 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex bg-[#111827] p-1 rounded-xl border border-gray-800">
          <button 
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterType === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
          >
            Tümü
          </button>
          <button 
            onClick={() => setFilterType('customer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterType === 'customer' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:text-white'}`}
          >
            Müşteriler
          </button>
          <button 
            onClick={() => setFilterType('supplier')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${filterType === 'supplier' ? 'bg-orange-600/20 text-orange-400' : 'text-gray-400 hover:text-white'}`}
          >
            Tedarikçiler
          </button>
        </div>
      </div>

      {/* TABLO */}
      <div className="bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-900/50 border-b border-gray-800 text-gray-400 text-xs uppercase tracking-wider">
                <th className="p-4">Cari Adı / Tip</th>
                <th className="p-4">İletişim</th>
                <th className="p-4 text-right">Bakiye</th>
                <th className="p-4 text-center">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">Yükleniyor...</td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">Kayıt bulunamadı.</td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="group hover:bg-gray-800/30 transition">
                    <td className="p-4">
                      {/* BURASI ARTIK TIKLANABİLİR BİR LİNK */}
                      <Link href={`/muhasebe/cariler/${contact.id}`} className="flex items-center gap-3 hover:opacity-80 transition">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg shadow-lg ${contact.type === 'customer' ? 'bg-blue-500/10 text-blue-500' : 'bg-orange-500/10 text-orange-500'}`}>
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-2">
                            {contact.name}
                            <ArrowRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-500"/>
                          </p>
                          <span className={`text-[10px] px-2 py-0.5 rounded border ${contact.type === 'customer' ? 'border-blue-900 text-blue-400 bg-blue-900/20' : 'border-orange-900 text-orange-400 bg-orange-900/20'}`}>
                            {contact.type === 'customer' ? 'Müşteri' : 'Tedarikçi'}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Phone size={14} /> {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-400">
                            <Mail size={14} /> {contact.email}
                          </div>
                        )}
                        {!contact.phone && !contact.email && <span className="text-gray-600 text-xs">-</span>}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <p className={`font-bold text-lg ${
                        (contact.balance || 0) > 0 
                          ? (contact.type === 'customer' ? 'text-green-400' : 'text-red-400') 
                          : 'text-gray-400'
                      }`}>
                        ₺{Math.abs(contact.balance || 0).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(contact.balance || 0) > 0 
                          ? (contact.type === 'customer' ? 'Alacağımız Var' : 'Borcumuz Var') 
                          : 'Bakiye Yok'}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <Link href={`/muhasebe/cariler/${contact.id}`} className="p-2 hover:bg-gray-700 rounded-lg inline-block transition text-gray-400 hover:text-white" title="Hesap Hareketleri">
                        <MoreHorizontal size={20} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- YENİ CARİ EKLEME MODALI --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-gray-700 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setIsModalOpen(false)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={24}/>
            </button>

            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Plus className="text-blue-500" /> Yeni Cari Kartı
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Cari Tipi</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => setNewContact({...newContact, type: 'customer'})}
                    className={`py-3 rounded-xl border font-bold text-sm transition ${newContact.type === 'customer' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >
                    Müşteri
                  </button>
                  <button 
                    onClick={() => setNewContact({...newContact, type: 'supplier'})}
                    className={`py-3 rounded-xl border font-bold text-sm transition ${newContact.type === 'supplier' ? 'bg-orange-600 border-orange-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-400'}`}
                  >
                    Tedarikçi
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Ad Soyad / Firma Ünvanı</label>
                <input 
                  type="text" 
                  className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                  placeholder="Örn: Ahmet Yılmaz veya ABC Ltd. Şti."
                  value={newContact.name}
                  onChange={(e) => setNewContact({...newContact, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Telefon</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                    placeholder="0555..."
                    value={newContact.phone}
                    onChange={(e) => setNewContact({...newContact, phone: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">E-Posta</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-blue-500"
                    placeholder="isim@mail.com"
                    value={newContact.email}
                    onChange={(e) => setNewContact({...newContact, email: e.target.value})}
                  />
                </div>
              </div>

               <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Adres</label>
                <textarea 
                  className="w-full bg-[#0f1623] border border-gray-700 rounded-xl p-3 text-white outline-none focus:border-blue-500 text-sm h-20 resize-none"
                  placeholder="Açık adres..."
                  value={newContact.address}
                  onChange={(e) => setNewContact({...newContact, address: e.target.value})}
                />
              </div>
              
              <button 
                onClick={handleCreateContact}
                disabled={modalLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl mt-2 flex items-center justify-center gap-2"
              >
                {modalLoading ? <Loader2 className="animate-spin" /> : <CheckCircle />}
                KAYDET
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}