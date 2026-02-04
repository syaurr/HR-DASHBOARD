'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { LogOut, User, MapPin, Briefcase, Calendar, Clock, AlertTriangle } from "lucide-react";

// Tipe Data Sederhana untuk Dashboard
type CrewProfile = {
    id: string;
    full_name: string;
    role: string;
    join_date: string | null;
    resign_date: string | null;
    resign_reason: string | null;
    is_active: boolean;
    outlets: { name: string }[] | null;
};

export default function CrewDashboard() {
    const [profile, setProfile] = useState<CrewProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isResignOpen, setIsResignOpen] = useState(false);
    const [resignDate, setResignDate] = useState("");
    const [resignReason, setResignReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const router = useRouter();

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            // 1. Ambil User Auth
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                console.log("User belum terdeteksi di client");
                return; 
            }

            // CEK: Apakah ini Admin yang nyasar?
            if (user.user_metadata?.role === 'admin') {
                toast.info("Anda adalah Admin, mengalihkan...");
                router.replace('/admin'); // Tendang balik ke Admin
                return;
            }

            // 2. Ambil Data Crew Detail
            const { data, error } = await supabase
                .from('crew')
                .select('id, full_name, role, join_date, resign_date, resign_reason, is_active, outlets(name)')
                .eq('auth_user_id', user.id)
                .maybeSingle(); // GANTI .single() JADI .maybeSingle() BIAR GAK ERROR MERAH

            if (error) throw error;

            if (!data) {
                // Kasus: Akun login ada, tapi data di tabel crew tidak ada
                toast.error("Profil data karyawan tidak ditemukan.");
                return;
            }

            setProfile(data);
        } catch (error: any) {
            console.error("Error Fetch Profile:", error.message);
            // toast.error("Gagal memuat profil.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.replace('/login');
    };

    const handleSubmitResign = async () => {
        if (!resignDate || !resignReason) {
            toast.error("Harap isi tanggal dan alasan.");
            return;
        }

        setIsSubmitting(true);
        try {
            // Update data resign di database
            // Note: Kita set is_active tetap TRUE dulu sampai tanggal resign tiba (opsional),
            // atau bisa langsung FALSE jika resign hari ini. 
            // Untuk keamanan, kita hanya update tanggal & alasan, biar Admin yang finalisasi status 'is_active'.
            const { error } = await supabase
                .from('crew')
                .update({
                    resign_date: resignDate,
                    resign_reason: resignReason,
                    // is_active: false // Uncomment jika ingin langsung non-aktif saat klik submit
                })
                .eq('id', profile?.id);

            if (error) throw error;

            toast.success("Pengajuan Resign Terkirim", { 
                description: "HRD akan meninjau pengajuan Anda." 
            });
            setIsResignOpen(false);
            fetchProfile(); // Refresh data

        } catch (error: any) {
            toast.error("Gagal mengajukan resign", { description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Helper Hitung Masa Kerja
    const calculateTenure = (start: string | null) => {
        if (!start) return "Belum diset";
        const startDate = new Date(start);
        const endDate = new Date();
        
        let years = endDate.getFullYear() - startDate.getFullYear();
        let months = endDate.getMonth() - startDate.getMonth();
        
        if (months < 0) {
            years--;
            months += 12;
        }
        
        if (years > 0) return `${years} Tahun ${months} Bulan`;
        return `${months} Bulan`;
    };

    if (isLoading) return <div className="flex h-screen items-center justify-center bg-gray-50">Memuat Profil...</div>;
    if (!profile) return <div className="flex h-screen items-center justify-center">Data tidak ditemukan.</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* --- HEADER --- */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-md mx-auto px-4 h-16 flex items-center justify-between">
                    <div>
                        <h1 className="font-bold text-lg text-gray-800">HRIS CREW</h1>
                        <p className="text-xs text-gray-500">v1.0.0</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <LogOut className="w-4 h-4 mr-2" /> Keluar
                    </Button>
                </div>
            </div>

            <main className="max-w-md mx-auto px-4 py-6 space-y-6">
                
                {/* --- KARTU PROFIL --- */}
                <Card className="border-none shadow-md overflow-hidden relative">
                    <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                    <div className="px-6 pb-6">
                        <div className="relative -mt-10 mb-4">
                            <div className="w-20 h-20 bg-white rounded-full p-1 shadow-lg flex items-center justify-center">
                                <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-2xl">
                                    {profile.full_name.charAt(0)}
                                </div>
                            </div>
                        </div>
                        
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold text-gray-900">{profile.full_name}</h2>
                            <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                                    <Briefcase className="w-3 h-3" /> {profile.role.toUpperCase()}
                                </span>
                                <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full">
                                    <MapPin className="w-3 h-3" /> {profile.outlets && profile.outlets.length > 0 ? profile.outlets.map(o => o.name).join(', ') : 'No Outlet'}
                                </span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* --- MASA KERJA & STATUS --- */}
                <div className="grid grid-cols-2 gap-4">
                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                            <Clock className="w-8 h-8 text-blue-500 mb-2" />
                            <p className="text-xs text-gray-500 font-medium">Masa Kerja</p>
                            <p className="font-bold text-lg text-blue-700">
                                {calculateTenure(profile.join_date)}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-1">
                                Sejak {profile.join_date ? new Date(profile.join_date).toLocaleDateString('id-ID') : '-'}
                            </p>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center h-full">
                            <User className="w-8 h-8 text-green-500 mb-2" />
                            <p className="text-xs text-gray-500 font-medium">Status Pegawai</p>
                            {profile.is_active ? (
                                <Badge className="mt-1 bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                    Aktif Bekerja
                                </Badge>
                            ) : (
                                <Badge variant="destructive" className="mt-1">
                                    Resign / Non-aktif
                                </Badge>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* --- MENU RESIGN --- */}
                {profile.is_active ? (
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-orange-500"/> Pengajuan Resign
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Ajukan pengunduran diri secara mandiri.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {profile.resign_date ? (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
                                    <p className="font-bold mb-1">Pengajuan Dikirim</p>
                                    <p>Tgl Keluar: {new Date(profile.resign_date).toLocaleDateString('id-ID')}</p>
                                    <p>Alasan: {profile.resign_reason}</p>
                                    <p className="mt-2 text-xs italic opacity-75">Hubungi Admin jika ingin membatalkan.</p>
                                </div>
                            ) : (
                                <Dialog open={isResignOpen} onOpenChange={setIsResignOpen}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">
                                            Ajukan Pengunduran Diri
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-sm">
                                        <DialogHeader>
                                            <DialogTitle>Form Pengunduran Diri</DialogTitle>
                                            <DialogDescription>
                                                Keputusan ini akan diteruskan ke HRD.
                                            </DialogDescription>
                                        </DialogHeader>
                                        
                                        <div className="space-y-4 py-2">
                                            <div className="space-y-2">
                                                <Label>Tanggal Terakhir Bekerja</Label>
                                                <Input 
                                                    type="date" 
                                                    value={resignDate} 
                                                    onChange={(e) => setResignDate(e.target.value)} 
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Alasan Resign</Label>
                                                <Textarea 
                                                    placeholder="Jelaskan alasan pengunduran diri Anda..." 
                                                    value={resignReason} 
                                                    onChange={(e) => setResignReason(e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <DialogFooter>
                                            <Button variant="ghost" onClick={() => setIsResignOpen(false)}>Batal</Button>
                                            <Button variant="destructive" onClick={handleSubmitResign} disabled={isSubmitting}>
                                                {isSubmitting ? 'Mengirim...' : 'Kirim Pengajuan'}
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                            )}
                        </CardContent>
                    </Card>
                ) : (
                    <div className="p-4 bg-gray-200 rounded-lg text-center text-gray-500 text-sm">
                        Akun Anda berstatus Non-aktif (Resign).
                    </div>
                )}
            </main>
        </div>
    );
}