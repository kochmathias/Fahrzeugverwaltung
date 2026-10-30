import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Trage hier deine echten Supabase-Daten aus dem Dashboard ein:
const SUPABASE_URL = 'https://kybwdpvofdlmicnmgunc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5YndkcHZvZmRsbWljbm1ndW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMjk2NDMsImV4cCI6MjEwODkwNTY0M30.xt2Ed2avwkykUqn7EUCPCbC3opgDpYSAt4v3f92FJ9k';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
