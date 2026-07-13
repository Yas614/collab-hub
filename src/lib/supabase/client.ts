import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables in .env.local')
}

// Use this client ONLY inside files that start with "use client".
// It reads/writes the auth session via browser storage + cookies.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
