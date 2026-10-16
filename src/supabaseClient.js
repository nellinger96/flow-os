import { createClient } from '@supabase/supabase-js'

// Production values are the fallback so existing builds keep working.
// For local development, .env.development.local points at the local test
// database (see `npx supabase start`), so `npm run dev` never touches live data.
const PROD_URL = 'https://xtydncextvkyvefrhsvl.supabase.co'
const PROD_KEY = 'sb_publishable_tyyvhYoRSNAWoGCfOLOUjA_JAu3h2bZ'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || PROD_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || PROD_KEY

export const isTestDatabase = supabaseUrl !== PROD_URL

export const supabase = createClient(supabaseUrl, supabaseKey)
