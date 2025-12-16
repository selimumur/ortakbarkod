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
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Building,
  User
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// Server Actions
import { getAccountingCustomersAction, upsertAccountingCustomerAction, type AccountingCustomer } from '@/app/actions/customerActions';
import { getSuppliersAction, upsertSupplierAction, type Supplier } from '@/app/actions/supplierActions';

// TİP TANIMLAMALARI
type ContactType = 'customer' | 'supplier';

interface Contact {
  id: string; // c-123 or s-456
  original_id: number;
  type: ContactType;
  name: string;
  phone: string;
  email: string;
  balance: number;
}

export default function CurrentAccountsPage() {
  const [loading, setLoading] = useState(true);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'customer' | 'supplier'>('all');

  // MODAL STATE
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newContact, setNewContact] = useState({
    type: 'customer' as ContactType,
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
      // Paralel fetch
      const [customers, suppliers] = await Promise.all([
        getAccountingCustomersAction(),
        getSuppliersAction()
      ]);

      // Verileri normalize et ve birleştir
      const formattedCustomers = (customers || []).map((c: AccountingCustomer) => ({
        id: `c-${c.id}`,
        original_id: c.id,
        type: 'customer' as ContactType,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        balance: c.balance
      }));

      const formattedSuppliers = (suppliers || []).map((s: Supplier) => ({
        id: `s-${s.id}`,
        original_id: s.id,
        type: 'supplier' as ContactType,
        name: s.name,
        phone: s.phone || "",
        email: s.email || "",
        balance: s.balance
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
      if (newContact.type === 'customer') {
        await upsertAccountingCustomerAction({
          name: newContact.name,
          phone: newContact.phone,
          email: newContact.email,
          address: newContact.address,
          balance: 0
        });
      } else {
        await upsertSupplierAction({
          name: newContact.name,
          phone: newContact.phone,
          email: newContact.email,
          balance: 0
          // address field not explicit in supplier logic yet, but supplier has core fields
        });
      }

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
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto min-h-screen space-y-8 animate-in fade-in duration-500">

      {/* ÜST BAŞLIK VE ÖZET */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-2 flex items-center gap-3">
            Cari Hesap Yönetimi
          </h1>
          <p className="text-gray-400">Müşteri ve tedarikçi bakiyelerini tek yerden takip edin.</p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Alacak Kartı */}
          <div className="bg-[#0F172A] border border-green-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-green-900/10 min-w-[240px]">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Alacak</p>
              <p className="text-2xl font-black text-white">₺{totalReceivables.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          {/* Borç Kartı */}
          <div className="bg-[#0F172A] border border-red-500/20 px-6 py-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-red-900/10 min-w-[240px]">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
              <TrendingDown size={24} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Toplam Borç</p>
              <p className="text-2xl font-black text-white">₺{totalPayables.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-lg shadow-blue-900/20 md:w-auto w-full"
          >
            <Plus size={20} /> Yeni Cari Ekle
          </button>
        </div>
      </div>

      {/* FİLTRE VE ARAMA ÇUBUĞU */}
      <div className="flex flex-col md:flex-row gap-4 items-center bg-[#0F172A] p-2 rounded-2xl border border-white/5">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={20} />
          <input
            type="text"
            placeholder="Cari adı, telefon veya e-posta ara..."
            className="w-full bg-[#020617] border border-white/10 text-white pl-12 pr-4 py-3 rounded-xl outline-none focus:border-blue-500 transition placeholder:text-gray-600"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex w-full md:w-auto bg-[#020617] p-1.5 rounded-xl border border-white/5">
          <button
            onClick={() => setFilterType('all')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${filterType === 'all' ? 'bg-gray-700 text-white shadow' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
          >
            <Users size={14} /> Tümü
          </button>
          <button
            onClick={() => setFilterType('customer')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${filterType === 'customer' ? 'bg-blue-500/20 text-blue-400 shadow' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
          >
            <User size={14} /> Müşteriler
          </button>
          <button
            onClick={() => setFilterType('supplier')}
            className={`flex-1 md:flex-none px-6 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${filterType === 'supplier' ? 'bg-orange-500/20 text-orange-400 shadow' : 'text-gray-500 hover:text-white hover:bg-gray-800'}`}
          >
            <Building size={14} /> Tedarikçiler
          </button>
        </div>
      </div>

      {/* TABLO */}
      <div className="bg-[#0F172A] border border-white/5 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-black/20 text-gray-400 text-xs font-bold uppercase tracking-wider border-b border-white/5">
                <th className="p-6">Cari Bilgileri</th>
                <th className="p-6">İletişim</th>
                <th className="p-6 text-right">Güncel Bakiye</th>
                <th className="p-6 text-center">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500">
                    <Loader2 className="animate-spin mx-auto mb-2" />
                    Veriler yükleniyor...
                  </td>
                </tr>
              ) : filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-4 opacity-20" />
                    Aradığınız kriterlere uygun kayıt bulunamadı.
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr key={contact.id} className="group hover:bg-blue-500/5 transition duration-200">
                    <td className="p-6">
                      <Link href={`/muhasebe/cariler/${contact.id}`} className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl shadow-lg transition-transform group-hover:scale-110 ${contact.type === 'customer' ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white' : 'bg-gradient-to-br from-orange-500 to-amber-600 text-white'}`}>
                          {contact.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-white text-lg flex items-center gap-2">
                            {contact.name}
                            <ArrowRight size={16} className="text-blue-500 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                          </p>
                          <span className={`inline-flex items-center gap-1 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full mt-1 ${contact.type === 'customer' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                            {contact.type === 'customer' ? <User size={10} /> : <Building size={10} />}
                            {contact.type === 'customer' ? 'Müşteri' : 'Tedarikçi'}
                          </span>
                        </div>
                      </Link>
                    </td>
                    <td className="p-6">
                      <div className="space-y-2">
                        {contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-400 group-hover:text-gray-300 transition">
                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center"><Phone size={12} /></div>
                            {contact.phone}
                          </div>
                        )}
                        {contact.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-400 group-hover:text-gray-300 transition">
                            <div className="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center"><Mail size={12} /></div>
                            {contact.email}
                          </div>
                        )}
                        {!contact.phone && !contact.email && <span className="text-gray-600 text-xs italic">İletişim bilgisi yok</span>}
                      </div>
                    </td>
                    <td className="p-6 text-right">
                      <p className={`font-black text-xl tracking-tight ${(contact.balance || 0) > 0
                        ? (contact.type === 'customer' ? 'text-green-400' : 'text-red-400')
                        : 'text-gray-500'
                        }`}>
                        ₺{Math.abs(contact.balance || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-xs font-bold text-gray-600 uppercase tracking-wider mt-1">
                        {(contact.balance || 0) > 0
                          ? (contact.type === 'customer' ? 'Alacak' : 'Borç')
                          : 'Bakiye Yok'}
                      </p>
                    </td>
                    <td className="p-6 text-center">
                      <Link href={`/muhasebe/cariler/${contact.id}`} className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-blue-600 hover:text-white transition text-gray-400 group-hover:text-white mx-auto shadow-sm" title="Hesap Hareketleri">
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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-white/10 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition bg-white/5 p-2 rounded-full hover:bg-red-500/20 hover:text-red-500"
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-black mb-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
              Yeni Cari Kartı
            </h2>
            <p className="text-gray-400 text-sm mb-8">Müşteri veya tedarikçi bilgileri ile yeni hesap oluşturun.</p>

            <div className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cari Tipi</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setNewContact({ ...newContact, type: 'customer' })}
                    className={`py-4 rounded-xl border-2 font-bold text-sm transition flex flex-col items-center gap-2 ${newContact.type === 'customer' ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/20' : 'bg-[#020617] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
                  >
                    <User size={20} />
                    Müşteri
                  </button>
                  <button
                    onClick={() => setNewContact({ ...newContact, type: 'supplier' })}
                    className={`py-4 rounded-xl border-2 font-bold text-sm transition flex flex-col items-center gap-2 ${newContact.type === 'supplier' ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-900/20' : 'bg-[#020617] border-white/5 text-gray-400 hover:border-white/20 hover:text-white'}`}
                  >
                    <Building size={20} />
                    Tedarikçi
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Ad Soyad / Firma Ünvanı</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                  <input
                    type="text"
                    className="w-full bg-[#020617] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 transition placeholder:text-gray-600 font-bold"
                    placeholder="Örn: Ahmet Yılmaz..."
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Telefon</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      className="w-full bg-[#020617] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 transition placeholder:text-gray-600"
                      placeholder="0555..."
                      value={newContact.phone}
                      onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">E-Posta</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    <input
                      type="text"
                      className="w-full bg-[#020617] border border-white/10 rounded-xl pl-12 pr-4 py-4 text-white outline-none focus:border-blue-500 transition placeholder:text-gray-600"
                      placeholder="mail@..."
                      value={newContact.email}
                      onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Açık Adres</label>
                <textarea
                  className="w-full bg-[#020617] border border-white/10 rounded-xl p-4 text-white outline-none focus:border-blue-500 text-sm h-24 resize-none placeholder:text-gray-600"
                  placeholder="Mahalle, Cadde, No..."
                  value={newContact.address}
                  onChange={(e) => setNewContact({ ...newContact, address: e.target.value })}
                />
              </div>

              <button
                onClick={handleCreateContact}
                disabled={modalLoading}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition flex items-center justify-center gap-2"
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