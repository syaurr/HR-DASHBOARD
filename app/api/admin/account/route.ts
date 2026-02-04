import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

// 1. GENERATE ACCOUNT (POST)
export async function POST(request: Request) {
    try {
        const { crew_id, email, full_name } = await request.json();

        if (!email || !crew_id) {
            return NextResponse.json({ message: "Email dan ID Crew wajib ada." }, { status: 400 });
        }

        // AMBIL DATA ROLE DULU DARI TABEL CREW
        const { data: crewData } = await supabaseAdmin
            .from('crew')
            .select('role')
            .eq('id', crew_id)
            .single();
            
        // Default role 'crew' jika tidak ditemukan
        const crewRole = crewData?.role || 'crew'; 

        const tempPassword = "Crew12345!"; 

        // CREATE USER DENGAN METADATA LENGKAP
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: tempPassword,
            email_confirm: true,
            user_metadata: { 
                full_name: full_name,
                role: crewRole // <--- PENTING: Masukkan role ke metadata agar Middleware terbaca
            }
        });

        if (createError) throw createError;

        // B. Sambungkan ID User baru ke Tabel Crew
        const { error: updateError } = await supabaseAdmin
            .from('crew')
            .update({ auth_user_id: user.user.id })
            .eq('id', crew_id);

        if (updateError) throw updateError;

        return NextResponse.json({ 
            message: "Akun berhasil dibuat.", 
            tempPassword: tempPassword 
        });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}

// 2. DELETE ACCOUNT / RESIGN (DELETE)
export async function DELETE(request: Request) {
    try {
        const { crew_id, auth_user_id } = await request.json();

        if (!auth_user_id) {
            return NextResponse.json({ message: "Crew ini belum punya akun." }, { status: 400 });
        }

        // A. Hapus dari Auth Supabase (Gak bisa login lagi)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(auth_user_id);
        
        if (deleteError) throw deleteError;

        // B. Update Tabel Crew (Putuskan link)
        // Kita TIDAK menghapus data crew, hanya menghapus akses loginnya (auth_user_id jadi null)
        // Dan set is_active jadi false (opsional, tergantung logic frontendmu)
        const { error: updateError } = await supabaseAdmin
            .from('crew')
            .update({ 
                auth_user_id: null, 
                is_active: false // Otomatis non-aktifkan status crew
            })
            .eq('id', crew_id);

        if (updateError) throw updateError;

        return NextResponse.json({ message: "Akses login dicabut & status dinonaktifkan." });

    } catch (error: any) {
        return NextResponse.json({ message: error.message }, { status: 500 });
    }
}