"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { LogOut, Wallet, FileText, User } from "lucide-react";

export default function CrewLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [crewName, setCrewName] = useState("");

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }

        // Ambil nama crew berdasarkan auth_id
        const { data } = await supabase.from('crew').select('full_name').eq('auth_user_id', user.id).single();
        if (data) setCrewName(data.full_name);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header Mobile-Friendly */}
            <header className="bg-white border-b px-4 py-3 flex justify-between items-center sticky top-0 z-10 shadow-sm">
                <div>
                    <h1 className="font-bold text-lg text-blue-700">PT ALTRI SEJAHTERA</h1>
                    <p className="text-xs text-muted-foreground">Halo, {crewName || "Karyawan"}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                    <LogOut className="h-5 w-5 text-red-500" />
                </Button>
            </header>

            {/* Content */}
            <main className="flex-1 p-4 max-w-md mx-auto w-full">
                {children}
            </main>

            {/* Bottom Nav (Apps Style) */}
            <nav className="bg-white border-t flex justify-around p-2 sticky bottom-0 text-xs">
                <button onClick={() => router.push('/crew/dashboard')} className="flex flex-col items-center gap-1 p-2 text-blue-700">
                    <FileText className="h-5 w-5" />
                    <span>Slip Gaji</span>
                </button>
                <button onClick={() => router.push('/crew/kasbon')} className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-blue-700">
                    <Wallet className="h-5 w-5" />
                    <span>Kasbon</span>
                </button>
                <button className="flex flex-col items-center gap-1 p-2 text-gray-500 hover:text-blue-700">
                    <User className="h-5 w-5" />
                    <span>Profil</span>
                </button>
            </nav>
        </div>
    );
}