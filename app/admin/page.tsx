'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
    Users, Banknote, Trophy, Activity, ArrowRight, 
    User, CheckCircle, Clock, MapPin, Star
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminLandingPage() {
    // STATE UNTUK DATA REAL
    const [stats, setStats] = useState({
        totalCrew: 0,
        totalOutlets: 0,
        attendanceToday: 0,
        pendingReviews: 0, // Mock atau hitung jika ada tabelnya
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                setLoading(true);
                
                // 1. Hitung Total Kru Aktif
                const { count: crewCount, error: crewError } = await supabase
                    .from('crew')
                    .select('*', { count: 'exact', head: true })
                    .eq('is_active', true);

                // 2. Hitung Total Outlet
                const { count: outletCount, error: outletError } = await supabase
                    .from('outlets')
                    .select('*', { count: 'exact', head: true });

                // 3. Hitung Kehadiran Hari Ini (Asumsi ada tabel attendance)
                // Kita ambil tanggal hari ini format YYYY-MM-DD
                const today = new Date().toISOString().split('T')[0];
                const { count: presenceCount } = await supabase
                    .from('attendance') // Pastikan tabel ini ada, jika belum ada ini akan return null/0 aman
                    .select('*', { count: 'exact', head: true })
                    .eq('date', today)
                    .eq('status', 'hadir'); // Sesuaikan dengan value di DB

                if (crewError) console.error("Error Crew:", crewError);
                if (outletError) console.error("Error Outlet:", outletError);

                setStats({
                    totalCrew: crewCount || 0,
                    totalOutlets: outletCount || 0,
                    attendanceToday: presenceCount || 0,
                    pendingReviews: 12 // Placeholder (karena belum ada tabel review spesifik)
                });

            } catch (error) {
                console.error("Gagal load data dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Hitung Persentase Kehadiran
    const attendancePercentage = stats.totalCrew > 0 
        ? ((stats.attendanceToday / stats.totalCrew) * 100).toFixed(1) 
        : "0";

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Bagian Judul */}
            <div className="mb-12">
                <h1 className="font-poppins text-4xl md:text-6xl font-black tracking-tight mb-4 text-[#022020]">
                    HR Dashboard
                </h1>
                <p className="text-[#022020]/70 text-lg md:text-xl font-medium max-w-2xl leading-relaxed">
                    Selamat datang, Admin. Pilih modul untuk memulai pengelolaan sistem yang efisien dan terintegrasi.
                </p>
            </div>

            {/* BENTO GRID MENU */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6 auto-rows-min">
                
                {/* FEATURED CARD: ANALISIS TURNOVER (Link ke /admin/dashboard) */}
                <div className="md:col-span-2 lg:col-span-2 md:row-span-2 bg-[#033f3f] rounded-[2rem] p-8 md:p-10 relative overflow-hidden group shadow-xl shadow-[#033f3f]/20 flex flex-col justify-between hover:-translate-y-1 transition-all duration-300">
                    <div className="absolute -right-12 -top-12 size-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors"></div>
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-bold mb-6 backdrop-blur-sm border border-white/10">
                            <Star className="w-3 h-3 fill-white" />
                            FEATURED MODULE
                        </div>
                        <h2 className="font-poppins text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">
                            Analisis Turnover
                        </h2>
                        <p className="text-white/80 text-base md:text-lg leading-relaxed max-w-md mb-8">
                            Dapatkan wawasan mendalam tentang retensi karyawan dengan visualisasi data Heatmap dan prediksi AI.
                        </p>
                    </div>
                    
                    <Activity className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/5 pointer-events-none" />

                    <div className="relative z-10 mt-auto">
                        <Link href="/admin/dashboard">
                            <button className="group/btn inline-flex items-center gap-3 bg-white text-[#033f3f] px-6 py-3.5 rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg shadow-black/10">
                                Buka Analitik
                                <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                            </button>
                        </Link>
                    </div>
                </div>

                {/* CARD: ADMINISTRASI SDM */}
                <div className="bg-white rounded-[1.5rem] p-6 flex flex-col justify-between border-l-8 border-[#d6302a] shadow-sm h-full min-h-[220px] hover:-translate-y-1 transition-all duration-300 group">
                    <div>
                        <div className="size-12 rounded-xl bg-[#d6302a]/10 flex items-center justify-center text-[#d6302a] mb-4 group-hover:scale-110 transition-transform">
                            <Users className="w-7 h-7" />
                        </div>
                        <h3 className="font-poppins text-xl font-bold text-[#022020] mb-2">Administrasi SDM</h3>
                        <p className="text-sm text-[#022020]/60 leading-relaxed">
                            Data karyawan, kontrak, approval kandidat & database outlet.
                        </p>
                    </div>
                    <Link href="/admin/crew">
                        <button className="mt-4 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-[#022020] hover:bg-[#d6302a] hover:text-white hover:border-transparent transition-all">
                            Masuk
                        </button>
                    </Link>
                </div>

                {/* CARD: PENGGAJIAN */}
                <div className="bg-white rounded-[1.5rem] p-6 flex flex-col justify-between border-l-8 border-[#cd5b19] shadow-sm h-full min-h-[220px] hover:-translate-y-1 transition-all duration-300 group">
                    <div>
                        <div className="size-12 rounded-xl bg-[#cd5b19]/10 flex items-center justify-center text-[#cd5b19] mb-4 group-hover:scale-110 transition-transform">
                            <Banknote className="w-7 h-7" />
                        </div>
                        <h3 className="font-poppins text-xl font-bold text-[#022020] mb-2">Penggajian</h3>
                        <p className="text-sm text-[#022020]/60 leading-relaxed">
                            Absensi otomatis, kasbon, & slip gaji digital.
                        </p>
                    </div>
                    <Link href="/admin/payroll">
                        <button className="mt-4 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-[#022020] hover:bg-[#cd5b19] hover:text-white hover:border-transparent transition-all">
                            Masuk
                        </button>
                    </Link>
                </div>

                {/* CARD: PENILAIAN */}
                <div className="md:col-span-2 lg:col-span-1 bg-white rounded-[1.5rem] p-6 flex flex-col justify-between border-l-8 border-[#f2d086] shadow-sm h-full min-h-[220px] hover:-translate-y-1 transition-all duration-300 group">
                    <div>
                        <div className="size-12 rounded-xl bg-[#f2d086]/20 flex items-center justify-center text-orange-400 mb-4 group-hover:scale-110 transition-transform">
                            <Trophy className="w-7 h-7" />
                        </div>
                        <h3 className="font-poppins text-xl font-bold text-[#022020] mb-2">Penilaian Kinerja</h3>
                        <p className="text-sm text-[#022020]/60 leading-relaxed">
                            KPI, evaluasi bulanan & perhitungan insentif.
                        </p>
                    </div>
                    <Link href="/admin/dashboard-penilaian">
                        <button className="mt-4 w-full py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-[#022020] hover:bg-[#f2d086] hover:text-[#022020] hover:border-transparent transition-all">
                            Masuk
                        </button>
                    </Link>
                </div>

                {/* MINI STATS CARDS (DATA REAL) */}
                
                {/* Total Karyawan */}
                <div className="bg-white rounded-[1.25rem] p-5 flex items-center gap-4 shadow-sm border border-white/50">
                    <div className="size-10 rounded-full bg-[#4f7979]/10 flex items-center justify-center text-[#4f7979] flex-shrink-0">
                        <User className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f7979]">Total Karyawan</p>
                        <p className="text-xl font-poppins font-bold text-[#022020]">
                            {loading ? "..." : stats.totalCrew}
                        </p>
                    </div>
                </div>

                {/* Hadir Hari Ini */}
                <div className="bg-white rounded-[1.25rem] p-5 flex items-center gap-4 shadow-sm border border-white/50">
                    <div className="size-10 rounded-full bg-[#4f7979]/10 flex items-center justify-center text-[#4f7979] flex-shrink-0">
                        <CheckCircle className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f7979]">Hadir Hari Ini</p>
                        <p className="text-xl font-poppins font-bold text-[#022020]">
                            {loading ? "..." : `${attendancePercentage}%`}
                        </p>
                    </div>
                </div>

                {/* Review Tertunda */}
                <div className="bg-white rounded-[1.25rem] p-5 flex items-center gap-4 shadow-sm border border-white/50">
                    <div className="size-10 rounded-full bg-[#4f7979]/10 flex items-center justify-center text-[#4f7979] flex-shrink-0">
                        <Clock className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f7979]">Review Tertunda</p>
                        <p className="text-xl font-poppins font-bold text-[#022020]">
                            {loading ? "..." : stats.pendingReviews}
                        </p>
                    </div>
                </div>

                {/* Total Outlet */}
                <div className="bg-white rounded-[1.25rem] p-5 flex items-center gap-4 shadow-sm border border-white/50">
                    <div className="size-10 rounded-full bg-[#4f7979]/10 flex items-center justify-center text-[#4f7979] flex-shrink-0">
                        <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f7979]">Total Outlet</p>
                        <p className="text-xl font-poppins font-bold text-[#022020]">
                            {loading ? "..." : stats.totalOutlets}
                        </p>
                    </div>
                </div>

            </div>
        </div>
    );
}