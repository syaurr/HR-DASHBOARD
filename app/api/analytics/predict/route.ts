// app/api/analytics/predict/route.ts
import { NextResponse } from "next/server";

export async function POST() {
  try {
    console.log("Menghubungi AI Engine di Port 5000...");

    // PENTING: Ini alamat Server Python kamu
    const response = await fetch('http://127.0.0.1:5000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Gagal menghubungi AI Engine. Status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      count: data.count, 
      message: 'Prediksi AI Berhasil dijalankan oleh Python Engine'
    });

  } catch (error: any) {
    console.error("AI Integration Error:", error);
    return NextResponse.json(
      { success: false, message: "Gagal koneksi ke Python (ml-engine)." },
      { status: 500 }
    );
  }
}