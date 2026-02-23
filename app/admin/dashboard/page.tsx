'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Users, TrendingUp, TrendingDown, AlertTriangle, ArrowRight,
  Download, Activity, Calendar, Bell, ShieldCheck, ArrowLeft, Loader2,
  LogOut, MapPin, ChevronRight, X
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Poppins } from "next/font/google";

const poppins = Poppins({ 
    subsets: ["latin"], 
    weight: ["400", "500", "600", "700", "800", "900"],
    display: 'swap',
});

export default function DashboardPage() {
  const router = useRouter();
  
  // --- STATE DATA ---
  const [stats, setStats] = useState({ totalCrew: 0, highRisk: 0, avgTurnover: 0 });
  const [outletRisks, setOutletRisks] = useState<any[]>([]);
  const [highRiskList, setHighRiskList] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]); 
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);
  const [currentDateStr, setCurrentDateStr] = useState("");

  // --- STATE UI INTERACTIVE ---
  const [showNotif, setShowNotif] = useState(false);
  const [showProfile, setShowProfile] = useState(false);

  // 1. LOAD DATA REAL (Versi ANTI-GAGAL / TANPA RELASI SUPABASE)
  const loadData = async () => {
    setLoading(true);
    try {
        // Ambil SEMUA data satu per satu (Tidak peduli relasi Supabase rusak atau tidak)
        const { data: rawPred, error: errPred } = await supabase.from('churn_predictions').select('*');
        const { data: rawCrew, error: errCrew } = await supabase.from('crew').select('*');
        const { data: rawOutlets } = await supabase.from('outlets').select('*');
        const { data: rawAtt, error: errAtt } = await supabase.from('attendance_summaries').select('*');

        // Munculkan peringatan merah di web kalau Supabase masih ngambek
        if (errPred) toast.error("Gagal baca Prediksi: " + errPred.message);
        if (errCrew) toast.error("Gagal baca Crew: " + errCrew.message);
        if (errAtt) toast.error("Gagal baca Absensi: " + errAtt.message);

        let mergedPredData: any[] = [];

        // Gabungkan tabel secara manual pakai JavaScript
        if (rawPred && rawCrew) {
            mergedPredData = rawPred.map(pred => {
                const matchedCrew = rawCrew.find(c => c.id === pred.crew_id) || {};
                const matchedOutlet = rawOutlets ? rawOutlets.find((o: any) => o.id === matchedCrew.outlet_id) : null;
                
                return {
                    ...pred,
                    crew: {
                        full_name: matchedCrew.full_name || 'Kru Tidak Dikenal',
                        role: matchedCrew.role || 'Karyawan',
                        outlets: {
                            name: matchedOutlet?.name || matchedCrew.outlet_name || 'Outlet Utama'
                        }
                    }
                };
            }).sort((a, b) => b.risk_score - a.risk_score); // Urutkan dari risiko tertinggi
        }

        // --- UPDATE KOTAK ANGKA (METRICS) ---
        if (rawCrew) {
            const activeCrew = rawCrew.filter(c => c.is_active).length;
            const high = mergedPredData.filter(p => p.risk_score > 70).length;
            const totalScore = mergedPredData.reduce((acc, curr) => acc + (curr.risk_score || 0), 0);
            const avgRisk = mergedPredData.length ? (totalScore / mergedPredData.length).toFixed(1) : 0;

            setStats({ totalCrew: activeCrew || rawCrew.length, highRisk: high, avgTurnover: Number(avgRisk) });
        }

        // --- UPDATE HEATMAP & EARLY WARNING ---
        if (mergedPredData.length > 0) {
            const riskByOutlet: any = {};
            mergedPredData.forEach(p => {
                const outletName = p.crew.outlets.name;
                if (!riskByOutlet[outletName]) riskByOutlet[outletName] = { totalScore: 0, count: 0 };
                riskByOutlet[outletName].totalScore += p.risk_score;
                riskByOutlet[outletName].count += 1;
            });

            const heatmapArray = Object.keys(riskByOutlet).map(key => ({
                name: key,
                avgRisk: Math.round(riskByOutlet[key].totalScore / riskByOutlet[key].count),
                count: riskByOutlet[key].count
            })).sort((a, b) => b.avgRisk - a.avgRisk);
            
            setOutletRisks(heatmapArray.slice(0, 3)); 
            setHighRiskList(mergedPredData.slice(0, 5));
        }

        // --- UPDATE GRAFIK KEHADIRAN ---
        if (rawAtt && rawAtt.length > 0) {
            const grouped: any = {};
            rawAtt.forEach(row => {
                const key = `${row.year}-${row.month}`;
                if (!grouped[key]) grouped[key] = { monthNum: row.month, year: row.year, totalAtt: 0, totalAlpha: 0, count: 0 };
                grouped[key].totalAtt += (row.total_days_present || 0);
                grouped[key].totalAlpha += (row.total_alpha || 0);
                grouped[key].count += 1;
            });

            const sortedGroups = Object.values(grouped).sort((a: any, b: any) => {
                if (a.year !== b.year) return a.year - b.year;
                return a.monthNum - b.monthNum;
            });

            const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
            const realChartData = sortedGroups.slice(-6).map((g: any) => {
                const avgAtt = (g.totalAtt / g.count) / 24 * 100;
                const avgResignRisk = (g.totalAlpha / g.count) * 15; 
                return {
                    month: monthNames[g.monthNum] || String(g.monthNum),
                    attendance: Math.min(Math.max(Math.round(avgAtt), 0), 100) || 50, // Nilai default jika 0
                    resign: Math.min(Math.max(Math.round(avgResignRisk), 0), 100) || 10
                };
            });
            setChartData(realChartData);
        } else {
             // JIKA TABEL KOSONG, PAKAI DATA SEMENTARA BIAR GRAFIK TETAP MUNCUL
             setChartData([
                { month: 'Sep', attendance: 72, resign: 15 },
                { month: 'Okt', attendance: 85, resign: 5 },
                { month: 'Nov', attendance: 68, resign: 18 },
                { month: 'Des', attendance: 70, resign: 10 },
                { month: 'Jan', attendance: 75, resign: 12 },
                { month: 'Feb', attendance: 80, resign: 8 },
             ]);
        }
    } catch (e: any) {
        toast.error("Terjadi Kesalahan Kritis: " + e.message);
    } finally {
        setLoading(false);
    }
  };

  const runPrediction = async () => {
    setPredicting(true);
    toast.info("Sedang menjalankan algoritma AI...");
    try {
        const res = await fetch('/api/analytics/predict', { method: 'POST' });
        const result = await res.json();
        if(res.ok || res.status === 400) { 
            // Meskipun status 400 (Data sudah ada), kita tetap load data terbarunya!
            if(res.ok) toast.success(`Analisis AI Berhasil!`);
            else toast.warning(result.message); // Notif data sudah ada
            
            await loadData(); // PAKSA UPDATE TAMPILAN
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast.error("Gagal menjalankan AI.", { description: error.message });
    } finally {
        setPredicting(false);
    }
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      toast.success("Berhasil Logout");
      router.replace("/login");
  };

  const handleInvestigate = (outletName: string) => {
      toast.loading(`Membuka detail outlet: ${outletName}...`);
      setTimeout(() => {
          toast.dismiss();
          router.push("/admin/outlets"); 
      }, 1000);
  };

  const handleExport = () => {
      if(highRiskList.length === 0) return toast.warning("Belum ada data risiko.");
      const csvContent = "data:text/csv;charset=utf-8,Nama,Outlet,Role,Risk Score\n" 
          + highRiskList.map(i => `"${i.crew?.full_name}","${i.crew?.outlets?.name}","${i.crew?.role}",${i.risk_score}`).join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `Analisis_Turnover_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Laporan berhasil diunduh");
  };

  useEffect(() => { 
      loadData(); 
      const now = new Date();
      setCurrentDateStr(now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }));
  }, []);

  const getOutletStyle = (score: number) => {
    if (score > 70) return { label: "CRITICAL", color: "text-[#d6302a]", bg: "bg-[#d6302a]", border: "border-[#d6302a]", badge: "bg-[#d6302a]" };
    if (score > 40) return { label: "WARNING", color: "text-[#cd5b19]", bg: "bg-[#cd5b19]", border: "border-[#cd5b19]", badge: "bg-[#cd5b19]" };
    return { label: "SAFE", color: "text-[#033f3f]", bg: "bg-[#033f3f]", border: "border-[#033f3f]", badge: "bg-[#033f3f]" };
  };

  return (
    <div className={`min-h-screen bg-[#f4e3be] text-[#022020] pb-10 ${poppins.className}`} onClick={() => { setShowNotif(false); setShowProfile(false); }}>
        
        {/* --- HEADER --- */}
        <header className="sticky top-0 z-40 px-6 md:px-8 py-4 mb-6 transition-all duration-300">
            <div className="max-w-[1440px] mx-auto flex items-center justify-between bg-white/60 backdrop-blur-lg border border-white/60 rounded-2xl px-6 py-3 shadow-sm" onClick={(e) => e.stopPropagation()}>
                
                <div className="flex items-center gap-3 text-[#033f3f]">
                    <div className="size-10 bg-[#033f3f] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#033f3f]/20">
                        <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-[#022020]">Balista HRIS</h1>
                </div>
                
                <div className="flex items-center gap-4">
                    <Link href="/admin">
                        <button className="flex items-center gap-2 bg-[#033f3f]/10 border border-[#033f3f]/20 px-4 py-2 rounded-xl text-sm font-bold text-[#033f3f] hover:bg-[#033f3f] hover:text-white transition-all">
                            <ArrowLeft className="w-4 h-4" />
                            <span className="hidden md:inline">Menu Utama</span>
                        </button>
                    </Link>

                    <div className="hidden md:flex items-center gap-2 bg-white/50 border border-white/30 px-4 py-2 rounded-xl text-sm font-medium text-[#022020]">
                        <Calendar className="w-4 h-4 text-[#033f3f]" />
                        <span>Periode: {currentDateStr || "Memuat..."}</span>
                    </div>

                    {/* NOTIFIKASI */}
                    <div className="relative">
                        <button onClick={() => { setShowNotif(!showNotif); setShowProfile(false); }} className={`flex items-center justify-center rounded-xl size-10 transition-colors relative ${showNotif ? 'bg-white shadow-md' : 'bg-white/50 hover:bg-white'}`}>
                            <Bell className="w-5 h-5 text-[#022020]" />
                            {stats.highRisk > 0 && <span className="absolute top-2 right-2 size-2 bg-[#d6302a] rounded-full border border-white animate-pulse"></span>}
                        </button>
                        {showNotif && (
                            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                    <h4 className="font-bold text-sm text-[#022020]">Peringatan Risiko ({stats.highRisk})</h4>
                                    <button onClick={() => setShowNotif(false)}><X className="w-4 h-4 text-gray-400 hover:text-gray-600"/></button>
                                </div>
                                <div className="max-h-64 overflow-y-auto p-2">
                                    {highRiskList.length === 0 ? <p className="text-center text-xs text-gray-400 py-4">Tidak ada notifikasi baru.</p> : highRiskList.slice(0, 3).map((item, i) => (
                                        <div key={i} className="flex items-start gap-3 p-3 hover:bg-red-50 rounded-xl transition-colors cursor-pointer border-b border-gray-50 last:border-0">
                                            <div className="size-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0 mt-1"><AlertTriangle className="w-4 h-4" /></div>
                                            <div>
                                                <p className="text-xs font-bold text-[#022020]">{item.crew?.full_name}</p>
                                                <p className="text-[10px] text-gray-500">Risiko tinggi ({item.risk_score}%) di {item.crew?.outlets?.name}.</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* PROFIL */}
                    <div className="relative">
                        <button onClick={() => { setShowProfile(!showProfile); setShowNotif(false); }} className="size-10 rounded-full bg-white/50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm hover:scale-105 transition-transform">
                            <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" alt="Admin" className="w-full h-full object-cover" />
                        </button>
                        {showProfile && (
                            <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200 z-50">
                                <div className="p-4 border-b border-gray-100 bg-gray-50">
                                    <p className="text-sm font-bold text-[#022020]">Administrator</p>
                                    <p className="text-xs text-gray-500">Super User</p>
                                </div>
                                <div className="p-2">
                                    <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left font-medium">
                                        <LogOut className="w-4 h-4" /> Keluar
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>

        {/* --- MAIN CONTENT --- */}
        <main className="w-full max-w-[1440px] mx-auto px-6 md:px-8 flex flex-col gap-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div>
                    <h2 className="text-3xl md:text-4xl font-black text-[#033f3f] tracking-tight mb-2">Dashboard Analisa Turnover</h2>
                    <p className="text-[#022020]/70 font-medium text-lg">Pantau retensi kru, prediksi risiko, dan stabilitas outlet secara real-time.</p>
                </div>
                <div className="flex gap-3">
                    <button onClick={handleExport} className="flex items-center gap-2 bg-white text-[#033f3f] px-5 py-3 rounded-xl text-sm font-bold shadow-sm border border-white/50 hover:bg-[#fdfbf7] transition-colors">
                        <Download className="w-5 h-5" /> Export Report
                    </button>
                    <button onClick={runPrediction} disabled={predicting} className="flex items-center gap-2 bg-[#033f3f] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-[#033f3f]/20 hover:bg-[#022f2f] hover:scale-105 transition-all disabled:opacity-70 disabled:cursor-not-allowed">
                        {predicting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />} {predicting ? "Memproses..." : "Run AI Prediction"}
                    </button>
                </div>
            </div>

            {/* METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <p className="text-[#022020]/50 text-sm font-bold uppercase tracking-wider">Total Kru Aktif</p>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{loading ? "..." : stats.totalCrew}</h3>
                        </div>
                        <div className="p-3 bg-[#033f3f]/10 rounded-2xl text-[#033f3f]"><Users className="w-8 h-8" /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
                    <div className="flex justify-between items-start">
                        <div className="flex flex-col gap-1">
                            <p className="text-[#022020]/50 text-sm font-bold uppercase tracking-wider">Avg Risk Score</p>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{loading ? "..." : `${stats.avgTurnover}%`}</h3>
                        </div>
                        <div className="p-3 bg-[#cd5b19]/10 rounded-2xl text-[#cd5b19]"><TrendingDown className="w-8 h-8" /></div>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-[1.5rem] shadow-sm border border-[#d6302a]/30 flex flex-col justify-between h-44 group hover:-translate-y-1 hover:shadow-xl transition-all duration-300 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[#d6302a]/5 rounded-bl-full -mr-6 -mt-6 transition-transform group-hover:scale-110"></div>
                    <div className="flex justify-between items-start relative z-10">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <p className="text-[#d6302a] text-sm font-bold uppercase tracking-wider">High Risk Crew</p>
                                {stats.highRisk > 0 && <span className="relative flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#d6302a] opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-[#d6302a]"></span></span>}
                            </div>
                            <h3 className="text-5xl font-black text-[#022020] tracking-tight mt-2">{loading ? "..." : stats.highRisk}</h3>
                        </div>
                        <div className="p-3 bg-[#d6302a]/10 rounded-2xl text-[#d6302a]"><AlertTriangle className="w-8 h-8" /></div>
                    </div>
                </div>
            </div>

            {/* HEATMAP */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-[#022020] flex items-center gap-3">
                        <div className="bg-[#033f3f] p-2 rounded-xl text-white shadow-md shadow-[#033f3f]/20"><MapPin className="w-6 h-6" /></div>
                        Retention Heatmap: Status Outlet
                    </h2>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {loading ? [1,2,3].map(i => <div key={i} className="h-[320px] bg-white/50 animate-pulse rounded-[1.5rem]"></div>) : outletRisks.length === 0 ? (
                        <div className="col-span-3 text-center py-12 text-gray-400 font-bold bg-white/50 rounded-xl border border-dashed border-gray-300">Belum ada data Outlet.</div>
                    ) : (
                        outletRisks.map((outlet, idx) => {
                            const style = getOutletStyle(outlet.avgRisk);
                            const bgImage = ["https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=600&auto=format&fit=crop", "https://images.unsplash.com/photo-1521017432531-fbd92d768814?q=80&w=600&auto=format&fit=crop"][idx % 3];
                            return (
                                <div key={idx} className={`group bg-white rounded-[1.5rem] overflow-hidden border-2 ${style.border} shadow-md hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 flex flex-col h-[320px]`}>
                                    <div className="h-40 bg-gray-200 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent z-10"></div>
                                        <div className="absolute bottom-4 left-5 z-20"><span className={`inline-block px-3 py-1 ${style.badge} text-white text-[10px] font-bold tracking-wider rounded-md uppercase mb-2 shadow-lg`}>{style.label}</span><h3 className="text-white text-xl font-bold leading-tight drop-shadow-md">{outlet.name}</h3></div>
                                        <div className="w-full h-full bg-cover bg-center group-hover:scale-110 transition-transform duration-700" style={{backgroundImage: `url('${bgImage}')`}}></div>
                                    </div>
                                    <div className="p-6 flex flex-col gap-4 flex-1">
                                        <div className="flex justify-between items-end"><div><p className="text-xs text-[#022020]/50 font-bold uppercase tracking-wider">Avg Risk Score</p><p className={`text-4xl font-black ${style.color}`}>{outlet.avgRisk}</p></div><div className="text-right"><p className="text-xs text-[#022020]/50 font-bold uppercase tracking-wider">Jumlah Kru</p><p className="text-xl font-bold text-[#022020]">{outlet.count} Orang</p></div></div>
                                        <hr className="border-[#022020]/10"/>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </section>

            {/* CHART & TABLE */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
                {/* CHART */}
                <div className="bg-white rounded-[1.5rem] p-8 shadow-sm border border-white/50 flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div><h3 className="text-xl font-bold text-[#022020]">Kehadiran vs Resign</h3><p className="text-sm text-[#022020]/50 font-medium">Analisa tren 6 bulan terakhir</p></div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#033f3f]"></span><span className="text-xs font-bold text-[#022020]">Kehadiran</span></div>
                            <div className="flex items-center gap-2"><span className="size-3 rounded-full bg-[#ce6e6a]"></span><span className="text-xs font-bold text-[#022020]">Resign</span></div>
                        </div>
                    </div>
                    <div className="flex-1 min-h-[300px] relative flex items-end justify-between gap-4 px-2 pb-6 border-b border-l border-[#022020]/10">
                        {[0, 25, 50, 75, 100].map((line) => (<div key={line} className="absolute inset-0 bottom-6 border-t border-dashed border-[#022020]/5 pointer-events-none" style={{top: `${100-line}%`}}></div>))}
                        
                        {loading ? (
                             <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic">Memuat grafik...</div>
                        ) : chartData.length === 0 ? (
                             <div className="absolute inset-0 flex items-center justify-center text-gray-400 italic">Data absensi kosong.</div>
                        ) : (
                             chartData.map((item, idx) => (
                                <div key={idx} className="flex flex-col items-center gap-2 w-full group relative z-10">
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-10 bg-black/80 text-white text-[10px] px-2 py-1 rounded-md pointer-events-none transition-opacity whitespace-nowrap">
                                        Hadir: {item.attendance}% | Risiko: {item.resign}%
                                    </div>

                                    <div className="w-4 md:w-6 bg-[#033f3f] rounded-t-md hover:opacity-80 transition-all group-hover:scale-y-105 origin-bottom" style={{height: `${item.attendance}%`}}></div>
                                    <div className="w-4 md:w-6 bg-[#ce6e6a] rounded-t-md hover:opacity-80 transition-all group-hover:scale-y-105 origin-bottom" style={{height: `${item.resign}%`}}></div>
                                    <span className="text-xs font-bold text-[#022020]/50 mt-2">{item.month}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* TABLE */}
                <div className="bg-white rounded-[1.5rem] shadow-sm border border-white/50 flex flex-col overflow-hidden">
                    <div className="p-8 border-b border-[#022020]/5 flex justify-between items-center bg-gray-50/50">
                        <div><h3 className="text-xl font-bold text-[#022020] flex items-center gap-3">Early Warning System<span className="bg-[#d6302a]/10 text-[#d6302a] text-[10px] px-2 py-1 rounded-md uppercase font-bold tracking-wider">Action Needed</span></h3><p className="text-sm text-[#022020]/50 font-medium">Top 5 Karyawan Risiko Tinggi</p></div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[#fafafa] border-b border-[#022020]/5">
                                    <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider">Nama Kru</th>
                                    <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider">Outlet</th>
                                    <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider">Faktor Risiko</th>
                                    <th className="py-4 px-8 text-xs font-bold text-[#022020]/40 uppercase tracking-wider text-right">Prob. Score</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#022020]/5">
                                {loading ? (<tr><td colSpan={4} className="text-center py-10 text-gray-400 italic">Memuat data...</td></tr>) : highRiskList.length === 0 ? (<tr><td colSpan={4} className="text-center py-10 text-gray-400 italic">Data aman. Tidak ada karyawan berisiko tinggi.</td></tr>) : (
                                    highRiskList.map((item, i) => (
                                        <tr key={i} className="hover:bg-[#fdfbf7] transition-colors group">
                                            <td className="py-4 px-8">
                                                <div className="flex items-center gap-4">
                                                    <div className="size-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-sm text-gray-600 border-2 border-white shadow-sm">{item.crew?.full_name?.substring(0,2).toUpperCase()}</div>
                                                    <div><p className="text-sm font-bold text-[#022020] leading-tight group-hover:text-[#033f3f] transition-colors">{item.crew?.full_name}</p><p className="text-xs text-[#022020]/50 font-medium mt-0.5">{item.crew?.role}</p></div>
                                                </div>
                                            </td>
                                            <td className="py-4 px-8"><span className="text-sm font-medium text-gray-700">{item.crew?.outlets?.name}</span></td>
                                            <td className="py-4 px-8">{item.factors && item.factors[0] ? (<span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-[#d6302a]/10 text-[#d6302a] border border-[#d6302a]/20">{item.factors[0]}</span>) : <span className="text-gray-400 text-xs">-</span>}</td>
                                            <td className="py-4 px-8"><div className="flex flex-col items-end gap-1"><span className={`text-sm font-black ${item.risk_score > 70 ? 'text-[#d6302a]' : 'text-[#cd5b19]'}`}>{item.risk_score}%</span><div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden"><div className={`h-full rounded-full ${item.risk_score > 70 ? 'bg-[#d6302a]' : 'bg-[#cd5b19]'}`} style={{width: `${item.risk_score}%`}}></div></div></div></td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </main>
    </div>
  );
}