'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface FilaProps {
  id: string;
  nombre: string;
  direccion: string;
  deuda: number;
  deuda12: number;
  deuda20: number;
}

export default function FilaCliente({ id, nombre, direccion, deuda, deuda12, deuda20 }: FilaProps) {
  const [cant12, setCant12] = useState(0);
  const [cant20, setCant20] = useState(0);
  const [precios, setPrecios] = useState({ p12: 0, p20: 0 });

  useEffect(() => {
    const fetchPrecios = async () => {
      const { data } = await supabase.from('configuracion').select('*').single();
      if (data) setPrecios({ p12: data.precio_12l, p20: data.precio_20l });
    };
    fetchPrecios();
  }, []);

  const registrarEntrega = async (pago: boolean) => {
  const montoHoy = (cant12 * precios.p12) + (cant20 * precios.p20);
  
  if (cant12 === 0 && cant20 === 0) {
      if (!pago) return alert("Seleccioná bidones para anotar deuda");
      if (pago && deuda === 0) return alert("El cliente ya está al día");
  }

  let nuevaDeudaTotal = deuda;
  let nuevaDeuda12 = deuda12 || 0;
  let nuevaDeuda20 = deuda20 || 0;
  let dineroCobrado = 0;

  if (pago) {
    if (cant12 === 0 && cant20 === 0) {
      dineroCobrado = deuda;
      nuevaDeudaTotal = 0;
      nuevaDeuda12 = 0;
      nuevaDeuda20 = 0;
    } else {
      dineroCobrado = montoHoy;
      nuevaDeudaTotal = Math.max(0, deuda - montoHoy);
      nuevaDeuda12 = Math.max(0, nuevaDeuda12 - cant12);
      nuevaDeuda20 = Math.max(0, nuevaDeuda20 - cant20);
    }
  } else {
    dineroCobrado = 0;
    nuevaDeudaTotal = deuda + montoHoy;
    nuevaDeuda12 = nuevaDeuda12 + cant12;
    nuevaDeuda20 = nuevaDeuda20 + cant20;
  }

  const { error: errorEntrega } = await supabase.from('entregas').insert([{
    cliente_id: id,
    bidon_12l: cant12,
    bidon_20l: cant20,
    pago_realizado: pago,
    monto_deuda: pago ? 0 : montoHoy,
    monto_pagado: dineroCobrado 
  }]);

  const { error: errorCliente } = await supabase.from('clientes').update({ 
    deuda_total: nuevaDeudaTotal,
    deuda_12l: nuevaDeuda12,
    deuda_20l: nuevaDeuda20
  }).eq('id', id);

  if (!errorEntrega && !errorCliente) {
    setCant12(0);
    setCant20(0);
    window.location.reload();
  }
};

  return (
    <div className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 mb-3 flex flex-col md:flex-row md:items-center gap-4 overflow-hidden">
      
      {/* Información del Cliente */}
      <div className="md:w-1/3">
        <h3 className="font-black text-gray-900 uppercase text-sm leading-tight">{nombre}</h3>
        {direccion && <p className="text-xs text-gray-400 font-medium truncate">{direccion}</p>}
        
        <div className="mt-2 flex flex-wrap gap-1">
          {deuda12 > 0 || deuda20 > 0 ? (
            <>
              {deuda12 > 0 && (
                <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded-lg font-black border border-rose-100">
                  DEBE {deuda12} (12L)
                </span>
              )}
              {deuda20 > 0 && (
                <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded-lg font-black border border-rose-100">
                  DEBE {deuda20} (20L)
                </span>
              )}
            </>
          ) : (
            <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-1 rounded-lg font-black border border-teal-100 tracking-wider">
              ✓ AL DÍA
            </span>
          )}
        </div>
      </div>

      {/* Selectores de Cantidad - FIX: Gaps dinámicos para evitar desborde en móvil */}
      <div className="flex flex-1 items-center justify-between md:justify-around bg-gray-50 rounded-2xl p-2 border border-gray-100">
        {/* Bloque 12L */}
        <div className="flex items-center gap-1.5 md:gap-3">
          <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">12L</span>
          <button onClick={() => setCant12(Math.max(0, cant12 - 1))} className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl border shadow-sm font-black text-blue-600 active:scale-90">-</button>
          <span className="text-xl md:text-2xl font-black text-gray-900 w-8 md:w-10 text-center">{cant12}</span>
          <button onClick={() => setCant12(cant12 + 1)} className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl border shadow-sm font-black text-blue-600 active:scale-90">+</button>
        </div>

        {/* Bloque 20L - El pl-2 en móvil evita el desborde */}
        <div className="flex items-center gap-1.5 md:gap-3 border-l-2 border-gray-200 pl-2 md:pl-4">
          <span className="text-[9px] md:text-[10px] font-black text-gray-400 uppercase">20L</span>
          <button onClick={() => setCant20(Math.max(0, cant20 - 1))} className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl border shadow-sm font-black text-blue-600 active:scale-90">-</button>
          <span className="text-xl md:text-2xl font-black text-gray-900 w-8 md:w-10 text-center">{cant20}</span>
          <button onClick={() => setCant20(cant20 + 1)} className="w-9 h-9 md:w-10 md:h-10 bg-white rounded-xl border shadow-sm font-black text-blue-600 active:scale-90">+</button>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="flex gap-2 md:w-1/4">
        <button 
          onClick={() => registrarEntrega(true)} 
          className="flex-1 py-4 bg-teal-500 text-white font-black rounded-2xl text-[11px] uppercase tracking-widest shadow-lg shadow-teal-100 active:scale-95 transition-all"
        >
          PAGÓ
        </button>
        <button 
          onClick={() => registrarEntrega(false)} 
          className="flex-1 py-4 bg-white text-rose-600 border-2 border-rose-100 font-black rounded-2xl text-[11px] uppercase tracking-widest active:scale-95 transition-all"
        >
          DEBE
        </button>
      </div>

      {/* Saldo Lateral */}
      <div className="hidden md:block text-right w-24">
        <span className="text-[9px] font-bold text-gray-400 block uppercase mb-1">Saldo Total</span>
        <span className={`text-xl font-black leading-none ${deuda > 0 ? 'text-rose-600' : 'text-teal-500'}`}>
            ${deuda}
        </span>
      </div>
    </div>
  );
}