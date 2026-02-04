import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Setup Response
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // 2. Setup Supabase Client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({ request: { headers: request.headers } })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Ambil User & Path
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname
  
  // ROLE DETECTION (Dengan Fallback 'crew' agar tidak null)
  const role = user?.user_metadata?.role || 'crew'; 

  // === LOGIKA PENGAMANAN (ANTI LOOP) ===

  // KONDISI 1: User BELUM Login
  if (!user) {
    // Jika mencoba masuk area terlarang, lempar ke Login
    if (path.startsWith('/admin') || path.startsWith('/crew')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // KONDISI 2: User SUDAH Login
  if (user) {
    // A. Jika sedang di halaman Login -> Pindahkan ke Dashboard yang sesuai
    if (path === '/login') {
      if (role === 'admin') return NextResponse.redirect(new URL('/admin', request.url));
      return NextResponse.redirect(new URL('/crew/dashboard', request.url));
    }

    // B. Jika mencoba masuk Admin tapi BUKAN Admin
    if (path.startsWith('/admin') && role !== 'admin') {
      // PENTING: Jangan redirect jika tujuannya sudah benar (biar gak loop)
      return NextResponse.redirect(new URL('/crew/dashboard', request.url));
    }
    
    // C. Jika mencoba masuk Dashboard Crew
    // (Kita izinkan semua user yang login untuk masuk sini sementara waktu untuk mencegah error)
    // Logika pembatasan ketat bisa kita pasang nanti setelah error loop sembuh.
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/crew/:path*', '/login'],
}