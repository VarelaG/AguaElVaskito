'use client';
import { useEffect, useState } from 'react';
import { db } from '../lib/db';
import { Cog8ToothIcon, ArrowLeftIcon, CurrencyDollarIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { useLiveQuery } from 'dexie-react-hooks';

export default function ConfigPage() {
  const configActual = useLiveQuery(() => db.configuracion.toArray());
  const [precios, setPrecios] = useState({ precio_12l: 0, precio_20l: 0 });
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (configActual && configActual.length > 0) {
      setPrecios({ 
        precio_12l: configActual[0].precio_12l || 0, 
        precio_20l: configActual[0].precio_20l || 0 
      });
    }
  }, [configActual]);

  const actualizarPrecios = async () => {
    setGuardando(true);
    try {
      let configId = configActual && configActual.length > 0 ? configActual[0].id : null;
      let isNew = false;
      
      // Si no existe configuración, creamos una con UUID nuevo
      if (!configId) {
        configId = crypto.randomUUID();
        isNew = true;
      }

      const nuevaConfig = { id: configId, ...precios };

      // 1. Guardar o actualizar en local
      if (isNew) {
        await db.configuracion.add(nuevaConfig);
      } else {
        await db.configuracion.update(configId, precios);
      }

      // 2. Enviar a la cola para sincronizar (el sync inyectará el empresa_id en los INSERTs)
      await db.mutation_queue.add({
        table: 'configuracion',
        type: isNew ? 'INSERT' : 'UPDATE',
        payload: nuevaConfig,
        status: 'pending',
        created_at: Date.now(),
        retries: 0
      });

      // 3. Traer todos los clientes locales que deban plata para recalcular su deuda
      const clientes = await db.clientes.filter(c => c.deuda_12l > 0 || c.deuda_20l > 0).toArray();
      
      for (const cliente of clientes) {
        const nuevaDeudaTotal = (cliente.deuda_12l * precios.precio_12l) + (cliente.deuda_20l * precios.precio_20l);
        
        // Actualizar local
        await db.clientes.update(cliente.id, { deuda_total: nuevaDeudaTotal });
        
        // Enviar repetición a la cola
        await db.mutation_queue.add({
          table: 'clientes',
          type: 'UPDATE',
          payload: { id: cliente.id, deuda_total: nuevaDeudaTotal },
          status: 'pending',
          created_at: Date.now(),
          retries: 0
        });
      }

      alert("✅ Precios actualizados y guardados.");
    } catch (error: any) {
      alert("❌ Error al guardar en local: " + error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-black p-6 pb-32">
      <header className="mb-8 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-2 bg-white dark:bg-neutral-800 rounded-full shadow-sm text-gray-400 dark:text-gray-200">
            <ArrowLeftIcon className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Configuración</h1>
        </div>
        <ThemeToggle />
      </header>

      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-xl shadow-blue-100/30 dark:shadow-none border border-blue-50 dark:border-neutral-800">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
            <Cog8ToothIcon className="h-6 w-6 animate-spin-slow" />
          </div>
          <div>
            <h2 className="font-bold text-gray-800 dark:text-white">Precios de Venta</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500">Afecta a todos los registros nuevos.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 ml-1">Bidón 12 Litros</label>
            <div className="relative">
              <span className="absolute left-4 top-4 text-gray-400 dark:text-gray-500 font-bold">$</span>
              <input
                type="number"
                value={precios.precio_12l}
                onChange={(e) => setPrecios({ ...precios, precio_12l: Number(e.target.value) })}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl font-black text-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 ml-1">Bidón 20 Litros</label>
            <div className="relative">
              <span className="absolute left-4 top-4 text-gray-400 dark:text-gray-500 font-bold">$</span>
              <input
                type="number"
                value={precios.precio_20l}
                onChange={(e) => setPrecios({ ...precios, precio_20l: Number(e.target.value) })}
                className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl font-black text-xl text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
          </div>

          <button
            onClick={actualizarPrecios}
            disabled={guardando}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 ${guardando ? 'bg-gray-300' : 'bg-blue-600 text-white shadow-blue-200 hover:bg-blue-700'
              }`}
          >
            {guardando ? 'GUARDANDO...' : 'GUARDAR PRECIOS'}
          </button>
        </div>
      </div>
    </main>
  );
}