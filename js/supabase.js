import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Trage hier deine echten Supabase-Daten aus dem Dashboard ein:
const SUPABASE_URL = 'https://kybwdpvofdlmicnmgunc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rmE9t5ksGZA7L9EisASZjQ_otj9UKhc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
