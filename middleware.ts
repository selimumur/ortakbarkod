import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Response ve Request Hazırlığı
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Supabase İstemcisini Oluştur (Cookie Okuma Yetkisiyle)
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

  // 3. Kullanıcı Oturumunu Kontrol Et
  const { data: { user } } = await supabase.auth.getUser()

  // 4. KURAL: Kullanıcı YOKSA ve Korunan Sayfadaysa -> LOGIN'e At
  if (!user && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 5. KURAL: Kullanıcı VARSA ve Login Sayfasındaysa -> DASHBOARD'a At
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

// Hangi sayfalarda çalışacak?
export const config = {
  matcher: [
    /*
     * Aşağıdakiler HARİÇ tüm yollarda çalışsın:
     * - _next/static (resimler vs)
     * - _next/image
     * - favicon.ico
     * - api klasörü (opsiyonel)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}