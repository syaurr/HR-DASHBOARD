import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'; // Mengikuti gaya import kamu
import { z } from 'zod';

export const revalidate = 0;
// Tambahan: Pastikan route ini dinamis karena kita ambil data real-time
export const dynamic = 'force-dynamic'; 

// === VALIDASI DATA (PENTING) ===
// Kita pasang satpam di sini biar data yang masuk ke database bersih
const crewSchema = z.object({
  full_name: z.string().min(3),
  email: z.string().email().optional().or(z.literal('')),
  phone_number: z.string().optional().or(z.literal('')),
  outlet_id: z.string().uuid(),
  role: z.enum(['crew', 'leader', 'supervisor']),
  gender: z.enum(['male', 'female']),
  bank_name: z.string().optional().or(z.literal('')),
  bank_account_number: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  skck_url: z.string().optional().or(z.literal('')), 
  join_date: z.string().optional().or(z.literal('')),
  resign_date: z.string().optional().or(z.literal('')),
  resign_reason: z.string().optional().or(z.literal('')),
  is_active: z.boolean().default(true),
});

// GET: Mengambil semua data kru
export async function GET() {
    try {
        const { data, error } = await supabase
            .from('crew')
            .select('*, outlets(id, name)')
            .order('full_name', { ascending: true });
            
        if (error) throw error;
        
        return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}

// POST: Membuat kru baru
export async function POST(request: Request) {
    try {
        const body = await request.json();
        
        // 1. Validasi Input pakai Zod
        const validatedData = crewSchema.parse(body);

        // 2. Cek apakah email sudah dipakai orang lain?
        if (validatedData.email) {
            const { data: existing } = await supabase
                .from('crew')
                .select('id')
                .eq('email', validatedData.email)
                .single();
            
            if (existing) {
                return NextResponse.json(
                    { message: 'Email sudah terdaftar pada kru lain.' }, 
                    { status: 400, headers: { 'Cache-Control': 'no-store' } }
                );
            }
        }

        // 3. Masukkan ke Database
        const { error } = await supabase.from('crew').insert(validatedData);
        
        if (error) throw error;
        
        return NextResponse.json({ message: 'Kru berhasil dibuat' }, { status: 201, headers: { 'Cache-Control': 'no-store' } });

    } catch (error: any) {
        // Handle error validasi Zod
        if (error instanceof z.ZodError) {
            return NextResponse.json({ message: error.errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ message: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}

// PATCH: Mengubah data kru
export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const { id, ...updateData } = body;

        if (!id) return NextResponse.json({ message: 'ID tidak ditemukan' }, { status: 400 });

        // Bersihkan data undefined/null yang tidak perlu diupdate
        // (Supabase kadang protes kalau kita kirim field yang tidak ada di table, tapi biasanya aman)
        
        const { error } = await supabase.from('crew').update(updateData).eq('id', id);
        
        if (error) throw error;
        
        return NextResponse.json({ message: 'Kru berhasil diperbarui' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}

// DELETE: Menghapus data kru
export async function DELETE(request: Request) {
    try {
        const { id } = await request.json();
        const { error } = await supabase.from('crew').delete().eq('id', id);
        
        if (error) throw error;
        
        return NextResponse.json({ message: 'Kru berhasil dihapus' }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}