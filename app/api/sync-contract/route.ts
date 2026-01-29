import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient'; // Pastikan path benar

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { secret, full_name, base_salary, start_date, end_date, role, contract_type } = body;

    // 1. Keamanan Sederhana
    if (secret !== "KODE_RAHASIA_DARI_GAS_123") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Cek apakah Crew sudah ada? (Berdasarkan nama)
    let crewId;
    const { data: existingCrew } = await supabase
      .from('crew')
      .select('id')
      .ilike('full_name', full_name)
      .single();

    if (existingCrew) {
      crewId = existingCrew.id;
    } else {
      // Jika belum ada, buat crew baru
      const { data: newCrew, error: createError } = await supabase
        .from('crew')
        .insert({ full_name: full_name, role: role || 'crew', gender: 'male' }) // Default gender/role
        .select()
        .single();
      
      if (createError) throw createError;
      crewId = newCrew.id;
    }

    // 3. Masukkan Kontrak
    const { error: contractError } = await supabase
      .from('crew_contracts')
      .insert({
        crew_id: crewId,
        base_salary: parseFloat(base_salary),
        contract_type: contract_type || 'probation',
        start_date: start_date,
        end_date: end_date,
        daily_meal_allowance: 0, // Default
        is_active: true
      });

    if (contractError) throw contractError;

    return NextResponse.json({ success: true, message: "Kontrak tersinkronisasi" });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}