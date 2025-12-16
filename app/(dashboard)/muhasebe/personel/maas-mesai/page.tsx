"use client";

import { useState, useEffect } from 'react';
import { Calendar, Calculator, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { getPayrollCalculationDataAction, savePayrollRowAction } from '@/app/actions/personnelActions';

export default function PayrollPage() {
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [payrollData, setPayrollData] = useState<any[]>([]);

    useEffect(() => {
        fetchPayroll();
    }, [month, year]);

    async function fetchPayroll() {
        setLoading(true);
        try {
            const rawData = await getPayrollCalculationDataAction(month, year);

            // Apply client-side initial calculation if needed, though rawData should have necessary fields
            const calculated = rawData.map(calcRow);
            setPayrollData(calculated);

        } catch (error: any) {
            console.error(error);
            toast.error("Veriler yüklenirken hata oluştu: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    // Calculation Logic (Client Side for live feedback)
    const calcRow = (row: any) => {
        const hourlyRate = (row.base_salary || 0) / 225;
        const overtimePay = (Number(row.overtime_hours_weekday || 0) * hourlyRate * Number(row.overtime_rate || 1.5)) +
            (Number(row.overtime_hours_weekend || 0) * hourlyRate * Number(row.overtime_rate || 1.5) * 2); // Example multiplier

        const food = (row.daily_food || 0) * Number(row.worked_days || 0);
        const road = (row.daily_road || 0) * Number(row.worked_days || 0);

        const total = (row.base_salary || 0) + overtimePay + food + road + (Number(row.bonuses) || 0) - (Number(row.deductions) || 0) - (Number(row.advance_deduction) || 0);

        return {
            ...row,
            total_overtime_pay: parseFloat(overtimePay.toFixed(2)),
            total_food_pay: parseFloat(food.toFixed(2)),
            total_road_pay: parseFloat(road.toFixed(2)),
            net_payable: parseFloat(total.toFixed(2))
        };
    };

    const handleChange = (index: number, field: string, value: any) => {
        const newData = [...payrollData];
        newData[index] = { ...newData[index], [field]: parseFloat(value) || 0 };
        newData[index] = calcRow(newData[index]); // Re-calc
        setPayrollData(newData);
    };

    const handleSaveRow = async (row: any) => {
        try {
            await savePayrollRowAction(row);
            toast.success("Kayıt güncellendi.");
            // Optionally re-fetch to confirm sync, or just rely on local state if trusted.
            // fetchPayroll(); 
        } catch (e: any) {
            toast.error("Hata: " + e.message);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1120] text-gray-200 p-6 md:p-8 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Calculator className="text-purple-500" size={32} />
                        Maaş & Mesai Yönetimi
                    </h1>
                    <p className="text-gray-400 mt-1">Personel hakedişlerini hesaplayın ve kaydedin.</p>
                </div>

                <div className="flex items-center gap-2 bg-[#1f2937] p-2 rounded-xl border border-gray-700">
                    <Calendar size={20} className="text-gray-400 ml-2" />
                    <select value={month} onChange={e => setMonth(Number(e.target.value))} className="bg-transparent text-white font-bold outline-none p-2 rounded hover:bg-gray-800">
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}. Ay</option>)}
                    </select>
                    <select value={year} onChange={e => setYear(Number(e.target.value))} className="bg-transparent text-white font-bold outline-none p-2 rounded hover:bg-gray-800">
                        <option value={2024}>2024</option>
                        <option value={2025}>2025</option>
                    </select>
                </div>
            </div>

            {loading ? <div className="text-center py-20 text-gray-500"><Loader2 className="animate-spin inline mr-2" />Hesaplanıyor...</div> : (
                <div className="bg-[#161f32] border border-gray-800 rounded-2xl overflow-hidden shadow-xl overflow-x-auto">
                    <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead className="bg-[#111827] text-gray-500 font-bold uppercase text-xs">
                            <tr>
                                <th className="p-4 sticky left-0 bg-[#111827] z-10">Personel</th>
                                <th className="p-4">Maaş (Net)</th>
                                <th className="p-4">Çalışılan Gün</th>
                                <th className="p-4 text-orange-400">Mesai (Saat)</th>
                                <th className="p-4 text-green-400">Yemek + Yol</th>
                                <th className="p-4 text-red-400">Kesinti / Avans</th>
                                <th className="p-4 text-blue-400 text-lg">NET ÖDENECEK</th>
                                <th className="p-4">İşlem</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {payrollData.length === 0 ? (
                                <tr><td colSpan={8} className="p-6 text-center text-gray-500">Kayıt bulunamadı.</td></tr>
                            ) : payrollData.map((row, i) => (
                                <tr key={row.personnel_id || i} className="hover:bg-gray-800/30">
                                    <td className="p-4 font-bold text-white sticky left-0 bg-[#161f32] z-10">
                                        {row.name}
                                        <span className="block text-xs text-gray-500 font-normal">{row.role}</span>
                                    </td>
                                    <td className="p-4 font-mono">{Number(row.base_salary).toLocaleString()}</td>
                                    <td className="p-4">
                                        <input type="number" className="w-16 bg-[#0B1120] border border-gray-700 rounded p-1 text-center text-white outline-none focus:border-blue-500 transition"
                                            value={row.worked_days} onChange={e => handleChange(i, 'worked_days', e.target.value)} />
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-1 items-center">
                                            <input type="number" placeholder="H.İ" className="w-14 bg-[#0B1120] border border-gray-700 rounded p-1 text-center text-white outline-none focus:border-blue-500 transition"
                                                value={row.overtime_hours_weekday} onChange={e => handleChange(i, 'overtime_hours_weekday', e.target.value)} title="Hafta İçi Saat" />
                                            <input type="number" placeholder="H.S" className="w-14 bg-[#0B1120] border border-gray-700 rounded p-1 text-center text-white outline-none focus:border-blue-500 transition"
                                                value={row.overtime_hours_weekend} onChange={e => handleChange(i, 'overtime_hours_weekend', e.target.value)} title="Hafta Sonu Saat" />
                                            <span className="text-xs text-orange-500 font-bold ml-1">+{Number(row.total_overtime_pay).toLocaleString()}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-xs">
                                        <div>Yemek: {Number(row.total_food_pay).toLocaleString()}</div>
                                        <div>Yol: {Number(row.total_road_pay).toLocaleString()}</div>
                                    </td>
                                    <td className="p-4">
                                        <input type="number" className="w-20 bg-[#0B1120] border border-red-900/50 rounded p-1 text-center text-red-200 placeholder-red-800 outline-none focus:border-red-500 transition"
                                            value={row.advance_deduction} onChange={e => handleChange(i, 'advance_deduction', e.target.value)} placeholder="0" />
                                    </td>
                                    <td className="p-4 font-bold text-lg text-blue-400 font-mono">
                                        {Number(row.net_payable).toLocaleString()} TL
                                    </td>
                                    <td className="p-4">
                                        <button onClick={() => handleSaveRow(row)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg transition shadow-lg shadow-blue-900/20">
                                            <Save size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
