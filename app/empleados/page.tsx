'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UsersIcon, ArrowLeftIcon, PlusIcon, BoltIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';

interface Empleado {
  user_id: string;
  email: string;
  rol: string;
}

export default function EmpleadosPage() {
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarEmpleados = async () => {
    try {
      setCargando(true);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("No hay sesión");

      const res = await fetch('/api/empleados', {
        headers: { Authorization: `Bearer ${session.session.access_token}` }
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setEmpleados(data.empleados || []);
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEmpleados();
  }, []);

  const crearEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("No hay sesión");

      const res = await fetch('/api/empleados', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}` 
        },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      alert("✅ Repartidor creado con éxito!");
      setMostrarForm(false);
      setEmail('');
      setPassword('');
      cargarEmpleados();
    } catch (error: any) {
      alert("❌ Error: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-black p-6 pb-32">
      <header className="mb-8 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/config" className="p-2 bg-white dark:bg-neutral-800 rounded-full shadow-sm text-gray-400 dark:text-gray-200">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Cuentas</h1>
        </div>
        <ThemeToggle />
      </header>

      {/* Listado y Botón Nuevo */}
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-xl shadow-blue-100/30 dark:shadow-none border border-blue-50 dark:border-neutral-800 mb-6">
        <div className="flex items-center justify-between mb-8 cursor-pointer" onClick={() => setMostrarForm(!mostrarForm)}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
              <UsersIcon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="font-bold text-gray-800 dark:text-white">Empleados</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Repartidores trabajando juntas</p>
            </div>
          </div>
          <button className={`p-3 rounded-2xl transition-all shadow-md ${mostrarForm ? 'bg-rose-500 text-white rotate-45' : 'bg-blue-600 text-white'}`}>
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={crearEmpleado} className="space-y-4 mb-8 pt-4 border-t border-gray-100 dark:border-neutral-800">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Email del Repartidor</label>
              <input type="email" required placeholder="repartidor2@vyte.com" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Contraseña</label>
              <input type="text" required placeholder="Reparto123" minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl font-bold outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all text-gray-900 dark:text-white" />
            </div>
            <button disabled={guardando} type="submit" className="w-full py-4 mt-2 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-all text-white font-black text-sm uppercase tracking-widest rounded-2xl shadow-blue-200 shadow-lg disabled:bg-gray-400">
              {guardando ? 'CREANDO...' : 'CREAR REPARTIDOR'}
            </button>
          </form>
        )}

        <div className="space-y-4">
          {cargando ? (
             <p className="text-center text-sm font-bold text-gray-400 animate-pulse mt-4">Cargando...</p>
          ) : empleados.length === 0 ? (
             <p className="text-center text-sm font-bold text-gray-400 mt-4">Ningún repartidor asociado todavía.</p>
          ) : (
            empleados.map(emp => (
              <div key={emp.user_id} className="p-4 rounded-2xl bg-gray-50 dark:bg-neutral-800 flex justify-between items-center border border-transparent dark:border-neutral-700">
                <div className="flex gap-3 items-center truncate min-w-0">
                  <div className="bg-blue-100 shrink-0 dark:bg-blue-900/40 p-2 rounded-xl text-blue-600 dark:text-blue-400">
                    <BoltIcon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-800 dark:text-white text-sm truncate">{emp.email}</h3>
                    <span className="text-[10px] font-black uppercase tracking-wider flex mt-1 items-center gap-1 opacity-70">
                      {emp.rol === 'admin' ? '⭐ Propietario' : '🛵 Repartidor'}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
