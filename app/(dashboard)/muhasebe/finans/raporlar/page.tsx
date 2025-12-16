"use client";

import { useState, useEffect } from "react";
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
    Calendar, ArrowUpRight, ArrowDownRight, Wallet, TrendingUp, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { getFinanceReportDataAction } from "@/app/actions/financeActions";

// Renk Paleti (Premium Dark Theme)
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function FinanceReportsPage() {
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState("30"); // 7, 30, 90, ALL

    // Özelleştirilmiş Özet Veriler
    const [summary, setSummary] = useState({
        totalIncome: 0,
        totalExpense: 0,
        netFlow: 0,
        totalLoans: 0,
    });

    // Grafik Verileri
    const [cashFlowData, setCashFlowData] = useState<any[]>([]);
    const [categoryData, setCategoryData] = useState<any[]>([]);
    const [assetData, setAssetData] = useState<any[]>([]);

    useEffect(() => {
        fetchReportData();
    }, [dateRange]);

    async function fetchReportData() {
        setLoading(true);
        try {
            const data = await getFinanceReportDataAction(dateRange);

            // 4. Kredi Borçlarını Hesapla (Ödenmemiş Taksitler)
            // Note: `data.loanInstallments` comes from server
            const totalLoans = data.loanInstallments?.reduce((acc: number, curr: any) => acc + Number(curr.amount), 0) || 0;
            setSummary(prev => ({ ...prev, totalLoans }));

            // Process
            processTransactions(data.transactions || []);
            processAssets(data.banks || [], data.safes || []);

        } catch (error: any) {
            console.error("Rapor verisi çekilemedi:", error);
            toast.error("Raporlar yüklenirken hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    function processTransactions(data: any[]) {
        let income = 0;
        let expense = 0;

        // Kategori Bazlı Toplamlar
        const catMap: Record<string, number> = {};
        // Günlük Akış
        const dateMap: Record<string, { income: number, expense: number }> = {};

        data.forEach(tx => {
            const amount = Number(tx.amount);
            const dateStr = new Date(tx.date).toLocaleDateString("tr-TR", { day: 'numeric', month: 'short' });

            // Kategori
            const catName = tx.finance_categories?.name || "Diğer";

            if (tx.transaction_type === "INCOME") {
                income += amount;
                if (!dateMap[dateStr]) dateMap[dateStr] = { income: 0, expense: 0 };
                dateMap[dateStr].income += amount;
            } else if (tx.transaction_type === "EXPENSE") {
                expense += amount;
                if (!catMap[catName]) catMap[catName] = 0;
                catMap[catName] += amount;

                if (!dateMap[dateStr]) dateMap[dateStr] = { income: 0, expense: 0 };
                dateMap[dateStr].expense += amount;
            }
        });

        setSummary(prev => ({
            ...prev,
            totalIncome: income,
            totalExpense: expense,
            netFlow: income - expense
        }));

        // Grafik Formatları
        const cFlow = Object.keys(dateMap).map(d => ({
            name: d,
            income: dateMap[d].income,
            expense: dateMap[d].expense
        }));
        setCashFlowData(cFlow);

        const catChart = Object.keys(catMap).map(c => ({
            name: c,
            value: catMap[c]
        })).sort((a, b) => b.value - a.value).slice(0, 6); // Top 6 kategori
        setCategoryData(catChart);
    }

    function processAssets(banks: any[], safes: any[]) {
        const assets = [
            ...banks.map(b => ({ name: b.bank_name, value: Number(b.current_balance), type: 'Banka' })),
            ...safes.map(s => ({ name: s.name, value: Number(s.current_balance), type: 'Kasa' }))
        ].filter(a => a.value > 0);

        // Büyükten küçüğe sırala
        assets.sort((a, b) => b.value - a.value);
        setAssetData(assets);
    }

    if (loading) return (
        <div className="min-h-screen bg-[#0B1120] flex flex-col items-center justify-center text-white">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={48} />
            <p className="animate-pulse">Raporlar hazırlanıyor...</p>
        </div>
    );

    return (
        <div className="p-6 md:p-8 space-y-8 min-h-screen bg-[#0B1120] text-white font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Finansal Raporlar
                    </h1>
                    <p className="text-gray-400 mt-2 text-lg">
                        Gelir, gider ve nakit akış analizi
                    </p>
                </div>

                <div className="flex items-center gap-2 bg-[#1a1d24] p-1 rounded-lg border border-gray-800">
                    {["7", "30", "90", "ALL"].map((range) => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${dateRange === range
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                                : "text-gray-400 hover:text-white hover:bg-gray-800"
                                }`}
                        >
                            {range === "ALL" ? "Tümü" : `Son ${range} Gün`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Özet Kartlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                <SummaryCard
                    title="Toplam Gelir"
                    value={summary.totalIncome}
                    icon={ArrowUpRight}
                    color="text-emerald-400"
                />
                <SummaryCard
                    title="Toplam Gider"
                    value={summary.totalExpense}
                    icon={ArrowDownRight}
                    color="text-red-400"
                />
                <SummaryCard
                    title="Net Nakit Akışı"
                    value={summary.netFlow}
                    icon={Wallet}
                    color={summary.netFlow >= 0 ? "text-blue-400" : "text-red-400"}
                />
                <SummaryCard
                    title="Ödenecek Krediler"
                    value={summary.totalLoans}
                    icon={Calendar}
                    color="text-orange-400"
                />
            </div>

            {/* Grafikler Alanı */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Nakit Akış Grafiği */}
                <div className="bg-[#111827] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-blue-500" />
                        Nakit Akışı (Gelir vs Gider)
                    </h3>
                    <div className="h-[350px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={cashFlowData}>
                                <defs>
                                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                                <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                                <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" name="Gelir" />
                                <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" name="Gider" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Gider Dağılımı */}
                <div className="bg-[#111827] p-8 rounded-3xl border border-gray-800 shadow-2xl">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                        <PieChart className="w-6 h-6 text-purple-500" />
                        Gider Dağılımı (Kategori Bazlı)
                    </h3>
                    <div className="h-[350px] w-full flex items-center justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={categoryData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={100}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {categoryData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Varlık Dağılımı */}
                <div className="bg-[#111827] p-8 rounded-3xl border border-gray-800 shadow-2xl lg:col-span-2">
                    <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                        <Wallet className="w-6 h-6 text-amber-500" />
                        Varlık Dağılımı (Banka & Kasa)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={assetData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                                <XAxis type="number" stroke="#9ca3af" hide />
                                <YAxis dataKey="name" type="category" width={150} stroke="#9ca3af" />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#fff' }}
                                />
                                <Bar dataKey="value" name="Bakiye" radius={[0, 4, 4, 0]}>
                                    {assetData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}

function SummaryCard({ title, value, icon: Icon, color }: any) {
    return (
        <div className="bg-[#111827] p-6 rounded-3xl border border-gray-800 shadow-xl hover:border-gray-700 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className={`p-4 rounded-2xl bg-opacity-10 ${color.replace('text-', 'bg-')} group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-6 h-6 ${color}`} />
                </div>
            </div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <h3 className="text-2xl font-bold mt-1">
                {new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY" }).format(value)}
            </h3>
        </div>
    );
}
