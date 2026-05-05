import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Pages reachable without an active session. The two `forgot/reset`
// routes belong here even though they involve auth flows — they're
// the *recovery path* for users who can't sign in normally
// (e.g. signed up via Google OAuth originally and now want a password).
const PUBLIC_PATHS = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/callback',
  '/auth/reset-password',
]
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

  // RECOVERY-SESSION CHECK — runs before the regular "authenticated
  // → bounce off auth pages" rule below. If the user is in a
  // password-recovery session (i.e. clicked an email reset link and
  // we marked their `user_metadata.password_reset_pending = true`
  // on the reset-password page), they must complete the flow before
  // accessing anything else. Without this guard, the recovery
  // session is identical to a normal one — clicking the link alone
  // would grant full access, which is the security hole this fixes.
  //
  // Allowed exceptions while pending:
  //   - /auth/reset-password (the page itself; redirecting here
  //     would cause a loop).
  //   - /login (so the user has an escape hatch if they want to
  //     sign out and bail; our `signOut` handler also routes here).
  //   - / (marketing landing — already a safe public surface).
  const isResetPending =
    user?.user_metadata?.password_reset_pending === true
  if (
    user &&
    isResetPending &&
    !pathname.startsWith('/auth/reset-password') &&
    pathname !== '/login' &&
    pathname !== '/'
  ) {
    return NextResponse.redirect(new URL('/auth/reset-password', request.url))
  }

  // Authenticated → redirect away from auth pages (but not the landing
  // page, and not the password reset route — a user might already
  // have a session AND need to set a password (e.g. Google-OAuth-only
  // signups adding a password later via the recovery flow). Bouncing
  // them off `/auth/reset-password` would break that path.
  if (
    user &&
    isPublic &&
    pathname !== '/' &&
    !pathname.startsWith('/auth/reset-password')
  ) {
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
