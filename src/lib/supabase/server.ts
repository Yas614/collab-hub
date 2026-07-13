import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables in .env.local')
}

// Use this client ONLY inside Server Components, Server Actions, or Route Handlers.
// It reads the auth session from the incoming request's cookies, so
// supabase.auth.getUser() and RLS-protected queries actually work server-side.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // setAll can be called from a Server Component where cookies
          // can't be mutated. Safe to ignore if you have middleware
          // (below) refreshing sessions on every request.
        }
      },
    },
  })
}
