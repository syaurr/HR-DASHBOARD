"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
    LayoutDashboard,
    Users,
    Building,
    FileSignature,
    CalendarClock,
    Calculator,
    ClipboardList,
    UserCog,
    Wallet,
    Banknote,
    Trophy,
    PanelLeftClose,
    PanelLeftOpen,
    MessageSquareQuote,
    Settings,
    LogOut,
} from "lucide-react";

type NavLink = {
    href: string;
    label: string;
    icon: React.ElementType;
};

const navLinks: NavLink[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/crew", label: "Kru", icon: Users },
    { href: "/admin/outlets", label: "Outlet", icon: Building },
    { href: "/admin/contracts", label: "Kontrak Kerja", icon: FileSignature }, // NEW
    { href: "/admin/periods", label: "Periode", icon: CalendarClock },
    { href: "/admin/weights", label: "Bobot", icon: Calculator },
        { href: "/admin/cash-advances", label: "Kasbon", icon: Wallet }, // NEW: Menu Approval Kasbon
    { href: "/admin/crew/accounts", label: "Akun Login", icon: UserCog }, // NEW: Menu Generate Akun
    { href: "/admin/attendance", label: "Data Absensi", icon: ClipboardList },
    { href: "/admin/payroll", label: "Penggajian", icon: Banknote }, 
    { href: "/admin/incentives", label: "Aturan Insentif", icon: Trophy },
    { href: "/admin/feedback", label: "Rekap Feedback", icon: MessageSquareQuote },
    { href: "/admin/settings", label: "Pengaturan", icon: Settings },
];

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isCollapsed, setIsCollapsed] = useState(false);
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login'); // Arahkan ke halaman login setelah logout
        router.refresh();
    };


    return (
        <div className="flex min-h-screen w-full bg-muted/40">
            {/* --- SIDEBAR --- */}
            <aside className={cn(
                "flex h-screen flex-col border-r bg-background transition-all duration-300 ease-in-out",
                isCollapsed ? "w-16" : "w-64"
            )}>
                <div className="flex h-16 items-center justify-center border-b px-4">
                    <Link href="/admin">
                        <Image
                            src="/logo.png"
                            alt="Balista Logo"
                            width={isCollapsed ? 32 : 100}
                            height={32}
                            className="transition-all duration-300"
                        />
                    </Link>
                </div>
                <nav className="flex flex-col space-y-2 p-2">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            // 5. Tambahkan logika untuk highlight link yang aktif
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                                pathname === link.href
                                ? "bg-accent text-accent-foreground" // Style untuk link aktif
                                : "text-muted-foreground" // Style untuk link tidak aktif
                            )}
                        >
                            <link.icon className="h-5 w-5 flex-shrink-0" />
                            {!isCollapsed && <span className="truncate">{link.label}</span>}
                        </Link>
                    ))}
                </nav>
            </aside>

            {/* --- KONTEN UTAMA --- */}
            <div className="flex flex-col flex-grow overflow-hidden">
                <header className="flex h-16 items-center border-b bg-background px-4">
                    <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
                        {isCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                        <span className="sr-only">Toggle Sidebar</span>
                    </Button>

                    <div className="ml-auto">
                        <Button variant="ghost" size="icon" onClick={handleLogout}>
                            <LogOut className="h-5 w-5" />
                            <span className="sr-only">Logout</span>
                        </Button>
                    </div>
                    
                </header>
                <main className="flex-1 overflow-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
}