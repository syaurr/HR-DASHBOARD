'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
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

            // Ambil nama user untuk sapaan
            const name = data.user?.user_metadata?.full_name || 'Karyawan';
            const role = data.user?.user_metadata?.role;

            toast.success(`Selamat Datang, ${name}!`);

            // Routing Logic
            const employeeRoles = ['crew', 'leader', 'supervisor'];
            
            if (employeeRoles.includes(role)) {
                router.push('/crew/dashboard');
            } else if (role === 'admin') {
                router.push('/admin');
            } else {
                // Fallback aman ke dashboard crew
                router.push('/crew/dashboard');
            }

        } catch (error: any) {
            toast.error('Gagal Masuk', { 
                description: 'Email atau password salah.' 
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
            <Card className="w-full max-w-sm shadow-lg border-t-4 border-t-blue-600">
                <CardHeader className="text-center">
                    <h1 className="text-2xl font-bold text-gray-800">HRIS PORTAL</h1>
                    <CardDescription>Silakan masuk untuk akses dashboard</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Perusahaan</Label>
                            <Input 
                                id="email" 
                                type="email" 
                                placeholder="nama@email.com" 
                                value={email} 
                                onChange={e => setEmail(e.target.value)} 
                                required 
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input 
                                id="password" 
                                type="password" 
                                value={password} 
                                onChange={e => setPassword(e.target.value)} 
                                required 
                            />
                        </div>
                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                            {isLoading ? 'Memuat...' : 'Masuk Akun'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}