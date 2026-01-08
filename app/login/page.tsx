'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert("Error: " + error.message);
    } else {
      router.push('/'); // Redirige al reparto
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
        <h1 className="text-2xl font-black text-gray-900 mb-6 text-center">EL VASKITO <span className="text-blue-600">AUTH</span></h1>
        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="email" placeholder="Email" 
            className="w-full p-4 bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" placeholder="Contraseña" 
            className="w-full p-4 bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg">
            ENTRAR
          </button>
        </form>
      </div>
    </div>
  );
}