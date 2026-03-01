import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || ''

// Create a single supabase client for interacting with your database in the browser
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
