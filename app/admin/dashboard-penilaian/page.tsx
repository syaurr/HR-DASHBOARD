'use client';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { exportToPdf } from '@/lib/pdfGenerator';
import { Progress } from "@/components/ui/progress";
import { AspectChart } from '@/components/charts/AspectChart';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Tipe data (tidak berubah)
type RecapData = {
    id: string; nama: string; outlet: string; role: string;
    aspectScores: { [key: string]: { score: number; max_score: number; } };
    totalNilaiCrew: number; nilaiSupervisor1: number; nilaiSupervisor2: number;
    totalNilaiAkhir: number; rank: number; bonusStatus: string;
    totalPotentialAssessors: number; actualAssessorsCount: number;
};

const aspectDisplayNames: { [key: string]: string } = { leadership: "Kepemimpinan", preparation: "Persiapan", cashier: "Penerimaan", order_making: "Pembuatan", packing: "Pengemasan", stock_opname: "Stock Opname", cleanliness: "Kebersihan" };
const aspectOrder = ["leadership", "preparation", "cashier", "order_making", "packing", "stock_opname", "cleanliness"];

const getScoreColorClass = (aspectData?: { score: number; max_score: number }): string => {
    if (!aspectData || aspectData.max_score === 0) return 'bg-gray-100';
    const percentage = (aspectData.score / aspectData.max_score) * 100;
    if (percentage >= 75) return 'bg-teal-100 text-teal-800';
    if (percentage >= 50) return 'bg-green-100 text-green-800';
    return 'bg-yellow-100 text-yellow-800';
};

export default function AdminDashboard() {
    const [recapData, setRecapData] = useState<RecapData[]>([]);
    const [chartData, setChartData] = useState<any>(null);
    const [activePeriodName, setActivePeriodName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const res = await fetch('/api/admin/full-recap', { cache: 'no-store' });
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.message || "Gagal memuat data rekapitulasi.");
                }
                const data = await res.json();
                setRecapData(data.recapData || []);
                setChartData(data.chartData || {});
                setActivePeriodName(data.activePeriodName || "Tidak Ada Periode Aktif");
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    // --- LOGIKA BARU: Hitung rata-rata nilai akhir ---
    const averageFinalScore = useMemo(() => {
        if (recapData.length === 0) return 0;
        const totalScore = recapData.reduce((sum, crew) => sum + crew.totalNilaiAkhir, 0);
        return totalScore / recapData.length;
    }, [recapData]); // Akan dihitung ulang hanya jika recapData berubah

    if (isLoading) return <div className="text-center p-10">Memuat data rekapitulasi...</div>;
    if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                    <p className="text-gray-500">Rekapitulasi Penilaian Periode: <strong>{activePeriodName}</strong></p>
                </div>
                <div>
                    <Button onClick={async () => await exportToPdf(
                        recapData.map((recap, idx) => ({
                            ...recap,
                            rank: recap.rank ?? idx + 1,
                            name: recap.nama,
                            aspect_scores: recap.aspectScores,
                            bonusStatus: recap.bonusStatus,
                        })),
                        [],
                        activePeriodName
                    )}>Export ke PDF</Button>
                </div>
            </div>
            
            {/* === BAGIAN BARU: Gunakan Accordion untuk membungkus tabel dan chart === */}
            <Accordion type="multiple" className="w-full space-y-4" defaultValue={['peringkat', 'performa']}>
                {/* 1. BAGIAN TABEL PERINGKAT (SEKARANG DI ATAS) */}
                <AccordionItem value="peringkat" className="border rounded-lg bg-white">
                    <AccordionTrigger className="text-xl font-bold px-6">
                        Peringkat Kinerja Kru
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                        <div className="w-full overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">Peringkat</TableHead>
                                        <TableHead>Nama Kru - Outlet & Progress</TableHead>
                                        {aspectOrder.map(key => (<TableHead key={key} className="text-center">{aspectDisplayNames[key]}</TableHead>))}
                                        <TableHead className="text-center font-bold">Total Kru</TableHead>
                                        <TableHead className="text-center">Spv 1</TableHead>
                                        <TableHead className="text-center">Spv 2</TableHead>
                                        <TableHead className="text-center font-extrabold text-lg">Nilai Akhir</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recapData.map((recap) => (
                                        <TableRow key={recap.id}>
                                            <TableCell className="font-bold text-center">{recap.rank}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{recap.nama}</div>
                                                <div className="text-xs text-muted-foreground">{recap.outlet}</div>
                                                {recap.totalPotentialAssessors > 0 && (
                                                    <div className="mt-2 w-32">
                                                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                            <span>Dinilai oleh:</span>
                                                            <span>{recap.actualAssessorsCount} / {recap.totalPotentialAssessors}</span>
                                                        </div>
                                                        <Progress value={(recap.actualAssessorsCount / recap.totalPotentialAssessors) * 100} className="h-1" />
                                                    </div>
                                                )}
                                            </TableCell>
                                            {aspectOrder.map(key => (
                                                <TableCell key={key} className="text-center">
                                                    {recap.role === 'crew' && key === 'leadership' ? '-' : (
                                                        <span className={`px-2 py-1 rounded-md font-semibold ${getScoreColorClass(recap.aspectScores[key])}`}>
                                                            {recap.aspectScores[key]?.score?.toFixed(1) || '-'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            ))}
                                            <TableCell className="text-center font-bold">{recap.totalNilaiCrew.toFixed(2)}</TableCell>
                                            <TableCell className="text-center">{recap.nilaiSupervisor1 > 0 ? recap.nilaiSupervisor1 : '-'}</TableCell>
                                            <TableCell className="text-center">{recap.nilaiSupervisor2 > 0 ? recap.nilaiSupervisor2 : '-'}</TableCell>
                                            <TableCell className="text-center font-extrabold text-lg text-primary">{recap.totalNilaiAkhir.toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                {/* --- BAGIAN BARU: Table Footer untuk Rata-rata --- */}
                                <TableFooter>
                                    <TableRow>
                                        {/* Gabungkan semua kolom sebelum kolom terakhir */}
                                        <TableCell colSpan={11} className="text-right font-bold text-lg">Rata-rata Nilai Akhir Semua Kru</TableCell>
                                        {/* Tampilkan rata-rata di kolom terakhir */}
                                        <TableCell className="text-center font-extrabold text-xl text-primary">{averageFinalScore.toFixed(2)}</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </AccordionContent>
                </AccordionItem>

                {/* 2. BAGIAN CHART (SEKARANG DI BAWAH) */}
                <AccordionItem value="performa" className="border rounded-lg bg-white">
                     <AccordionTrigger className="text-xl font-bold px-6">
                        Performa Aspek Terbaik
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-6">
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {chartData && Object.keys(chartData).length > 0 && aspectOrder.map(key => (
                                <AspectChart 
                                    key={key}
                                    title={aspectDisplayNames[key]} 
                                    data={chartData[key]}
                                />
                            ))}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );
}