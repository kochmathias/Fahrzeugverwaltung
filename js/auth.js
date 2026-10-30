import { supabase } from './supabase.js';

export async function getCurrentUser() {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  
  const user = session.user;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();
    
  return { ...user, profile };
}

export async function loginUser(identifier, password) {
  let email = identifier.trim();
  
  // Wenn kein "@" enthalten ist, hängen wir das interne Suffix für Benutzernamen an
  if (!email.includes('@')) {
    email = `${email.toLowerCase()}@kfz-at-user.local`;
  }
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.reload();
}
