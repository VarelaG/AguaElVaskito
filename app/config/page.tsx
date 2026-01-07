'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Cog8ToothIcon, ArrowLeftIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';

export default function ConfigPage() {
  const [precios, setPrecios] = useState({ precio_12l: 0, precio_20l: 0 });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const leerPrecios = async () => {
      const { data } = await supabase.from('configuracion').select('*').single();
      if (data) setPrecios({ precio_12l: data.precio_12l, precio_20l: data.precio_20l });
    };
    leerPrecios();
  }, []);

  const actualizarPrecios = async () => {
    setGuardando(true);
    const { error } = await supabase.from('configuracion').update(precios).eq('id', 1);
    setGuardando(false);
    if (!error) alert("✅ Precios actualizados correctamente");
    else alert("❌ Error: " + error.message);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-32">
      <header className="mb-8 mt-4 flex items-center gap-4">
        <Link href="/" className="p-2 bg-white rounded-full shadow-sm text-gray-400">
            <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configuración</h1>
      </header>
      
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-100/30 border border-blue-50">
        <div className="flex items-center gap-3 mb-8">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                <Cog8ToothIcon className="h-6 w-6 animate-spin-slow" />
            </div>
            <div>
                <h2 className="font-bold text-gray-800">Precios de Venta</h2>
                <p className="text-xs text-gray-400">Afecta a todos los registros nuevos.</p>
            </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Bidón 12 Litros</label>
            <div className="relative">
                <span className="absolute left-4 top-4 text-gray-400 font-bold">$</span>
                <input 
                    type="number" 
                    value={precios.precio_12l} 
                    onChange={(e) => setPrecios({...precios, precio_12l: Number(e.target.value)})}
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 rounded-2xl font-black text-xl text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 uppercase mb-2 ml-1">Bidón 20 Litros</label>
            <div className="relative">
                <span className="absolute left-4 top-4 text-gray-400 font-bold">$</span>
                <input 
                    type="number" 
                    value={precios.precio_20l} 
                    onChange={(e) => setPrecios({...precios, precio_20l: Number(e.target.value)})}
                    className="w-full pl-10 pr-4 py-4 bg-gray-50 rounded-2xl font-black text-xl text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
            </div>
          </div>

          <button 
            onClick={actualizarPrecios} 
            disabled={guardando}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 ${
                guardando ? 'bg-gray-300' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
            }`}
          >
            {guardando ? 'GUARDANDO...' : 'GUARDAR PRECIOS'}
          </button>
        </div>
      </div>
    </main>
  );
}