import { supabase } from './supabase.js';
import { pseudoEmail } from './utils.js';

export async function loginUser(identifier, password) {
  const email = identifier.includes('@') ? identifier : pseudoEmail(identifier);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  await supabase.auth.signOut();
  window.location.hash = '#/login';
}

export async function getCurrentUser() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  return { ...session.user, profile };
}