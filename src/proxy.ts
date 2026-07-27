import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function hasSupabaseConfig() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next()

  if (!hasSupabaseConfig()) {
    const { pathname } = request.nextUrl
    const publicRoutes = ['/login', '/register', '/recover', '/auth/callback']
    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

    if (!isPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return response
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl
  const publicRoutes = ['/login', '/register', '/recover', '/auth/callback']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))

  if (!session && !isPublicRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (session && isPublicRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
