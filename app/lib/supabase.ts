import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  cookieOptions: {
    // Forzamos a que la cookie dure 1 año (en segundos)
    maxAge: 60 * 60 * 24 * 365, 
    path: '/',
    sameSite: 'lax',
    // Secure: true es automático en HTTPS, pero podés dejarlo por defecto
  },
  // Esto asegura que se use una sola instancia del cliente en el navegador
  isSingleton: true, 
});