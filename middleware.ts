import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Inisialisasi Response awal
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Setup Supabase Client untuk Middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // 3. Ambil User yang sedang aktif
  // Gunakan getUser() karena lebih aman (validasi ke server Supabase) daripada getSession()
  const { data: { user } } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname

  // --- LOGIKA UTAMA (SATPAM) ---

  // KASUS A: User BELUM LOGIN
  if (!user) {
    // Jika mencoba akses halaman Admin atau Crew, tendang ke Login
    if (path.startsWith('/admin') || path.startsWith('/crew')) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // KASUS B: User SUDAH LOGIN
  if (user) {
    const userRole = user.user_metadata?.role // Ambil role ('crew' atau undefined/admin)

    // B1. Jika User buka halaman LOGIN, lempar ke dashboard sesuai role
    if (path === '/login') {
      if (userRole === 'crew') {
        return NextResponse.redirect(new URL('/crew/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/admin', request.url))
      }
    }

    // B2. Proteksi Halaman ADMIN (Crew dilarang masuk)
    if (path.startsWith('/admin') && userRole === 'crew') {
       // Crew nyasar ke admin -> lempar balik ke kandang crew
       return NextResponse.redirect(new URL('/crew/dashboard', request.url))
    }

    // B3. Proteksi Halaman CREW (Admin dilarang masuk - Opsional)
    // Jika Admin nyasar ke tampilan crew -> lempar balik ke admin
    if (path.startsWith('/crew') && userRole !== 'crew') {
        return NextResponse.redirect(new URL('/admin', request.url))
    }
  }

  return response
}

// Konfigurasi path mana saja yang dicegat oleh Middleware ini
export const config = {
  matcher: [
    '/admin/:path*', // Semua halaman admin
    '/crew/:path*',  // Semua halaman crew (NEW)
    '/login',        // Halaman login
  ],
}