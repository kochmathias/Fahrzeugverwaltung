import { supabase } from './supabase.js';

export async function checkAuth() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Auth Session Fehler:', error);
      return null;
    }
    return session ? session.user : null;
  } catch (err) {
    console.error('Fehler in checkAuth:', err);
    return null;
  }
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
  window.location.hash = '#/login';
}
