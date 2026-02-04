'use client';

import Link from "next/link";
import { 
    Users, Banknote, Star, CalendarClock, ClipboardList, FileSignature, ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function AdminLandingPage() {
    return (
        <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
                <h1 className="text-4xl font-bold tracking-tight text-primary">HR Dashboard</h1>
                <p className="text-lg text-muted-foreground">Pilih modul untuk memulai pengelolaan sistem.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
                
                {/* CARD 1: PENILAIAN */}
                <Card className="hover:shadow-lg transition-all cursor-pointer border-t-4 border-t-orange-500">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Star className="h-6 w-6 text-orange-500" /> PENILAIAN
                        </CardTitle>
                        <CardDescription>Performance & KPI</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground h-10">
                            Dashboard kinerja, periode penilaian, dan rekap feedback karyawan.
                        </p>
                        <Link href="/admin/dashboard-penilaian" className="block">
                            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white">
                                Masuk Modul Penilaian <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* CARD 2: PENGGAJIAN */}
                <Card className="hover:shadow-lg transition-all cursor-pointer border-t-4 border-t-green-600">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Banknote className="h-6 w-6 text-green-600" /> PENGGAJIAN
                        </CardTitle>
                        <CardDescription>Finance & Payroll</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground h-10">
                            Penggajian bulanan, kasbon, absensi, dan analitik keuangan.
                        </p>
                        <Link href="/admin/payroll" className="block">
                            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                                Masuk Modul Penggajian <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>

                {/* CARD 3: ADMINISTRASI */}
                <Card className="hover:shadow-lg transition-all cursor-pointer border-t-4 border-t-blue-600">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Users className="h-6 w-6 text-blue-600" /> ADMINISTRASI
                        </CardTitle>
                        <CardDescription>Data & Accounts</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground h-10">
                            Database kru, kontrak kerja, outlet, dan manajemen akun login.
                        </p>
                        <Link href="/admin/crew" className="block">
                            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                Masuk Modul Admin <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}