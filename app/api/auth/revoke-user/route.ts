import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const { crew_id, auth_user_id } = await request.json();

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Hapus User dari Supabase Auth (Agar tidak bisa login lagi)
    if (auth_user_id) {
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(auth_user_id);
        if (deleteError) throw deleteError;
    }

    // 2. Update Tabel Crew (Hapus link auth_id dan set non-aktif)
    const { error: updateError } = await supabaseAdmin
      .from('crew')
      .update({ 
          auth_user_id: null, // Putus link
          is_active: false    // Tandai non-aktif (opsional, tergantung kebijakan)
      })
      .eq('id', crew_id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}