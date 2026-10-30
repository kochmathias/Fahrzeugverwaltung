import { supabase } from './supabase.js';

export async function getCurrentUser() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;
    
    const user = session.user;
    
    // Profil sicher und fehlerfrei laden
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();
      
    return { ...user, profile: profile || { rolle: 'user' } };
  } catch (err) {
    console.warn('Fehler in getCurrentUser:', err);
    return null;
  }
}

export async function loginUser(identifier, password) {
  let email = identifier.trim();
  
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
  await supabase.auth.signOut();
  window.location.reload();
}
