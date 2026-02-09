"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { Poppins, Inter } from "next/font/google";
import {
    LayoutDashboard, Users, Building, FileSignature, CalendarClock, Calculator, 
    ClipboardList, UserCog, Wallet, Banknote, Trophy, PanelLeftClose, PanelLeftOpen, 
    MessageSquareQuote, Settings, LogOut, BarChart, ArrowLeft, 
    Activity, ShieldCheck, Bell
} from "lucide-react";

// Konfigurasi Font
const poppins = Poppins({ 
    subsets: ["latin"], 
    weight: ["400", "500", "600", "700", "800", "900"],
    variable: '--font-poppins',
    display: 'swap',
});

const inter = Inter({
    subsets: ["latin"],
    variable: '--font-inter',
    display: 'swap',
});

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast.success("Berhasil Keluar");
        router.replace('/login'); 
        router.refresh();
    };

    // === DEFINISI DATA MENU ===
    const allMenuGroups = [
        {
            id: "penilaian",
            title: "PENILAIAN",
            matchPaths: ["/admin/dashboard-penilaian", "/admin/periods", "/admin/weights", "/admin/incentives", "/admin/feedback", "/admin/settings"],
            items: [
                { label: "Dashboard Kinerja", href: "/admin/dashboard-penilaian", icon: LayoutDashboard },
                { label: "Periode", href: "/admin/periods", icon: CalendarClock },
                { label: "Bobot Nilai", href: "/admin/weights", icon: Calculator },
                { label: "Aturan Insentif", href: "/admin/incentives", icon: Trophy },
                { label: "Rekap Feedback", href: "/admin/feedback", icon: MessageSquareQuote },
                { label: "Pengaturan", href: "/admin/settings", icon: Settings },
            ]
        },
        {
            id: "penggajian",
            title: "PENGGAJIAN",
            matchPaths: ["/admin/attendance", "/admin/cash-advances", "/admin/payroll"],
            items: [
                { label: "Data Absensi", href: "/admin/attendance", icon: ClipboardList },
                { label: "Kasbon", href: "/admin/cash-advances", icon: Wallet },
                { label: "Penggajian", href: "/admin/payroll", icon: Banknote },
                { label: "Analitik Gaji", href: "/admin/payroll/analytics", icon: BarChart }, 
            ]
        },
        {
            id: "administrasi",
            title: "DATA ADMINISTRASI",
            matchPaths: ["/admin/dashboard", "/admin/crew", "/admin/outlets", "/admin/contracts"],
            items: [
                { label: "Analisis Turnover", href: "/admin/dashboard", icon: Activity },
                { label: "Approval Kandidat", href: "/admin/crew/approvals", icon: FileSignature },
                { label: "Data Kru", href: "/admin/crew", icon: Users },
                { label: "Outlet", href: "/admin/outlets", icon: Building },
                { label: "Kontrak Kerja", href: "/admin/contracts", icon: FileSignature },
                { label: "Akun Login", href: "/admin/crew/accounts", icon: UserCog },
            ]
        }
    ];

    const activeGroup = allMenuGroups.find(group => 
        group.matchPaths.some(path => pathname.startsWith(path))
    );
    const displayedMenus = activeGroup ? [activeGroup] : [];

    // === LAYOUT 1: LANDING PAGE (/admin) - CANGKANG SAJA ===
    // Isinya akan diambil dari page.tsx
    if (pathname === '/admin') {
        return (
            <div className={cn("min-h-screen bg-[#f4e3be] text-[#022020] selection:bg-[#033f3f] selection:text-white", poppins.variable, inter.variable)}>
                
                {/* HEADER GLASSMORPHISM (NAVIGASI ATAS) */}
                <header className="fixed top-0 left-0 right-0 z-50 px-6 md:px-12 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between bg-white/25 backdrop-blur-md border border-white/30 rounded-2xl px-6 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="size-10 flex items-center justify-center bg-[#033f3f] rounded-xl text-white shadow-lg shadow-[#033f3f]/20">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-[#022020] font-poppins">Balista HR</h2>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex gap-2">
                                <button className="flex items-center justify-center rounded-xl size-10 bg-white/50 text-[#022020] hover:bg-white transition-colors">
                                    <Bell className="w-5 h-5" />
                                </button>
                                <button className="flex items-center justify-center rounded-xl size-10 bg-white/50 text-red-600 hover:bg-red-50 transition-colors" onClick={handleLogout} title="Keluar">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="size-10 rounded-full bg-white/50 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                                <img alt="User Profile" className="w-full h-full object-cover" src="https://api.dicebear.com/7.x/avataaars/svg?seed=Admin" />
                            </div>
                        </div>
                    </div>
                </header>

                {/* AREA KONTEN UTAMA (Diisi oleh page.tsx) */}
                <main className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto font-inter">
                    {children}
                </main>

                {/* FOOTER */}
                <footer className="mt-auto border-t border-white/30 bg-white/20 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-6 md:px-12 py-8 flex flex-col md:flex-row items-center justify-between gap-6 font-inter text-[#022020]">
                        <div className="text-sm opacity-60 font-medium">
                            © 2026 Balista HRIS. Platform Terpadu Manajemen SDM.
                        </div>
                        <div className="flex items-center gap-6">
                            <a className="text-sm opacity-60 hover:text-[#033f3f] hover:opacity-100 font-medium transition-colors" href="#">Privasi</a>
                            <a className="text-sm opacity-60 hover:text-[#033f3f] hover:opacity-100 font-medium transition-colors" href="#">Bantuan</a>
                        </div>
                    </div>
                </footer>
            </div>
        );
    }

    // === LAYOUT 2: HALAMAN ADMIN (DENGAN SIDEBAR) ===
    return (
        <div className={cn("flex min-h-screen w-full bg-muted/40", poppins.className)}>
            {/* SIDEBAR */}
            <aside className={cn(
                "flex h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out fixed left-0 top-0 z-20 shadow-sm",
                isCollapsed ? "w-16" : "w-64"
            )}>
                <div className="flex h-16 items-center justify-center border-b px-4 bg-white">
                    <Link href="/admin">
                        <Image src="/logo.png" alt="Logo" width={isCollapsed ? 32 : 100} height={32} className="transition-all" />
                    </Link>
                </div>

                <div className="p-3 border-b border-dashed">
                    <Link href="/admin">
                        <Button variant="secondary" size="sm" className={cn("w-full bg-blue-50 text-blue-700 hover:bg-blue-100", isCollapsed ? "px-0" : "justify-start")}>
                            <ArrowLeft className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
                            {!isCollapsed && "Menu Utama"}
                        </Button>
                    </Link>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 space-y-4 px-2 custom-scrollbar">
                    {displayedMenus.map((group, idx) => (
                        <div key={idx}>
                            {!isCollapsed && (
                                <h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground opacity-70">
                                    Modul {group.title}
                                </h3>
                            )}
                            
                            <div className="space-y-1">
                                {group.items.map((link) => {
                                    const isActive = pathname === link.href;
                                    return (
                                        <Link
                                            key={link.label} 
                                            href={link.href}
                                            title={isCollapsed ? link.label : undefined}
                                            className={cn(
                                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                                isActive ? "bg-accent text-accent-foreground font-semibold" : "text-muted-foreground",
                                                isCollapsed && "justify-center px-2"
                                            )}
                                        >
                                            <link.icon className="h-5 w-5 flex-shrink-0" />
                                            {!isCollapsed && <span>{link.label}</span>}
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="border-t p-2">
                    <Button variant="ghost" className={cn("w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700", isCollapsed ? "justify-center px-0" : "")} onClick={handleLogout}>
                        <LogOut className="h-5 w-5" />{!isCollapsed && <span className="ml-2">Keluar</span>}
                    </Button>
                </div>
            </aside>

            {/* KONTEN UTAMA */}
            <div className={cn("flex flex-col flex-grow min-h-screen transition-all duration-300", isCollapsed ? "ml-16" : "ml-64")}>
                <header className="flex h-16 items-center justify-between border-b bg-background px-4 sticky top-0 z-10 shadow-sm bg-white/80 backdrop-blur-sm">
                    <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)} className="-ml-2">
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </Button>
                    <div className="flex items-center gap-4">
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold">Administrator</p>
                            <p className="text-xs text-muted-foreground">Super User</p>
                        </div>
                    </div>
                </header>
                <main className="flex-1 p-6 overflow-auto">{children}</main>
            </div>
        </div>
    );
}