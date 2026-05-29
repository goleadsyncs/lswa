import { createClient } from '@supabase/supabase-js';

if (!process.env.SUPABASE_URL) {
  console.warn('[LSWA] SUPABASE_URL not set — database features disabled');
}

const supabase = process.env.SUPABASE_URL
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

export default supabase;
