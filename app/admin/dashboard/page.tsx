'use client';

import { useEffect, useState } from "react";
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  ArrowRight,
  Download,
  Activity, 
  Calendar,
  Bell,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Poppins } from "next/font/google";

// Konfigurasi Font Poppins
const poppins = Poppins({ 
    subsets: ["latin"], 
    weight: ["400", "500", "600", "700", "800", "900"],
    display: 'swap',
});

export default function DashboardPage() {
  const [stats, setStats] = useState({ totalCrew: 0, highRisk: 0, avgTurnover: 0 });
  const [outletRisks, setOutletRisks] = useState<any[]>([]);
  const [highRiskList, setHighRiskList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // DATA DUMMY CHART (Agar grafik tidak kosong)
  const chartMockData = [
    { month: 'Jul', attendance: 75, resign: 12 },
    { month: 'Agu', attendance: 80, resign: 8 },
    { month: 'Sep', attendance: 72, resign: 15 },
    { month: 'Okt', attendance: 85, resign: 5 },
    { month: 'Nov', attendance: 68, resign: 18 },
    { month: 'Des', attendance: 70, resign: 10 },
  ];

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: crewData } = await supabase.from('crew').select('id, outlet_id, is_active');
      const { data: predData } = await supabase
        .from('churn_predictions')
        .select('*, crew:crew_id(full_name, role, outlet_id, outlets(name))')
        .order('risk_score', { ascending: false });

      if (crewData) {
        const total = crewData.filter(c => c.is_active).length;
        // Hitung High Risk dari data prediksi (jika ada)
        const high = predData ? predData.filter((p: any) => p.risk_score > 75).length : 0;
        
        setStats({ totalCrew: total, highRisk: high, avgTurnover: 5.2 }); 

        if (predData && predData.length > 0) {
            // Logic Heatmap Real
            const riskByOutlet: any = {};
            predData.forEach((p: any) => {
              const outletName = p.crew?.outlets?.name || 'Unknown';
              if (!riskByOutlet[outletName]) riskByOutlet[outletName] = { totalScore: 0, count: 0 };
              riskByOutlet[outletName].totalScore += p.risk_score;
              riskByOutlet[outletName].count += 1;
            });

            const heatmapArray = Object.keys(riskByOutlet).map(key => ({
              name: key,
              avgRisk: Math.round(riskByOutlet[key].totalScore / riskByOutlet[key].count),
              count: riskByOutlet[key].count
            }));
            
            heatmapArray.sort((a, b) => b.avgRisk - a.avgRisk);
            setOutletRisks(heatmapArray.slice(0, 3)); 
            setHighRiskList(predData.slice(0, 5)); 
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const runPrediction = async () => {
    toast.info("Menjalankan Algoritma AI (Logistic Regression)...");
    try {
        const res = await fetch('/api/analytics/predict', { method: 'POST' });
        const result = await res.json();
        
        if(res.ok) {
            toast.success(`Analisis Selesai! ${result.count} data karyawan diproses.`);
            loadData(); // Refresh tampilan
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast.error("Gagal menjalankan prediksi.", { description: error.message });
    }
  };

  useEffect(() => { loadData(); }, []);

  const getOutletStyle = (score: number) => {
    if (score > 75) return { 
        label: "CRITICAL", color: "text-[#d6302a]", bg: "bg-[#d6302a]", 
        border: "border-[#d6302a]", badge: "bg-[#d6302a]" 
    };
    if (score > 40) return { 
        label: "WARNING", color: "text-[#cd5b19]", bg: "bg-[#cd5b19]", 
        border: "border-[#cd5b19]", badge: "bg-[#cd5b19]" 
    };
    return { 
        label: "SAFE", color: "text-[#033f3f]", bg: "bg-[#033f3f]", 
        border: "border-[#033f3f]", badge: "bg-[#033f3f]" 
    };
  };

  return (
    <div className={`min-h-screen bg-[#f4e3be] text-[#022020] pb-10 ${poppins.className}`}>
        
        {/* --- HEADER FIXED --- */}
        <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-8 py-4 transition-all duration-300">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between bg-white/25 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-3 shadow-sm">
                <div className="flex items-center gap-3 text-[#033f3f]">
                    <div className="size-10 bg-[#033f3f] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#033f3f]/20">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#022020]">Balista HRIS</h1>
                </div>
                
                <div className="flex items-center gap-4">
                    <button className="hidden md:flex items-center gap-2 bg-white/50 border border-white/30 px-4 py-2 rounded-xl text-sm font-medium text-[#022020] hover:bg-white transition-colors">
                        <Calendar className="w-4 h-4 text-[#033f3f]" />
                        <span>Periode: Jan 2026</span>
                    </button>
                    <div className="flex gap-2">
                        <button className="flex items-center justify-center rounded-xl size-10 bg-white/50 text-[#022020] hover:bg-white transition-colors relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 size-2 bg-[#d6302a] rounded-full border border-white"></span>
                        </button>
                    </div>
                    <div className="size-10 rounded-full bg-white/50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                        <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Admin" className="w-full h-full object-cover" />
                    </div>
                </div>
            </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        {/* Padding-top (pt-32) ditambahkan agar konten tidak tertutup Header */}
        <main className="w-full max-w-[1440px] mx-auto p-6 md:p-8 pt-32 flex flex-col gap-8">
            
            {/* Title & Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-[#033f3f] tracking-tight mb-2">Dashboard Analisa Turnover</h2>
                    <p className="text-[#022020]/70 font-medium text-lg">Pantau retensi kru, prediksi risiko, dan stabilitas outlet secara real-time.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-white text-[#033f3f] px-5 py-3 rounded-xl text-sm font-bold shadow-sm border border-white/50 hover:bg-[#fdfbf7] transition-colors">
                        <Download className="w-5 h-5" />
                        Export Report
                    </button>
                    <button 
                        onClick={runPrediction}
                        className="flex items-center gap-2 bg-[#033f3f] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#033f3f]/20 hover:bg-[#022f2f] hover:scale-105 transition-all"
                    >
                        <Activity className="w-5 h-5" />
                        Run AI Prediction
                    </button>
                </div>
            </div>

            {/* METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Metric Cards Code (Sama seperti sebelumnya) */}
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <p className="text-[#022020]/50 text-sm font-bold uppercase tracking-wider">Total Kru Aktif</p>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{stats.totalCrew}</h3>
                        </div>
                        <div className="p-3 bg-[#033f3f]/10 rounded-2xl text-[#033f3f]">
                            <Users className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <span className="bg-[#078832]/10 text-[#078832] text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" /> +1.2%
                        </span>
                        <span className="text-[#022020]/50 text-sm font-medium">vs bulan lalu</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <p className="text-[#022020]/50 text-sm font-bold uppercase tracking-wider">Turnover Rate</p>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{stats.avgTurnover}%</h3>
                        </div>
                        <div className="p-3 bg-[#cd5b19]/10 rounded-2xl text-[#cd5b19]">
                            <TrendingDown className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto">
                        <span className="bg-[#078832]/10 text-[#078832] text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            <TrendingDown className="w-3 h-3" /> -0.8%
                        </span>
                        <span className="text-[#022020]/50 text-sm font-medium">Trend membaik</span>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-[#d6302a]/30 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#d6302a]/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <p className="text-[#d6302a] text-sm font-bold uppercase tracking-wider">High Risk Crew</p>
                                <span className="relative flex h-3 w-3">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d6302a] opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#d6302a]"></span>
                                </span>
                            </div>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{stats.highRisk}</h3>
                        </div>
                        <div className="p-3 bg-[#d6302a]/10 rounded-2xl text-[#d6302a]">
                            <AlertTriangle className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-auto relative z-10">
                        <span className="bg-[#d6302a]/10 text-[#d6302a] text-xs font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                            {stats.highRisk > 0 ? `+${stats.highRisk} orang` : 'Aman'}
                        </span>
                        <span className="text-[#022020]/50 text-sm font-medium">Perlu atensi segera</span>
                    </div>
                </div>
            </div>

            {/* HEATMAP */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#022020] flex items-center gap-3">
                        <div className="bg-[#033f3f] p-2 rounded-xl text-white shadow-md shadow-[#033f3f]/20"><TrendingUp className="w-6 h-6" /></div>
                        Retention Heatmap: Status Outlet
                    </h2>
                    <a className="text-sm font-bold text-[#033f3f] hover:underline flex items-center gap-1 cursor-pointer bg-white/50 px-4 py-2 rounded-lg border border-white/50 hover:bg-white transition-colors">
                        Lihat Semua Outlet <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {outletRisks.length === 0 && <div className="col-span-3 text-center py-10 text-gray-400 italic bg-white/50 rounded-xl border border-dashed border-gray-300">Belum ada data prediksi. Silakan klik tombol "Run AI Prediction" di pojok kanan atas.</div>}

                    {outletRisks.map((outlet, idx) => {
                        const style = getOutletStyle(outlet.avgRisk);
                        const bgImage = [
                           "https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=600&auto=format&fit=crop", 
                           "https://images.unsplash.com/photo-1555899434-94d1368b7adb?q=80&w=600&auto=format&fit=crop", 
                           "https://images.unsplash.com/photo-1518684079-3c830dcef090?q=80&w=600&auto=format&fit=crop"  
                        ][idx % 3];

                        return (
                            <div key={idx} className={`group bg-white rounded-[1.5rem] overflow-hidden border-2 ${style.border} shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-[320px]`}>
                                <div className="h-40 bg-gray-200 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                                    <div className="absolute bottom-4 left-5 z-20">
                                        <span className={`inline-block px-3 py-1 ${style.badge} text-white text-[10px] font-bold tracking-wider rounded-md uppercase mb-2 shadow-lg`}>
                                            {style.label}
                                        </span>
                                        <h3 className="text-white text-xl font-bold leading-tight">{outlet.name}</h3>
                                    </div>
                                    <div className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700" style={{backgroundImage: `url('${bgImage}')`}}></div>
                                </div>
                                <div className="p-6 flex flex-col gap-4 flex-1">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-[#022020]/50 font-bold uppercase tracking-wider">Risk Score</p>
                                            <p className={`text-4xl font-black ${style.color}`}>{outlet.avgRisk}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs text-[#022020]/50 font-bold uppercase tracking-wider">Jumlah Kru</p>
                                            <p className="text-xl font-bold text-[#022020]">{outlet.count} Orang</p>
                                        </div>
                                    </div>
                                    <hr className="border-[#022020]/10"/>
                                    <button className={`mt-auto w-full py-3 bg-opacity-10 ${style.bg.replace('bg-', 'bg-opacity-10 ')} ${style.color} hover:${style.bg} hover:text-white font-bold text-sm rounded-xl transition-colors`}>
                                        Investigasi
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </section>

            {/* CHART & TABLE */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                {/* Chart Section */}
                <div className="bg-white rounded-[1.5rem] p-8 shadow-sm border border-white/50 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-bold text-[#022020]">Kehadiran vs Resign</h3>
                            <p className="text-sm text-[#022020]/50 font-medium">Analisa tren 6 bulan terakhir</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full bg-[#033f3f]"></span>
                                <span className="text-xs font-bold text-[#022020]">Kehadiran</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="size-3 rounded-full bg-[#ce6e6a]"></span>
                                <span className="text-xs font-bold text-[#022020]">Resign</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Visual Chart Bars (STATIC MOCK DATA) */}
                    <div className="flex-1 min-h-[300px] relative flex items-end justify-between gap-4 px-2 pb-6 border-b border-l border-[#022020]/10">
                        {[0, 25, 50, 75, 100].map((line) => (
                             <div key={line} className="absolute inset-0 bottom-6 border-t border-dashed border-[#022020]/5 pointer-events-none" style={{top: `${100-line}%`}}></div>
                        ))}
                        
                        {chartMockData.map((item, idx) => (
                             <div key={idx} className="flex flex-col items-center gap-2 w-full group relative z-10">
                                <div 
                                    className="w-4 md:w-6 bg-[#033f3f] rounded-t-md hover:opacity-80 transition-all group-hover:scale-y-105 origin-bottom" 
                                    style={{height: `${item.attendance}%`}}
                                ></div>
                                <div 
                                    className="w-4 md:w-6 bg-[#ce6e6a] rounded-t-md hover:opacity-80 transition-all group-hover:scale-y-105 origin-bottom" 
                                    style={{height: `${item.resign}%`}}
                                ></div>
                                <span className="text-xs font-bold text-[#022020]/50 mt-2">{item.month}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Table Section */}
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col overflow-hidden">
                    <div className="p-8 border-b border-[#022020]/5 flex justify-between items-center bg-gray-50/50">
                        <div>
                            <h3 className="text-xl font-bold text-[#022020] flex items-center gap-3">
                                Early Warning System
                                <span className="bg-[#d6302a]/10 text-[#d6302a] text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider">Action Needed</span>
                            </h3>
                            <p className="text-sm text-[#022020]/50 font-medium">Top 5 Karyawan Risiko Tinggi</p>
                        </div>
                        <button className="text-[#033f3f] hover:underline text-sm font-bold">Lihat Semua</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#fafafa] border-b border-[#022020]/5">
                                    <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider">Nama Kru</th>
                                    <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider">Faktor Risiko</th>
                                    <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider text-right">Prob. Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#022020]/5">
                                {highRiskList.length === 0 && (
                                    <tr><td colSpan={3} className="text-center py-10 text-gray-400 italic">Data aman.</td></tr>
                                )}
                                {highRiskList.map((item, i) => (
                                    <tr key={i} className="hover:bg-[#fdfbf7] transition-colors group">
                                        <td className="py-4 px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600 border-2 border-white shadow-sm">
                                                    {item.crew?.full_name?.substring(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[#022020] leading-tight group-hover:text-[#033f3f] transition-colors">{item.crew?.full_name}</p>
                                                    <p className="text-xs text-[#022020]/50 font-medium mt-0.5">{item.crew?.outlets?.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-8">
                                            {item.factors && item.factors[0] ? (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#d6302a]/10 text-[#d6302a] border border-[#d6302a]/20">
                                                    {item.factors[0]}
                                                </span>
                                            ) : <span className="text-gray-400">-</span>}
                                        </td>
                                        <td className="py-4 px-8">
                                            <div className="flex flex-col items-end gap-1">
                                                <span className={`text-sm font-black ${item.risk_score > 75 ? 'text-[#d6302a]' : 'text-[#cd5b19]'}`}>
                                                    {item.risk_score}%
                                                </span>
                                                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                    <div 
                                                        className={`h-full rounded-full ${item.risk_score > 75 ? 'bg-[#d6302a]' : 'bg-[#cd5b19]'}`} 
                                                        style={{width: `${item.risk_score}%`}}
                                                    ></div>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
    </div>
  );
}