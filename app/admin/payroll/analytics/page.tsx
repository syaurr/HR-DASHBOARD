"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
    Cell, Legend
} from "recharts";
import { 
    Users, Banknote, MapPin, Calendar, 
    TrendingUp, Loader2
} from "lucide-react";
import { toast } from "sonner";

export default function PayrollAnalyticsPage() {
    const today = new Date();
    // State Filter
    const [selectedMonth, setSelectedMonth] = useState<string>(String(today.getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<string>(String(today.getFullYear()));
    const [selectedOutletId, setSelectedOutletId] = useState<string>("all");
    
    const [outlets, setOutlets] = useState<any[]>([]);
    const [allPayrolls, setAllPayrolls] = useState<any[]>([]);
    const [filteredStats, setFilteredStats] = useState({
        totalNet: 0,
        crewCount: 0,
        avgPerCrew: 0
    });
    const [chartData, setChartData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const months = [
        { val: "1", name: "Januari" }, { val: "2", name: "Februari" },
        { val: "3", name: "Maret" }, { val: "4", name: "April" },
        { val: "5", name: "Mei" }, { val: "6", name: "Juni" },
        { val: "7", name: "Juli" }, { val: "8", name: "Agustus" },
        { val: "9", name: "September" }, { val: "10", name: "Oktober" },
        { val: "11", name: "November" }, { val: "12", name: "Desember" }
    ];

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: oData } = await supabase.from("outlets").select("id, name");
            if (oData) setOutlets(oData);
        };
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchPayrollData();
    }, [selectedMonth, selectedYear]);

    useEffect(() => {
        applyFilter();
    }, [selectedOutletId, allPayrolls]);

    const fetchPayrollData = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("payrolls")
                .select("*, outlets(name, id)")
                .eq("period_month", Number(selectedMonth))
                .eq("period_year", Number(selectedYear));

            if (error) throw error;
            setAllPayrolls(data || []);
        } catch (err: any) {
            toast.error("Gagal ambil data payroll");
        } finally {
            setLoading(false);
        }
    };

    const applyFilter = () => {
        let filtered = allPayrolls;
        if (selectedOutletId !== "all") {
            filtered = allPayrolls.filter(p => p.outlet_id === selectedOutletId);
        }

        const totalNet = filtered.reduce((acc, curr) => acc + Number(curr.net_salary || 0), 0);
        const crewCount = filtered.length;

        setFilteredStats({
            totalNet,
            crewCount,
            avgPerCrew: crewCount > 0 ? totalNet / crewCount : 0
        });

        // Data untuk Chart: Komposisi Komponen Gaji
        const comp = [
            { 
                name: "Gaji Pokok", 
                value: filtered.reduce((acc, curr) => acc + Number(curr.base_salary || 0), 0) 
            },
            { 
                name: "Komisi/Bonus", 
                value: filtered.reduce((acc, curr) => acc + Number((curr.commission_amount || 0) + (curr.bonus || 0)), 0) 
            },
            { 
                name: "Uang Makan/Lainnya", 
                value: filtered.reduce((acc, curr) => acc + Number((curr.meal_allowance || 0) + (curr.allowance_other || 0)), 0) 
            },
            { 
                name: "Potongan", 
                value: filtered.reduce((acc, curr) => acc + Number(curr.total_deduction || 0), 0) * -1 // Dijadikan negatif untuk visualisasi jika perlu
            },
        ];
        setChartData(comp.filter(c => c.name !== "Potongan")); // Tampilkan yang pendapatan saja di chart utama
    };

    const formatIDR = (val: number) => 
        new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(val);

    return (
        <div className="space-y-6 font-poppins">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-extrabold tracking-tight text-[#022020]">Analitik Biaya Gaji</h1>
                    <p className="text-muted-foreground text-sm">Pemantauan pengeluaran gaji periode {months.find(m => m.val === selectedMonth)?.name} {selectedYear}.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 font-inter">
                    {/* Filter Bulan */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm">
                        <Calendar className="w-4 h-4 text-[#033f3f]" />
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                            <SelectTrigger className="w-[130px] border-none shadow-none focus:ring-0 h-7 text-xs font-bold uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {months.map(m => <SelectItem key={m.val} value={m.val}>{m.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger className="w-[80px] border-none shadow-none focus:ring-0 h-7 text-xs font-bold uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2025">2025</SelectItem>
                                <SelectItem value="2026">2026</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter Outlet */}
                    <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border shadow-sm">
                        <MapPin className="w-4 h-4 text-[#033f3f]" />
                        <Select value={selectedOutletId} onValueChange={setSelectedOutletId}>
                            <SelectTrigger className="w-[140px] border-none shadow-none focus:ring-0 h-7 text-xs font-bold uppercase">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Semua Outlet</SelectItem>
                                {outlets.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-dashed">
                    <Loader2 className="w-8 h-8 animate-spin text-[#033f3f]" />
                </div>
            ) : (
                <>
                    {/* BIG NUMBERS */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-inter">
                        <Card className="border-none shadow-lg bg-[#033f3f] text-white rounded-2xl overflow-hidden">
                            <CardContent className="p-6 relative">
                                <Banknote className="absolute right-4 bottom-4 w-12 h-12 opacity-10" />
                                <div className="flex justify-between items-start opacity-80">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Total Pengeluaran Gaji</p>
                                    <Banknote className="w-4 h-4" />
                                </div>
                                <h2 className="text-3xl font-black mt-2">{formatIDR(filteredStats.totalNet)}</h2>
                                <p className="text-[10px] mt-2 opacity-70 italic">Total bersih yang ditransfer ke kru</p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md bg-white rounded-2xl">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start text-slate-400">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Kru Dibayarkan</p>
                                    <Users className="w-4 h-4" />
                                </div>
                                <h2 className="text-3xl font-black mt-2 text-slate-800">{filteredStats.crewCount} <span className="text-sm font-medium text-slate-400">Orang</span></h2>
                                <p className="text-[10px] mt-2 text-slate-400 italic">Data payroll periode ini</p>
                            </CardContent>
                        </Card>

                        <Card className="border-none shadow-md bg-white rounded-2xl">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start text-slate-400">
                                    <p className="text-[10px] font-black uppercase tracking-widest">Rata-rata Gaji</p>
                                    <TrendingUp className="w-4 h-4" />
                                </div>
                                <h2 className="text-3xl font-black mt-2 text-slate-800">{formatIDR(filteredStats.avgPerCrew)}</h2>
                                <p className="text-[10px] mt-2 text-slate-400 italic">Rata-rata pengeluaran per orang</p>
                            </CardContent>
                        </Card>
                    </div>

                    {/* CHART DATA */}
                    <Card className="border-none shadow-md bg-white rounded-2xl overflow-hidden font-inter">
                        <CardHeader className="bg-slate-50 border-b">
                            <CardTitle className="text-sm font-bold text-slate-600 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" /> 
                                Komposisi Biaya {selectedOutletId === 'all' ? 'Seluruh Outlet' : outlets.find(o => o.id === selectedOutletId)?.name}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="h-[350px] pt-10">
                            {allPayrolls.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 40, right: 60 }}>
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} fontSize={11} width={130} fontWeight={600} />
                                        <Tooltip 
                                            cursor={{fill: '#f8fafc'}}
                                            formatter={(v: any) => formatIDR(v)}
                                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                        />
                                        <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={45}>
                                            {chartData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={index === 0 ? "#033f3f" : index === 1 ? "#10b981" : "#f59e0b"} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 italic">
                                    <Banknote className="w-12 h-12 opacity-20" />
                                    <p>Data payroll tidak ditemukan untuk periode ini</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    );
}