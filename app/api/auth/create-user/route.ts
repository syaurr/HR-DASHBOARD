import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // 1. Ambil body dari request
    const body = await request.json();
    const { email, password, crew_id } = body;

    // 2. Setup Admin Client (Hanya jalan di Server)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!, // Pastikan variable ini ada di .env.local
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 3. Cek apakah email sudah ada?
    const { data: users, error: searchError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users?.users.find(u => u.email === email);
    
    if (existingUser) {
        // Jika sudah ada, update saja tabel crew untuk link ke user ini
        await supabaseAdmin
            .from('crew')
            .update({ auth_user_id: existingUser.id })
            .eq('id', crew_id);
            
        return NextResponse.json({ message: "Email sudah terdaftar, crew di-link ulang." });
    }

    // 4. Create User Baru
    const { data: user, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { role: 'crew' } // <--- INI KUNCINYA
    });

    if (authError) throw authError;

    if (!user.user) throw new Error("Gagal membuat user auth");

    // 5. Update Tabel Crew (Link ID Auth ke Data Crew)
    const { error: updateError } = await supabaseAdmin
      .from('crew')
      .update({ auth_user_id: user.user.id })
      .eq('id', crew_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, user: user.user });

  } catch (error: any) {
    console.error("Error Create User:", error); // Cek terminal VSCode untuk detail error
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}