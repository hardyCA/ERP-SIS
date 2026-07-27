import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

function missingEnvVars() {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co')
}

export async function createClient() {
  if (missingEnvVars()) {
    throw new Error('Supabase environment variables not configured')
  }

  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
