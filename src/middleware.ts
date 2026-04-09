import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/auth/callback']
const DEFAULT_AUTHENTICATED = '/hub/home'
const DEFAULT_UNAUTHENTICATED = '/login'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  let user = null
  try {
    const { data } = await supabase.auth.getUser()
    user = data.user
  } catch {
    // Edge runtime error — fail open so the page can handle it
  }

  const isPublic = PUBLIC_PATHS.some(p => (p === '/' ? pathname === '/' : pathname.startsWith(p)))

  // Unauthenticated → redirect to login
  if (!user && !isPublic) {
    return NextResponse.redirect(new URL(DEFAULT_UNAUTHENTICATED, request.url))
  }

  // Authenticated → redirect away from auth pages (but not the landing page)
  if (user && isPublic && pathname !== '/') {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED, request.url))
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static, _next/image (Next.js internals)
     * - favicon.ico, public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
