'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; 
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { Poppins, Inter } from 'next/font/google';
import { Mail, Lock, Eye, EyeOff, LogIn, LifeBuoy, KeyRound, ShieldCheck } from 'lucide-react';

const poppins = Poppins({ 
    subsets: ['latin'], 
    weight: ['400', '600', '700', '800'],
    display: 'swap', 
});

const inter = Inter({ 
    subsets: ['latin'], 
    display: 'swap',
});

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;

            const name = data.user?.user_metadata?.full_name || 'User';
            const role = data.user?.user_metadata?.role;

            toast.success(`Selamat Datang, ${name}!`);

            const employeeRoles = ['crew', 'leader', 'supervisor'];
            if (employeeRoles.includes(role)) {
                router.push('/crew/dashboard');
            } else if (role === 'admin') {
                router.push('/admin');
            } else {
                router.push('/crew/dashboard');
            }

        } catch (error: any) {
            toast.error('Gagal Masuk', { 
                description: 'Email atau password salah. Silakan coba lagi.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen bg-[#f4e3be] text-[#022020] flex flex-col justify-center items-center relative overflow-hidden selection:bg-[#033f3f] selection:text-white ${inter.className}`}>
            
            {/* Background Ornaments */}
            <div className="absolute -left-20 -top-20 size-96 bg-white/20 rounded-full blur-3xl mix-blend-overlay animate-pulse"></div>
            <div className="absolute -right-20 -bottom-20 size-96 bg-[#033f3f]/5 rounded-full blur-3xl"></div>

            <main className="w-full max-w-[1000px] px-6 relative z-10">
                <div className="bg-white rounded-[2rem] shadow-2xl shadow-[#033f3f]/10 overflow-hidden flex flex-col md:flex-row min-h-[600px] border border-white/50">
                    
                    {/* Left Panel (Brand) */}
                    <div className="w-full md:w-[40%] bg-[#033f3f] p-12 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute -right-12 -top-12 size-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-500"></div>
                        
                        {/* --- REVISI POSISI ICON BESAR --- */}
                        {/* Menggunakan absolute dengan nilai negatif lebih besar agar 'mojok' ke bawah */}
                        <div className="absolute -left-24 -bottom-24 opacity-10 pointer-events-none">
                            <Image 
                                src="/iconbal1.png" 
                                alt="Ornament" 
                                width={500} 
                                height={500} 
                                className="w-[500px] h-[500px] transform rotate-12 object-contain grayscale brightness-200" 
                            />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-12">
                                {/* Logo Kecil (Tanpa Container) */}
                                <Image 
                                    src="/icoNbal.png" 
                                    alt="Logo Balista" 
                                    width={80} 
                                    height={80} 
                                    className="w-12 h-12 object-contain" 
                                />
                                <h1 className={`text-l tracking-tight text-white ${poppins.className}`}>PT Altri Sejahtera Indonesia</h1>
                            </div>
                            
                            <div className="mt-auto">
                                <h1 className={`text-3xl md:text-4xl font-bold text-white mb-4 leading-tight ${poppins.className}`}>
                                    Selamat Datang di Portal HR
                                </h1>
                                <p className="text-white/70 text-base leading-relaxed">
                                    Kelola data karyawan, penggajian, dan performa dalam satu platform terintegrasi yang efisien.
                                </p>
                            </div>
                        </div>

                        <div className="relative z-10 mt-12 text-xs text-white/30 font-medium">
                            © 2026 Balista HRIS System
                        </div>
                    </div>

                    {/* Right Panel (Form) */}
                    <div className="w-full md:w-[60%] bg-white p-8 md:p-12 flex flex-col justify-center relative">
                        <div className="max-w-md mx-auto w-full">
                            <div className="mb-10">
                                <h2 className={`text-3xl font-bold text-[#111818] mb-2 ${poppins.className}`}>Masuk Akun</h2>
                                <p className="text-[#022020]/60 text-sm">Silakan masukkan kredensial Anda untuk melanjutkan.</p>
                            </div>

                            <form onSubmit={handleLogin} className="space-y-6">
                                {/* Email Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-[#022020]/80 mb-2" htmlFor="email">
                                        Email Perusahaan
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#033f3f] transition-colors">
                                            <Mail className="w-5 h-5" />
                                        </div>
                                        <input 
                                            id="email" 
                                            type="email" 
                                            placeholder="nama@balista.com" 
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            className="w-full pl-11 pr-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[#022020] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#033f3f]/20 focus:border-[#033f3f] transition-all shadow-sm hover:border-gray-300"
                                        />
                                    </div>
                                </div>

                                {/* Password Input */}
                                <div>
                                    <label className="block text-sm font-semibold text-[#022020]/80 mb-2" htmlFor="password">
                                        Kata Sandi
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-[#033f3f] transition-colors">
                                            <Lock className="w-5 h-5" />
                                        </div>
                                        <input 
                                            id="password" 
                                            type={showPassword ? "text" : "password"} 
                                            placeholder="••••••••" 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            className="w-full pl-11 pr-12 py-3.5 bg-gray-50 border border-gray-200 rounded-xl text-[#022020] placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#033f3f]/20 focus:border-[#033f3f] transition-all shadow-sm hover:border-gray-300"
                                        />
                                        <div 
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-gray-400 hover:text-[#022020] transition-colors"
                                            onClick={() => setShowPassword(!showPassword)}
                                        >
                                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <div className="pt-2">
                                    <button 
                                        type="submit" 
                                        disabled={isLoading}
                                        className={`w-full bg-[#CC3333] text-white font-bold py-4 rounded-xl shadow-lg shadow-[#CC3333]/20 hover:bg-[#b32d2d] hover:shadow-[#CC3333]/30 active:scale-[0.99] transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed ${poppins.className}`}
                                    >
                                        {isLoading ? (
                                            "Memuat..."
                                        ) : (
                                            <>
                                                Masuk Sekarang
                                                <LogIn className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>

                            {/* Footer Links */}
                            <div className="mt-8 flex items-center justify-between text-sm font-medium">
                                <a href="#" className="text-[#4f7979] hover:text-[#033f3f] transition-colors flex items-center gap-1">
                                    <KeyRound className="w-4 h-4" />
                                    Lupa Kata Sandi?
                                </a>
                                <a href="#" className="text-[#4f7979] hover:text-[#033f3f] transition-colors flex items-center gap-1">
                                    <LifeBuoy className="w-4 h-4" />
                                    Hubungi IT
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 py-6 text-center text-[#022020]/40 text-sm font-medium pointer-events-none z-0">
                <div className="flex items-center justify-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Secure HR Portal Environment v2.4
                </div>
            </footer>
        </div>
    );
}