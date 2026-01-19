'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircleIcon, ClockIcon, CurrencyDollarIcon, BeakerIcon } from '@heroicons/react/24/solid';

interface ActividadReciente {
  monto_deuda: number;
  monto_pagado: number;
  pago_realizado: boolean;
  fecha: string;
  clientes: { nombre: string } | null;
}

export default function ResumenPage() {
  const [totalDeudaCalle, setTotalDeudaCalle] = useState(0);
  const [totalEnvasesCalle, setTotalEnvasesCalle] = useState(0); // Total físico
  const [cobradoHoy, setCobradoHoy] = useState(0);
  const [actividad, setActividad] = useState<ActividadReciente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);

      // 1. Deuda Total y Stock de Envases
      const { data: clientesData } = await supabase.from('clientes').select('deuda_total, envases_12l, envases_20l');
      const deudaTotal = clientesData?.reduce((acc, c) => acc + Number(c.deuda_total), 0) || 0;
      const envasesTotal = clientesData?.reduce((acc, c) => acc + (c.envases_12l || 0) + (c.envases_20l || 0), 0) || 0;

      setTotalDeudaCalle(deudaTotal);
      setTotalEnvasesCalle(envasesTotal);

      // 2. Cobrado Hoy
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const { data: entregasHoy } = await supabase.from('entregas').select('monto_pagado').gte('fecha', hoy.toISOString());
      const recaudacionDia = entregasHoy?.reduce((acc, e) => acc + (Number(e.monto_pagado) || 0), 0) || 0;
      setCobradoHoy(recaudacionDia);

      // 3. Actividad reciente con hora
      const { data: entregasData } = await supabase
        .from('entregas')
        .select(`monto_deuda, monto_pagado, pago_realizado, fecha, clientes ( nombre )`)
        .order('fecha', { ascending: false })
        .limit(20);

      if (entregasData) {
        const filtradas = entregasData
          .filter((e: any) => e.monto_pagado > 0 || e.monto_deuda > 0)
          .slice(0, 5);
        setActividad(filtradas as any);
      }
      setCargando(false);
    };

    cargarDatos();
  }, []);

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-black p-6 pb-32">
      <header className="mb-8 mt-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-neutral-800 dark:text-neutral-100 tracking-tight">¡Hola, Vasko!</h1>
          <p className="text-neutral-500 dark:text-neutral-400 text-sm mt-1 font-medium">Control de activos y caja.</p>
        </div>
        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black shadow-lg">V</div>
      </header>

      {/* Dinero */}
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-xl shadow-blue-100/40 dark:shadow-none border border-white dark:border-neutral-800 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200 dark:shadow-none">
            <CurrencyDollarIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Deuda Total Pesos</p>
        </div>
        <h2 className="text-5xl font-black text-neutral-800 dark:text-white tracking-tighter">${totalDeudaCalle.toLocaleString()}</h2>
        <div className="mt-6 p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-3xl border border-emerald-100 dark:border-emerald-800/50 flex justify-between items-center">
          <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 uppercase tracking-widest">Cobrado Hoy</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">${cobradoHoy.toLocaleString()}</span>
        </div>
      </div>

      {/* Envases Físicos */}
      <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-[2rem] border border-amber-100 dark:border-amber-800/50 flex justify-between items-center mb-10 shadow-sm">
        <div className="flex items-center gap-3">
          <BeakerIcon className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-[10px] font-black text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-0.5">Bidones en la calle</p>
            <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Total acumulado físico</p>
          </div>
        </div>
        <span className="text-4xl font-black text-amber-600 dark:text-amber-500">{totalEnvasesCalle} <small className="text-xs">u.</small></span>
      </div>

      {/* Actividad Reciente con Hora */}
      <section>
        <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-200 mb-6 px-2">Actividad Reciente</h3>
        <div className="space-y-4">
          {actividad.map((item, index) => (
            <div key={index} className="bg-white dark:bg-neutral-900 rounded-[2rem] p-5 shadow-sm border border-neutral-50 dark:border-neutral-800 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${item.pago_realizado ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'}`}>
                  {item.pago_realizado ? <CheckCircleIcon className="h-6 w-6" /> : <ClockIcon className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className="font-black text-neutral-700 dark:text-neutral-200 text-sm uppercase leading-tight">{item.clientes?.nombre}</h4>
                  <p className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 mt-1">
                    {new Date(item.fecha).toLocaleDateString()} - {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`font-black text-lg block ${item.pago_realizado ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-rose-400'}`}>
                  ${(item.pago_realizado ? item.monto_pagado : item.monto_deuda).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}