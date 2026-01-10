'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { CheckCircleIcon, ClockIcon, CurrencyDollarIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/solid';

interface ActividadReciente {
  monto_deuda: number;
  monto_pagado: number;
  pago_realizado: boolean;
  fecha: string;
  clientes: { nombre: string } | null;
}

export default function ResumenPage() {
  const [totalDeudaCalle, setTotalDeudaCalle] = useState(0);
  const [cobradoHoy, setCobradoHoy] = useState(0);
  const [porcentajeCobro, setPorcentajeCobro] = useState(100);
  const [actividad, setActividad] = useState<ActividadReciente[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setCargando(true);

      // 1. Deuda Total Histórica (Lo que falta cobrar en total)
      const { data: clientesData } = await supabase.from('clientes').select('deuda_total');
      const deudaTotalAcumulada = clientesData?.reduce((acc, c) => acc + Number(c.deuda_total), 0) || 0;
      setTotalDeudaCalle(deudaTotalAcumulada);

      // 2. Cobrado Hoy (Dinero real que entró hoy al bolsillo)
      // Usamos el inicio del día en formato ISO para filtrar bien
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);

      const { data: entregasHoy } = await supabase
        .from('entregas')
        .select('monto_pagado')
        .gte('fecha', hoy.toISOString());

      const recaudacionDia = entregasHoy?.reduce((acc, e) => acc + (Number(e.monto_pagado) || 0), 0) || 0;
      setCobradoHoy(recaudacionDia);

      // 3. Porcentaje de Salud (Dinero en mano vs Dinero total esperado)
      // % = (Cobrado Hoy) / (Cobrado Hoy + Deuda Pendiente)
      const baseTotal = recaudacionDia + deudaTotalAcumulada;
      const perc = baseTotal > 0 ? Math.round((recaudacionDia / baseTotal) * 100) : 100;
      setPorcentajeCobro(perc);

      // 4. Actividad reciente
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
    <main className="min-h-screen bg-gray-50 p-6 pb-32">
      <header className="mb-8 mt-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Hola, Vasko!</h1>
          <p className="text-gray-500 text-sm mt-1">Resumen de actividad real.</p>
        </div>
        <div className="h-10 w-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">V</div>
      </header>

      <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-100/50 border border-blue-50 relative overflow-hidden mb-10">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 w-64 h-64 bg-gradient-to-br from-blue-50 to-blue-100/20 rounded-full blur-3xl opacity-70 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-md shadow-blue-200">
              <CurrencyDollarIcon className="h-5 w-5" />
            </div>
            <p className="text-sm font-bold text-gray-600 uppercase tracking-wider">Deuda Total en la Calle</p>
          </div>

          <div className="flex justify-between items-end mt-2">
            <div>
              <h2 className="text-6xl font-extrabold text-gray-900 tracking-tighter leading-none">
                ${totalDeudaCalle.toLocaleString()}
              </h2>
              <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 px-4 py-2 rounded-full text-blue-700 text-sm font-bold">
                <ArrowTrendingUpIcon className="h-4 w-4" />
                <span>Hoy cobraste: ${cobradoHoy.toLocaleString()}</span>
              </div>
            </div>

            {/* Gráfico Circular Dinámico */}
            <div className="flex flex-col items-center justify-center ml-4">
              <div className="relative w-28 h-28 flex items-center justify-center rounded-full border-[8px] border-blue-50/80 bg-white shadow-inner">
                {/* El borde azul solo se completa según el porcentaje */}
                <div
                  className="absolute top-0 left-0 w-full h-full rounded-full border-[8px] border-blue-600 border-t-transparent border-l-transparent transition-all duration-1000"
                  style={{ transform: `rotate(${(porcentajeCobro * 3.6) - 45}deg)` }}
                ></div>
                <div className="text-center z-10">
                  <span className="text-3xl font-black text-blue-900 block leading-none">{porcentajeCobro}%</span>
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wide">Cobrado</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section>
        <h3 className="text-lg font-bold text-gray-900 mb-6 px-2">Actividad Reciente</h3>
        <div className="space-y-4">
          {cargando ? (
            <p className="text-center text-gray-400 py-10">Cargando datos...</p>
          ) : actividad.map((item, index) => (
            <div key={index} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-5">
                <div className={`p-4 rounded-2xl shadow-sm ${item.pago_realizado ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
                  {item.pago_realizado ? <CheckCircleIcon className="h-7 w-7" /> : <ClockIcon className="h-7 w-7" />}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 text-[15px] mb-1">{item.clientes?.nombre || 'Cliente'}</h4>
                  <p className="text-xs font-medium text-gray-400">
                    {new Date(item.fecha).toLocaleDateString()} - {new Date(item.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className={`font-black text-xl block ${item.pago_realizado ? 'text-teal-700' : 'text-gray-900'}`}>
                  ${item.pago_realizado ? item.monto_pagado : item.monto_deuda}
                </span>
                <p className={`text-[10px] font-bold uppercase mt-1 ${item.pago_realizado ? 'text-teal-500' : 'text-rose-400'}`}>
                  {item.pago_realizado ? 'Cobrado' : 'Deuda'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}