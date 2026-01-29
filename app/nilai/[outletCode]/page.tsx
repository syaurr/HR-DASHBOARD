'use client';

// Import hooks dan komponen yang kita butuhkan
import { useEffect, useState, use } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Star, Mail, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { supabase } from '@/lib/supabaseClient';
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

declare global {
    interface Window {
        tiktok: any;
    }
}

type CrewMember = {
    id: string;
    full_name: string;
    role: 'crew' | 'leader' | 'supervisor';
    gender: 'male' | 'female';
};

type Aspect = {
    aspect_key: string;
    aspect_name: string;
};

type Step = 'welcome' | 'description' | 'selectAssessor' | 'selectAssessed' | 'rating' | 'success';

// Komponen utama halaman kita
export default function AssessmentPage({ params }: { params: Promise<{ outletCode: string }> }) {
    // === STATE MANAGEMENT (VERSI DIPERBAIKI) ===
    const [step, setStep] = useState<Step>('welcome');
    const [allCrew, setAllCrew] = useState<CrewMember[]>([]);
    const [assessor, setAssessor] = useState<CrewMember | null>(null);
    const [assessed, setAssessed] = useState<CrewMember | null>(null);
    const [remainingToAssess, setRemainingToAssess] = useState<CrewMember[]>([]);
    const [aspects, setAspects] = useState<Aspect[]>([]);
    const [scores, setScores] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const { outletCode } = use(params);

    const [systemRating, setSystemRating] = useState<string | null>(null);
    const [hrRating, setHrRating] = useState<string | null>(null);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [activePeriod, setActivePeriod] = useState<{ id: string, name: string } | null>(null);
    const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

    const [tiktokUrl, setTiktokUrl] = useState('');


    // === DATA FETCHING ===
    // Ganti useEffect utama Anda dengan versi yang sudah diperbaiki ini
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError('');
            try {
                // Ambil semua data secara bersamaan
                const [crewRes, periodRes, tiktokRes] = await Promise.all([
                    fetch(`/api/crew/${outletCode}`),
                    fetch('/api/active-period'),
                    fetch('/api/setting?key=tiktok_success_url')
                ]);

                if (!crewRes.ok) throw new Error("Gagal memuat data kru.");
                if (!periodRes.ok) throw new Error("Gagal memuat data periode.");
                if (!tiktokRes.ok) throw new Error("Gagal memuat pengaturan video.");

                const crewData = await crewRes.json();
                const periodData = await periodRes.json();
                const tiktokData = await tiktokRes.json();
                
                setAllCrew(crewData);
                if (periodData && periodData.id) {
                    setActivePeriod(periodData);
                }
                
                // --- PERBAIKAN DI SINI ---
                // Tambahkan baris ini untuk menyimpan URL TikTok ke state
                if (tiktokData && tiktokData.value) {
                    setTiktokUrl(tiktokData.value);
                }
                // -------------------------

            } catch (err: any) {
                setError(err.message);
                setAllCrew([]); 
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [outletCode]);


    useEffect(() => {
        const fetchFeedbackHistory = async () => {
            if (step === 'success' && assessor && activePeriod) {
                try {
                    const res = await fetch(`/api/get-feedback?assessor_id=${assessor.id}&period_id=${activePeriod.id}`);
                    if (!res.ok) return;
                    const history: { category: string, rating: string }[] = await res.json();
                    if (history.length > 0) {
                        setHasSubmittedFeedback(true);
                    } else {
                        setHasSubmittedFeedback(false);
                    }
                } catch (err) {
                    console.error("Gagal memuat riwayat feedback", err);
                }
            }
        };
        fetchFeedbackHistory();
    }, [step, assessor, activePeriod]);
    
    // Ganti useEffect untuk TikTok dengan versi yang lebih canggih ini
    useEffect(() => {
        // Hanya jalankan jika kita berada di halaman 'success'
        if (step === 'success') {

            const loadTikTokScript = () => {
                // Cek jika objek tiktok dan fungsi load-nya sudah ada
                if (window.tiktok && typeof window.tiktok.load === 'function') {
                    // "Panggil ulang" fungsi render dari TikTok
                    window.tiktok.load();
                }
            };

            // Cek jika script embed belum ada di halaman
            if (!document.querySelector('script[src="https://www.tiktok.com/embed.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://www.tiktok.com/embed.js';
                script.async = true;

                // Setelah script selesai dimuat, baru jalankan fungsinya
                script.onload = loadTikTokScript;

                document.body.appendChild(script);

                return () => {
                    // Hapus script saat komponen tidak lagi ditampilkan untuk kebersihan
                    if (document.body.contains(script)) {
                    document.body.removeChild(script);
                    }
                };
            } else {
                // Jika script sudah ada dari render sebelumnya, langsung panggil fungsinya
                loadTikTokScript();
            }
        }
    }, [step, tiktokUrl]); // Tambahkan tiktokUrl sebagai dependency

    // === HANDLER FUNCTIONS ===
    const handleStart = () => setStep('description');
    const handleStartAssessment = () => setStep('selectAssessor');

    const handleSelectAssessor = async (assessorId: string) => {
        const selected = allCrew.find(crew => crew.id === assessorId);
        if (selected) {
            console.log("--- NAMA PENILAI DIPILIH ---");
            console.log("Data Penilai yang Dipilih:", selected);
            setAssessor(selected);
            console.log("State 'assessor' BERHASIL DIATUR:", selected);
            setAssessor(selected); // Cukup atur state assessor
            setIsLoading(true);
            try {
                const historyResponse = await fetch(`/api/history?assessor_id=${assessorId}`);
                const assessedIds: string[] = await historyResponse.json();
                const unassessedCrew = allCrew.filter(
                    crew => crew.id !== assessorId && !assessedIds.includes(crew.id)
                );
                setRemainingToAssess(unassessedCrew);

                if (unassessedCrew.length === 0) {
                    setStep('success');
                } else {
                    setStep('selectAssessed');
                }
            } catch (err) {
                setError("Gagal memuat riwayat penilaian.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleSelectAssessed = async (assessedId: string) => {
        if (!assessedId) return;
        const selected = remainingToAssess.find(crew => crew.id === assessedId);
        if (selected) {
            setAssessed(selected);
            setIsLoading(true);
            try {
                const response = await fetch(`/api/assessment-aspects?role=${selected.role}&gender=${selected.gender}`);
                const aspectsData = await response.json();
                if (!response.ok) throw new Error("Gagal mengambil data aspek");
                setAspects(aspectsData);
                setStep('rating');
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handleRatingChange = (aspect_key: string, value: number) => {
        setScores(prev => ({ ...prev, [aspect_key]: value }));
    };
    
    const backToSelectCrew = () => {
        setAssessed(null);
        setScores({});
        setAspects([]);
        setStep('selectAssessed');
    }

    const handleSubmitAssessment = async () => {

    setIsSubmitting(true);

    if (!assessor || !assessed || Object.keys(scores).length !== aspects.length) {
        toast.warning("Form Belum Lengkap", {
            description: "Harap isi semua penilaian bintang sebelum mengirim.",
        });
        setIsSubmitting(false);
        return;
    }

        setIsSubmitting(true);

        try {
            const periodResponse = await fetch('/api/active-period');
            if (!periodResponse.ok) {
                const errorData = await periodResponse.json();
                throw new Error(errorData.message || "Tidak bisa menemukan periode aktif.");
            }
            const activePeriod: { id: string } = await periodResponse.json();

            const { error: insertError } = await supabase
                .from('assessments')
                .insert({
                    period_id: activePeriod.id,
                    assessor_id: assessor.id,
                    assessed_id: assessed.id,
                    scores,
                });

            if (insertError) throw insertError;

            // 2. Ganti 'setMessage' dengan 'toast.success'
            toast.success("Penilaian Berhasil!", {
                description: `Penilaian untuk ${assessed.full_name} telah berhasil disimpan.`,
            });
            
            const updatedRemaining = remainingToAssess.filter(crew => crew.id !== assessed.id);
            setRemainingToAssess(updatedRemaining);
            
            if (updatedRemaining.length === 0) {
                setStep('success');
            } else {
                backToSelectCrew();
            }

        } catch (error: any) {
            // 3. Ganti 'setError' dengan 'toast.error'
            toast.error("Terjadi Kesalahan", {
                description: error.message || 'Gagal menyimpan penilaian ke server.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    // Di dalam file app/nilai/[outletCode]/page.tsx

    const handleFeedbackSubmit = async () => {
        console.log("--- TOMBOL KIRIM FEEDBACK DIKLIK ---");
        console.log("Kondisi state 'assessor':", assessor);
        console.log("Kondisi state 'activePeriod':", activePeriod);
        // PERBAIKAN VALIDASI
        if (!systemRating || !hrRating) {
            toast.warning("Harap pilih rating untuk sistem dan HR.");
            return;
        }
        if (!assessor || !activePeriod) {
            toast.error("Terjadi Kesalahan", {
                description: "Data penilai atau periode tidak ditemukan. Coba refresh halaman.",
            });
            return;
        }

        setIsSubmittingFeedback(true);
        try {
            const response = await fetch('/api/submit-feedback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating_sistem: systemRating,
                    rating_hr: hrRating,
                    message: feedbackMessage,
                    assessor_id: assessor.id,
                    period_id: activePeriod.id
                })
            });

            if (!response.ok) throw new Error("Gagal menyimpan feedback.");
            
            setHasSubmittedFeedback(true);
            toast.success("Feedback Terkirim!");
        } catch (error: any) {
            toast.error("Terjadi Kesalahan", { description: error.message });
        } finally {
            setIsSubmittingFeedback(false);
        }
    };
    
    // Definisikan data emoji
    const ratings = [
        { emoji: '😠', label: 'Sangat Buruk' },
        { emoji: '😞', label: 'Buruk' },
        { emoji: '😐', label: 'Biasa Saja' },
        { emoji: '😊', label: 'Baik' },
        { emoji: '🤩', label: 'Sangat Baik' }
    ];


    // StarRating component for rating stars (pindah sebelum renderContent untuk menghindari forward-reference issues)
    const StarRating = ({ aspect_key }: { aspect_key: string }) => {
        const value = scores[aspect_key] || 0;
        const handleClick = (rating: number) => {
            handleRatingChange(aspect_key, rating);
        };
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleClick(star)}
                        className="focus:outline-none"
                        aria-label={`Beri nilai ${star} bintang`}
                    >
                        <Star
                            size={28}
                            className={star <= value ? "fill-yellow-400 stroke-yellow-500" : "stroke-gray-300"}
                            fill={star <= value ? "#facc15" : "none"}
                        />
                    </button>
                ))}
            </div>
        );
    };

    // === RENDER LOGIC ===
    const renderContent = () => {
        if (isLoading && !assessed) return <div className="text-center p-10">Loading...</div>;
        if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

        switch (step) {
            case 'welcome':
                return (
                    <div className="text-center space-y-4 py-4">
                        <p className="text-gray-600">Survei ini dibuat untuk perkembangan kita bersama!</p>
                        <Button onClick={handleStart} className="w-full bg-[#033F3F] hover:bg-[#022020] text-white">
                            Mulai!
                        </Button>
                    </div>
                );
            
            case 'description':
                return (
                    <div className="space-y-4 text-left max-h-[60vh] overflow-y-auto p-1 pr-4">
                        <h3 className="text-center text-lg font-bold text-[#022020]">aa teteh, geulis kasep, crew balistaa di baca dulu yaaah 🫰🏻</h3>
                        <Separator />
                        
                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">🧑‍🏫 Aspek Kepemimpinan dan Manajerial itu apa?</h4>
                            <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                <li>Jadi penengah kalau ada masalah antar crew</li>
                                <li>Ngingetin & negur kalau ada yang salah</li>
                                <li>Bangun kerja sama tim biar makin solid</li>
                                <li>Nyampein info dari manajemen ke tim</li>
                                <li>Atur jadwal piket kebersihan biar adil dan jalan terus</li>
                                <li>Bikin tim semangat kerja, kasih motivasi juga</li>
                                <li>Bantu crew berkembang, kasih arahan biar makin jago</li>
                                <li>Ciptain suasana kerja yang nyaman</li>
                                <li>Kasih contoh langsung, bukan cuma nyuruh-nyuruh</li>
                            </ul>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">🧰 Aspek Persiapan itu apa?</h4>
                             <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                 <li>Prepare yang ada di Bagian Freezer kaya bahan yang frozen dll.</li>
                                 <li>Prepare Bagian Dapur kaya alat alat, adonan, dll.</li>
                             </ul>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">🛎️ Aspek Penerimaan Pesanan itu apa?</h4>
                            <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">👦 Untuk Crew Cowok (Aplikasi Online)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Cek & ambil pesanan dari aplikasi</li>
                                    <li>Pastikan pesanan cepet disiapin</li>
                                    <li>Biar driver nggak nunggu lama dan nggak komplain</li>
                                </ul>
                                <p className="font-semibold text-sm pt-2">👧 Untuk Crew Cewek (Greet & Great)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Sambut pelanggan dengan senyum</li>
                                    <li>Bikin kesan pertama yang hangat & ramah</li>
                                    <li>Catat pesanan dari pelanggan langsung (Orderan Offline)</li>
                                    <li>Pastikan pesanan nggak salah input</li>
                                    <li>Layani dengan cepat, jelas, dan ramah</li>
                                </ul>
                                <p className="font-semibold text-sm pt-2">✅ Untuk Semua Crew (Bagian Tambahan)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Ikut bantu dapur pas ramai</li>
                                    <li>Urus admin: absensi, slip gaji, belanja, dll</li>
                                    <li>Pokoknya yang penting bantu tim, bukan ngilang</li>
                                </ul>
                            </div>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                             <h4 className="font-semibold text-base text-[#033F3F]">🍣 Aspek Pembuatan Order itu apa?</h4>
                            <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">👦 Untuk Crew Cowok (Pembuatan Sushi & Hasil Orderan)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Seberapa jago dia bikin sushi? Rapi nggak? Sesuai SOP?</li>
                                    <li>Hasil akhirnya gimana? Cakep nggak tampilannya? Pas rasanya? Konsumen puas nggak?</li>
                                </ul>
                                <p className="font-semibold text-sm pt-2">👧 Untuk Crew Cewek (Penjelasan & Penawaran)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Bisa jelasin menu ke konsumen nggak? Paham isinya?</li>
                                    <li>Rajin nggak kasih info promo? Bikin konsumen tertarik atau malah bingung?</li>
                                </ul>
                            </div>
                        </div>
                        <Separator />

                         <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">📦 Aspek Pengemasan Pesanan itu apa?</h4>
                            <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">✅ Untuk Semua Crew (Packing-nya gimana?)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Apakah lengkap? Rapi? Ada yang suka ketinggalan nggak?</li>
                                    <li>Penting banget supaya pesanan sampai ke pelanggan dalam kondisi oke!</li>
                                </ul>
                            </div>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">📊 Aspek Stock Opname itu apa?</h4>
                             <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">✅ Untuk Semua Crew (Gimana cara dia ngecek & hitung stok?)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Teliti nggak? Ada yang sering kelewat atau salah hitung nggak?</li>
                                    <li>Soalnya stok yang rapi = kerja lebih lancar dan outlet nggak kehabisan bahan!</li>
                                </ul>
                            </div>
                        </div>
                        <Separator />

                        <div className="space-y-2">
                            <h4 className="font-semibold text-base text-[#033F3F]">🧼 Aspek Kebersihan itu apa?</h4>
                             <div className="pl-2 space-y-2">
                                <p className="font-semibold text-sm">👕 Kebersihan Diri (Semua Crew)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Penampilan crew itu cerminan outlet.</li>
                                    <li>Seragam lengkap? Rambut rapi? Atau malah asal-asalan?</li>
                                </ul>
                                <p className="font-semibold text-sm pt-2">🧽 Kebersihan Area Konsumen (Crew Cewe)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Area depan harus selalu bersih & nyaman buat pelanggan.</li>
                                    <li>Lantai, meja, kaca — semuanya harus diperhatikan!</li>
                                </ul>
                                 <p className="font-semibold text-sm pt-2">🧼 Kebersihan Area Belakang/Dapur (Crew Cowok)</p>
                                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 pl-2">
                                    <li>Gimana dia jaga kebersihan dapur?</li>
                                    <li>Termasuk bersihin kulkas, alat masak, tempat cuci piring, jerigen, dan bahan-bahan lainnya.</li>
                                </ul>
                            </div>
                        </div>
                        <Button onClick={handleStartAssessment} className="w-full mt-6 bg-[#033F3F] hover:bg-[#022020] text-white">
                            Oke Paham, Lanjut!
                        </Button>
                    </div>
                );

            case 'selectAssessor':
                return (
                    <div className="space-y-6">
                        <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <h3 className="font-semibold text-blue-800">Pilih Nama Kamu Dulu ya</h3>
                            <p className="text-sm text-blue-600">Ini cuma syarat agar kamu tidak menilai diri sendiri.</p>
                        </div>
                        <Separator />
                        <div>
                            <label className="font-medium">Nama Kamu *</label>
                            <Select onValueChange={handleSelectAssessor}>
                                <SelectTrigger className="w-full mt-2"><SelectValue placeholder="-- Pilih nama kamu --" /></SelectTrigger>
                                <SelectContent>{allCrew.map((crew) => (<SelectItem key={crew.id} value={crew.id}>{crew.full_name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'selectAssessed':
                 return (
                    <div className="space-y-6">
                        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h3 className="font-semibold text-green-800">Pilih Rekan Kerja</h3>
                            <p className="text-sm text-green-600">Sisa rekan kerja yang belum dinilai: <strong>{remainingToAssess.length} orang</strong>.</p>
                        </div>
                        <Separator />
                        <div>
                            <label className="font-medium">Rekan Kerja *</label>
                            <Select onValueChange={handleSelectAssessed} value="">
                                <SelectTrigger className="w-full mt-2"><SelectValue placeholder="-- Pilih rekan kerja --" /></SelectTrigger>
                                <SelectContent>{remainingToAssess.map((crew) => (<SelectItem key={crew.id} value={crew.id}>{crew.full_name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                    </div>
                );
            case 'rating':
                if (isLoading) return <div className="text-center p-10">Memuat aspek penilaian...</div>;
                return (
                    <div className="space-y-6">
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">Kamu Menilai: {assessed?.full_name}</h3>
                            <p className="text-sm text-gray-500">Berikan penilaian dari 1 sampai 5 bintang.</p>
                        </div>
                        <Separator />
                        <div className="space-y-4 max-h-60 overflow-y-auto pr-2">{aspects.map(aspect => (
                            <div key={aspect.aspect_key}>
                                <label className="font-medium text-gray-800">{aspect.aspect_name}</label>
                                <div className="mt-2"><StarRating aspect_key={aspect.aspect_key} /></div>
                            </div>
                        ))}</div>
                        <Button onClick={handleSubmitAssessment} disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700">
                            {isSubmitting ? 'Menyimpan...' : 'Kirim Penilaian'}
                        </Button>
                        <Button variant="link" onClick={backToSelectCrew} className="w-full">Batal</Button>
                    </div>
                );

            case 'success':
                let videoId = '';
                    if (tiktokUrl) {
                        try {
                            const url = new URL(tiktokUrl);
                            const pathParts = url.pathname.split('/');
                            videoId = pathParts[pathParts.length - 1];
                        } catch (e) {
                            console.error("Invalid TikTok URL format");
                        }
                    }

            return (
                <div className="text-center space-y-4 py-8">
                    <h2 className="text-2xl font-bold text-green-600">
                        {/* Baca nama langsung dari objek 'assessor' */}
                        Beres, Makasih {assessor?.full_name}!
                    </h2>
                    <p className="text-gray-600">
                        {/* Baca nama periode langsung dari objek 'activePeriod' */}
                        Kamu sudah menilai semua rekan kerjamu di outlet {outletCode?.toUpperCase()} untuk {activePeriod?.name || 'periode ini'}.
                    </p>

                    {videoId && (
                        <div className="mt-6">
                            <blockquote 
                                className="tiktok-embed" 
                                cite={tiktokUrl} 
                                data-video-id={videoId} 
                                style={{ maxWidth: '605px', minWidth: '325px' }}
                            >
                                <section></section>
                            </blockquote>
                        </div>
                    )}
                    
                    <Separator className="my-8" />

                    <div className="space-y-6 text-left p-4 bg-slate-50 rounded-lg">
                        {hasSubmittedFeedback ? (
                            <div className="text-center py-10">
                                <h3 className="text-lg font-semibold text-green-700">✔️ Feedback Terkirim!</h3>
                                <p className="text-gray-600">Terima kasih atas masukanmu.</p>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-lg font-semibold text-center text-gray-800">Kasih feedback dikit yuk!</h3>
                                <div className="space-y-2">
                                        <label className="font-medium text-gray-700">Gimana cara & tampilan Penilaian Individu versi upgrade ini?</label>
                                        <div className="flex justify-center items-center gap-x-3 sm:gap-x-5">
                                            {ratings.map(({ emoji, label }) => (
                                                <button key={label} onClick={() => setSystemRating(label)} className={`text-3xl sm:text-4xl transition-transform duration-200 ease-in-out hover:scale-125 ${systemRating === label ? 'scale-125' : 'opacity-50'}`}>
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="font-medium text-gray-700">Gimana performa kerjanya tim HR Balista </label>
                                        <div className="flex justify-center items-center gap-x-3 sm:gap-x-5">
                                            {ratings.map(({ emoji, label }) => (
                                                <button key={label} onClick={() => setHrRating(label)} className={`text-3xl sm:text-4xl transition-transform duration-200 ease-in-out hover:scale-125 ${hrRating === label ? 'scale-125' : 'opacity-50'}`}>
                                                    {emoji}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="feedbackMessage" className="font-medium text-gray-700">
                                            Sampein pesan atau saran kamu untuk HR disini (Opsional)
                                        </label>
                                        <Textarea
                                            id="feedbackMessage"
                                            placeholder="Tulis masukanmu di sini..."
                                            value={feedbackMessage}
                                            onChange={(e) => setFeedbackMessage(e.target.value)}
                                        />
                                    </div>
                                    
                                    <div className="pt-4 text-center">
                                        <Button onClick={handleFeedbackSubmit} disabled={!systemRating || !hrRating || isSubmittingFeedback} className="w-full bg-[#033F3F] hover:bg-[#022020] text-white">
                                            {isSubmittingFeedback && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            Kirim Feedback
                                        </Button>
                                        {(!systemRating || !hrRating) && <p className="text-xs text-gray-500 mt-2">Harap pilih rating untuk sistem & HR untuk submit ya!</p>}
                                    </div>
                            </>
                        )}
                        <Separator className="my-4" />
                        <div className="text-center">
                             <p className="text-sm text-gray-600 mb-3">Oiya kita punya form untuk curhat, saran, atau nyampein apapun soal Balista lewat form ini yaa!</p>
                             <a href="https://forms.gle/8bC2oNv1K42XA5916" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-x-2 bg-white border border-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 transition-all duration-200">
                                 <Mail className="w-5 h-5" />
                                 Kotak Curhat (Klik Disini)
                             </a>
                        </div>
                    </div>
                </div>
            );
            default:
                return null;
        }
    };

    return (
        <div className="flex justify-center items-start min-h-screen py-10 bg-gray-100">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center space-y-4 pt-6">
                    <div className="flex justify-center">
                        <Image src="/logo.png" alt="Balista Logo" width={100} height={40} priority />
                    </div>
                    <CardTitle className="text-2xl font-bold text-[#022020]">
                       Penilaian Individu - {outletCode?.toUpperCase()}<br />
                       {activePeriod?.name || 'Periode Aktif'}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-6 pb-6">
                    {message && <div className="mb-4 text-center p-2 bg-green-100 text-green-700 rounded-md">{message}</div>}
                    {renderContent()}
                </CardContent>
            </Card>
        </div>
    );
}