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
        .limit(5);

      if (entregasData) setActividad(entregasData as any);
      setCargando(false);
    };

    cargarDatos();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6 pb-32">
      <header className="mb-8 mt-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">¡Hola, Vasko!</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Control de activos y caja.</p>
        </div>
        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black shadow-lg">V</div>
      </header>

      {/* Dinero */}
      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-100/40 border border-white mb-6">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200">
            <CurrencyDollarIcon className="h-5 w-5" />
          </div>
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Deuda Total Pesos</p>
        </div>
        <h2 className="text-5xl font-black text-slate-800 tracking-tighter">${totalDeudaCalle.toLocaleString()}</h2>
        <div className="mt-6 p-4 bg-emerald-50 rounded-3xl border border-emerald-100 flex justify-between items-center">
          <span className="text-xs font-black text-emerald-700 uppercase tracking-widest">Cobrado Hoy</span>
          <span className="text-xl font-black text-emerald-600">${cobradoHoy.toLocaleString()}</span>
        </div>
      </div>

      {/* Envases Físicos */}
      <div className="p-6 bg-amber-50 rounded-[2rem] border border-amber-100 flex justify-between items-center mb-10 shadow-sm">
        <div className="flex items-center gap-3">
          <BeakerIcon className="h-8 w-8 text-amber-500" />
          <div>
            <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest mb-0.5">Bidones en la calle</p>
            <p className="text-sm font-bold text-amber-600">Total acumulado físico</p>
          </div>
        </div>
        <span className="text-4xl font-black text-amber-600">{totalEnvasesCalle} <small className="text-xs">u.</small></span>
      </div>

      {/* Actividad Reciente con Hora */}
      <section>
        <h3 className="text-lg font-black text-slate-800 mb-6 px-2">Actividad Reciente</h3>
        <div className="space-y-4">
          {actividad.map((item, index) => (
            <div key={index} className="bg-white rounded-[2rem] p-5 shadow-sm border border-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${item.pago_realizado ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                  {item.pago_realizado ? <CheckCircleIcon className="h-6 w-6" /> : <ClockIcon className="h-6 w-6" />}
                </div>
                <div>
                  <h4 className="font-black text-slate-700 text-sm uppercase leading-tight">{item.clientes?.nombre}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">
                    {new Date(item.fecha).toLocaleDateString()} - {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`font-black text-lg block ${item.pago_realizado ? 'text-emerald-600' : 'text-red-600'}`}>
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