'use client';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import FilaCliente from './components/FilaCliente';
import Image from 'next/image';
import { 
  MagnifyingGlassIcon, 
  BarsArrowDownIcon, 
  ArrowsUpDownIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

export default function Home() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState<'nombre' | 'deuda'>('nombre');
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


// Lógica de Filtrado y Ordenamiento Robusta
const clientesProcesados = clientes
  .filter(c => {
    // Usamos el operador de coalescencia nula (??) para asegurar un string
    const nombre = (c.nombre ?? "").toLowerCase();
    const direccion = (c.direccion ?? "").toLowerCase();
    const termino = busqueda.toLowerCase();

    return nombre.includes(termino) || direccion.includes(termino);
  })
  .sort((a, b) => {
    // Protección también en el ordenamiento
    if (orden === 'nombre') return (a.nombre ?? "").localeCompare(b.nombre ?? "");
    if (orden === 'deuda') return (b.deuda_total ?? 0) - (a.deuda_total ?? 0);
    return 0;
  });

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      {/* Header y Buscador Estético */}
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-40 border-b border-gray-100 p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="bg-blue-600 p-2 rounded-lg">
            <UserGroupIcon className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Planilla de Reparto</h1>
        </div>

        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-3 text-gray-400" />
          <input 
            type="text" 
            placeholder="Buscar por nombre o calle..." 
            className="text-gray-700 w-full pl-12 pr-4 py-3 border-none rounded-2xl bg-gray-100 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none"
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        {/* Botones de Ordenamiento */}
        <div className="flex gap-2 mt-4">
          <button 
            onClick={() => setOrden('nombre')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              orden === 'nombre' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <ArrowsUpDownIcon className="h-4 w-4" />
            A - Z
          </button>
          <button 
            onClick={() => setOrden('deuda')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
              orden === 'deuda' ? 'bg-blue-600 text-white shadow-md shadow-blue-200' : 'bg-gray-100 text-gray-500'
            }`}
          >
            <BarsArrowDownIcon className="h-4 w-4" />
            MAYOR DEUDA
          </button>
        </div>
      </div>

      {/* Lista de Clientes */}
      <div className="p-4 space-y-4">
        {cargando ? (
          <div className="flex flex-col items-center justify-center py-20 opacity-30">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
            <p className="text-sm font-bold">Cargando libreta...</p>
          </div>
        ) : clientesProcesados.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 font-medium">No se encontraron clientes</p>
          </div>
        ) : (
          clientesProcesados.map((cliente) => (
            <FilaCliente 
              key={cliente.id} 
              id={cliente.id} 
              nombre={cliente.nombre} 
              direccion={cliente.direccion}
              deuda={cliente.deuda_total}
              deuda12={cliente.deuda_12l} // Nueva prop
              deuda20={cliente.deuda_20l}
            />
          ))
        )}
      </div>
    </main>
  );
}