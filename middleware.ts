import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Two flavours of "public" path:
//
//   - `AUTH_PUBLIC_PATHS` are pages a *signed-out* user can hit but
//     a *signed-in* user has no business on (login / signup / the
//     password recovery path). Visiting one of these while logged in
//     should bounce to `/hub/home`.
//
//   - `UNIVERSAL_PUBLIC_PATHS` are pages anyone can read regardless
//     of auth state (landing page + legal pages). These DO NOT
//     bounce a logged-in visitor; the user gets the page they asked
//     for.
//
// Splitting the two lists is what fixes the previous bug where
// hitting `/terms` while logged in redirected to `/hub/home` —
// `/terms` was lumped in with the auth-flow paths and got the
// authenticated-redirect treatment.
const AUTH_PUBLIC_PATHS = [
  '/login',
  '/signup',
  '/forgot-password',
  '/auth/callback',
  '/auth/reset-password',
]
const UNIVERSAL_PUBLIC_PATHS = [
  '/',
  '/terms',
  '/privacy',
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

  // Match against both lists for the "is this path public at all"
  // check; only `AUTH_PUBLIC_PATHS` participates in the
  // authenticated-bounce decision below. `/` is matched exactly
  // (every path technically starts with it); legal + auth paths
  // match by `startsWith` so future sub-routes work too (e.g.
  // `/terms/changelog`).
  const matchesPath = (p: string) =>
    p === '/' ? pathname === '/' : pathname.startsWith(p)
  const isAuthPublic = AUTH_PUBLIC_PATHS.some(matchesPath)
  const isUniversalPublic = UNIVERSAL_PUBLIC_PATHS.some(matchesPath)
  const isPublic = isAuthPublic || isUniversalPublic

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

  // Authenticated → redirect away from AUTH-flow pages only
  // (login / signup / forgot-password / auth callback). Universal
  // public paths (`/`, `/terms`, `/privacy`) are deliberately
  // excluded so a logged-in user can still read them.
  //
  // `/auth/reset-password` is also excluded from the bounce — a
  // user might already have a session AND need to set a password
  // (e.g. Google-OAuth-only signup adding a password via the
  // recovery flow). Bouncing them off would break that path.
  if (
    user &&
    isAuthPublic &&
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
