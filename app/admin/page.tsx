'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { BuildingOffice2Icon, PlusIcon, KeyIcon, UserCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// YOUR superadmin email — only this user can access this page
const SUPERADMIN_EMAIL = 'varelag1999@gmail.com';

interface Empresa {
  id: string;
  nombre: string;
  created_at: string;
}

export default function AdminPage() {
  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Form state
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [emailUsuario, setEmailUsuario] = useState('');
  const [passwordUsuario, setPasswordUsuario] = useState('');

  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);
  const [empEmail, setEmpEmail] = useState('');
  const [empPass, setEmpPass] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email === SUPERADMIN_EMAIL) {
      setAuthorized(true);
      loadEmpresas();
    } else {
      setAuthorized(false);
    }
  };

  const loadEmpresas = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/admin/empresas', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const result = await res.json();
      if (result.empresas) setEmpresas(result.empresas);
    } catch (err) {
      console.error('Error cargando empresas:', err);
    }
  };

  const agregarEmpleado = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpresa) return;
    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/crear-empleado', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ empresa_id: selectedEmpresa, email: empEmail, password: empPass })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      
      alert('Repartidor creado con éxito para esta empresa!');
      setSelectedEmpresa(null);
      setEmpEmail('');
      setEmpPass('');
    } catch(err: any) {
       alert('❌ ' + err.message);
    } finally {
       setLoading(false);
    }
  };

  const crearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/crear-empresa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombreEmpresa.trim(),
          email: emailUsuario.trim(),
          password: passwordUsuario,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Error desconocido');
      }

      setSuccess(`✅ Empresa "${nombreEmpresa}" creada. El usuario ${emailUsuario} ya puede entrar.`);
      setNombreEmpresa('');
      setEmailUsuario('');
      setPasswordUsuario('');
      loadEmpresas();

    } catch (err: any) {
      setError(`❌ ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (authorized === null) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white font-bold">Verificando acceso...</div>;
  }

  if (authorized === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <p className="text-rose-500 font-black text-xl mb-2">Acceso Denegado</p>
          <p className="text-neutral-500 text-sm">Esta área es solo para el administrador del sistema.</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-950 text-white p-6 pb-20">
      <header className="mb-10 mt-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-600 p-2.5 rounded-2xl">
            <KeyIcon className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">Panel Superadmin</h1>
            <p className="text-neutral-500 text-xs font-medium">Gestión de empresas y accesos</p>
          </div>
        </div>
      </header>

      {/* Form: Nueva Empresa */}
      <section className="bg-neutral-900 rounded-3xl p-6 border border-neutral-800 mb-8">
        <div className="flex items-center gap-2 mb-6">
          <BuildingOffice2Icon className="h-5 w-5 text-blue-400" />
          <h2 className="font-black text-sm uppercase tracking-widest text-neutral-300">Alta Nueva Empresa</h2>
        </div>

        <form onSubmit={crearEmpresa} className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Nombre de la Empresa</label>
            <input required value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} placeholder="Ej: Agua Pura San Martín" className="w-full bg-neutral-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-600 font-bold" />
          </div>
          <div>
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Email del Dueño</label>
            <input required type="email" value={emailUsuario} onChange={e => setEmailUsuario(e.target.value)} placeholder="dueño@empresa.com" className="w-full bg-neutral-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-600 font-bold" />
          </div>
          <div>
            <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Contraseña Inicial</label>
            <input required type="password" value={passwordUsuario} onChange={e => setPasswordUsuario(e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} className="w-full bg-neutral-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 placeholder:text-neutral-600 font-bold" />
          </div>

          {error && <p className="text-rose-400 text-sm font-bold bg-rose-900/20 p-3 rounded-2xl">{error}</p>}
          {success && <p className="text-emerald-400 text-sm font-bold bg-emerald-900/20 p-3 rounded-2xl">{success}</p>}

          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2">
            {loading ? 'Creando...' : <><PlusIcon className="h-4 w-4" /> Crear Empresa y Usuario</>}
          </button>
        </form>
      </section>

      {/* Lista de Empresas */}
      <section>
        <h3 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-4">
          Empresas Activas ({empresas.length})
        </h3>
        <div className="space-y-3">
          {empresas.map(emp => (
            <div key={emp.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-blue-900/50 p-2 rounded-xl">
                  <UserCircleIcon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="font-black text-sm text-white">{emp.nombre}</p>
                  <p className="text-[10px] text-neutral-500 font-medium">
                    Alta: {new Date(emp.created_at).toLocaleDateString('es-AR')}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedEmpresa(emp.id)} className="text-xs font-black bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 px-4 py-2 rounded-xl border border-blue-900/50 transition">
                + Repartidor
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Repartidor Modal */}
      {selectedEmpresa && (
        <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center p-6 z-50 fade-in">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="font-black text-xl text-white mb-2 tracking-tight">Agregar Repartidor</h3>
            <p className="text-neutral-500 text-xs font-medium mb-6">Esta cuenta se unirá a la empresa y compartirá su base de datos.</p>
            <form onSubmit={agregarEmpleado} className="space-y-4">
               <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Email del nuevo usuario</label>
                  <input type="email" required placeholder="email@reparto.com" value={empEmail} onChange={e=>setEmpEmail(e.target.value)} className="w-full bg-neutral-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <div>
                  <label className="text-[10px] font-black text-neutral-500 uppercase tracking-widest block mb-1">Contraseña</label>
                  <input type="text" required placeholder="Reparto123" minLength={6} value={empPass} onChange={e=>setEmpPass(e.target.value)} className="w-full bg-neutral-800 text-white p-4 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500" />
               </div>
               <div className="flex gap-3 mt-4">
                  <button type="button" onClick={() => setSelectedEmpresa(null)} className="w-full bg-neutral-800 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-neutral-700 transition">Cancelar</button>
                  <button type="submit" disabled={loading} className="w-full bg-blue-600 disabled:bg-blue-900 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition">Guardar</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
