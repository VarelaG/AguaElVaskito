'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import FilaCliente from './components/FilaCliente';
import {
  MagnifyingGlassIcon,
  BarsArrowDownIcon,
  ArrowsUpDownIcon,
  UserGroupIcon,
  ArrowRightOnRectangleIcon,
  CircleStackIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<'nombre' | 'deuda' | 'envases'>('nombre');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const fetchClientes = async () => {
      setCargando(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*');

      if (data) setClientes(data);
      setCargando(false);
    };
    fetchClientes();
  }, []);

  // Función para cerrar sesión y limpiar cookies
  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  // Lógica de Filtrado y Ordenamiento
  const clientesProcesados = clientes
    .filter(c => {
      const nombre = (c.nombre ?? "").toLowerCase();
      const direccion = (c.direccion ?? "").toLowerCase();
      const termino = busqueda.toLowerCase();
      return nombre.includes(termino) || direccion.includes(termino);
    })
    .sort((a, b) => {
      if (orden === 'nombre') return (a.nombre ?? "").localeCompare(b.nombre ?? "");
      if (orden === 'deuda') return (b.deuda_total ?? 0) - (a.deuda_total ?? 0);
      if (orden === 'envases') return (b.envases_20l ?? 0) - (a.envases_20l ?? 0);
      return 0;
    });

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black pb-32">
      {/* Header y Buscador Estético */}
      <div className="sticky top-0 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md z-40 border-b border-neutral-100 dark:border-neutral-800 p-4 shadow-sm">

        {/* Cabecera: Título y Botón Salir */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <UserGroupIcon className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-neutral-800 dark:text-white tracking-tight">Planilla de Reparto</h1>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all border border-rose-100 dark:border-rose-900/50"
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4" />
            Cerrar Sesión
          </button>
        </div>

        {/* Buscador */}
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-3 text-neutral-400 dark:text-neutral-500" />
          <input
            type="text"
            placeholder="Buscar por nombre"
            className="text-neutral-700 dark:text-white w-full pl-12 pr-4 py-3 border-none rounded-2xl bg-neutral-100 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none font-medium placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Botones de Ordenamiento */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setOrden('nombre')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${orden === 'nombre' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
              }`}
          >
            <ArrowsUpDownIcon className="h-4 w-4" />
            Nombre A - Z
          </button>
          <button
            onClick={() => setOrden('deuda')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${orden === 'deuda' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
              }`}
          >
            <BarsArrowDownIcon className="h-4 w-4" />
            Mayor Deuda
          </button>
          <button
            onClick={() => setOrden('envases')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all ${orden === 'envases' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 dark:shadow-none' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
              }`}
          >
            <CircleStackIcon className="h-4 w-4 inline mr-2" />
            Envases
          </button>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="p-4 space-y-3">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm font-bold dark:text-white">Cargando libreta...</p>
          </div>
        ) : clientesProcesados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-neutral-400 font-medium">No se encontraron clientes</p>
          </div>
        ) : (
          clientesProcesados.map((cliente) => (
            <FilaCliente
              key={cliente.id}
              id={cliente.id}
              nombre={cliente.nombre}
              direccion={cliente.direccion}
              deuda={cliente.deuda_total}
              deuda12={cliente.deuda_12l}
              deuda20={cliente.deuda_20l}
              envases_12l={cliente.envases_12l}
              envases_20l={cliente.envases_20l}
            />
          ))
        )}
      </div>
    </main>
  );
}