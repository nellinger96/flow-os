import { createClient } from '@supabase/supabase-js'

// 1. Go to your Supabase Dashboard
// 2. Click "Project Settings" (Gear icon at very bottom left)
// 3. Click "API"
// 4. Paste the "Project URL" inside the first quotes below
// 5. Paste the "anon / public" Key inside the second quotes below

const supabaseUrl = 'https://xtydncextvkyvefrhsvl.supabase.co'
const supabaseKey = 'sb_publishable_tyyvhYoRSNAWoGCfOLOUjA_JAu3h2bZ'

export const supabase = createClient(supabaseUrl, supabaseKey)