'use client';

import { useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // <-- Importación agregada

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Inicializamos el cliente de Supabase para el navegador
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log("Intentando ingresar con:", email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("Error de Supabase:", error.message);
        alert("Error al entrar: " + error.message);
        setLoading(false);
        return;
      }

      if (data?.session) {
        console.log("Login exitoso, redirigiendo...");
        window.location.href = '/';
      } else {
        alert("No se pudo iniciar sesión. Verificá que el usuario esté confirmado en Supabase.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error crítico:", err);
      alert("Ocurrió un error inesperado al intentar loguear.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-[40px] shadow-2xl shadow-blue-100 border border-gray-100">
        
        {/* Logo e Imagen - SECCIÓN MODIFICADA */}
        <div className="text-center mb-8">
          {/* Reemplazo de la "V" por la imagen */}
          <div className="flex justify-center mb-4">
            <Image
              src="/icon-512.png"
              alt="Logo El Vaskito"
              width={96} 
              height={96}
              className="rounded-[5rem] shadow-xl shadow-blue-100"
              priority
            />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            EL VASKITO <span className="text-blue-600 italic">AUTH</span>
          </h1>
          <p className="text-gray-400 text-sm font-medium">Gestión de Reparto y Clientes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Email del Administrador</label>
            <input 
              type="email" 
              required
              placeholder="admin@vaskito.com" 
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="text-[10px] font-black text-gray-400 uppercase ml-2 mb-1 block">Contraseña</label>
            <input 
              type="password" 
              required
              placeholder="••••••••" 
              className="w-full p-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-blue-500 focus:bg-white outline-none transition-all font-bold text-gray-700"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className={`w-full py-5 ${loading ? 'bg-gray-400' : 'bg-blue-600'} text-white font-black rounded-2xl shadow-xl shadow-blue-100 active:scale-95 transition-all mt-4 tracking-widest text-xs`}
          >
            {loading ? 'INGRESANDO...' : 'ENTRAR AL PANEL'}
          </button>
        </form>

        <p className="text-center mt-8 text-[10px] text-gray-300 font-bold uppercase tracking-widest">
          Sistema Privado - Acceso Restringido
        </p>
      </div>
    </div>
  );
}