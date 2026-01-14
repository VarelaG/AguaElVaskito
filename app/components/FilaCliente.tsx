'use client';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

interface FilaProps {
  id: string;
  nombre: string;
  direccion: string;
  deuda: number;
  deuda12: number;
  deuda20: number;
  envases_12l: number;
  envases_20l: number;
}

export default function FilaCliente({ id, nombre, direccion, deuda, deuda12, deuda20, envases_12l = 0, envases_20l = 0 }: FilaProps) {
  const [cant12, setCant12] = useState(0);
  const [cant20, setCant20] = useState(0);
  const [vacios, setVacios] = useState(0); 
  const [precios, setPrecios] = useState({ p12: 0, p20: 0 });
  const [verHistorial, setVerHistorial] = useState(false);
  const [historial, setHistorial] = useState<any[]>([]);

  const totalEnMano = (envases_12l || 0) + (envases_20l || 0);

  const cargarDatos = async () => {
    const { data: pData } = await supabase.from('configuracion').select('*').single();
    if (pData) setPrecios({ p12: pData.precio_12l, p20: pData.precio_20l });

    const { data: hData } = await supabase
      .from('entregas')
      .select('*')
      .eq('cliente_id', id)
      .order('fecha', { ascending: false })
      .limit(5);
    if (hData) setHistorial(hData);
  };

  useEffect(() => { cargarDatos(); }, [id]);

  const deshacerEntrega = async (movimiento: any) => {
    if (!confirm("¿Querés borrar este movimiento y revertir los saldos?")) return;

    let rDeuda12 = deuda12;
    let rDeuda20 = deuda20;
    let rEnvases20 = envases_20l;

    // 1. Revertir Deuda de Unidades
    if (!movimiento.pago_realizado) {
      // Si fue "DEBE", restamos lo que se sumó a la deuda
      rDeuda12 = Math.max(0, rDeuda12 - movimiento.bidon_12l);
      rDeuda20 = Math.max(0, rDeuda20 - movimiento.bidon_20l);
    } else {
      // Si fue "PAGÓ" o "COBRÓ_DEUDA", y el monto_deuda es 0, significa que bajó deuda o pagó en el acto
      // Para simplificar: al borrar una cobranza, la deuda vuelve a aparecer
      if (movimiento.monto_pagado > 0 && (movimiento.bidon_12l > 0 || movimiento.bidon_20l > 0)) {
         // Si el contador tenía números, asumimos que se usaron para bajar la deuda
         rDeuda12 += movimiento.bidon_12l;
         rDeuda20 += movimiento.bidon_20l;
      }
    }

    // 2. Revertir Stock (Solo si no fue una cobranza pura de deuda vieja)
    // El stock vuelve a ser: Actual - Entregados + Devueltos
    rEnvases20 = Math.max(0, rEnvases20 - (movimiento.bidon_12l + movimiento.bidon_20l) + (movimiento.devueltos_20l || 0));

    await supabase.from('entregas').delete().eq('id', movimiento.id);
    await supabase.from('clientes').update({
      deuda_total: (rDeuda12 * precios.p12) + (rDeuda20 * precios.p20),
      deuda_12l: rDeuda12,
      deuda_20l: rDeuda20,
      envases_20l: rEnvases20
    }).eq('id', id);

    window.location.reload();
  };

  const registrarEntrega = async (tipo: 'PAGÓ' | 'DEBE' | 'COBRÓ_DEUDA') => {
    if (cant12 === 0 && cant20 === 0 && vacios === 0 && !(tipo === 'COBRÓ_DEUDA' && deuda > 0)) {
      return alert("Seleccioná bidones entregados, vacíos o realizá un pago.");
    }

    const montoHoy = (cant12 * precios.p12) + (cant20 * precios.p20);
    let nDeuda12 = deuda12 || 0;
    let nDeuda20 = deuda20 || 0;
    let nFisicoTotal = totalEnMano;
    let dineroCobrado = 0;

    if (tipo === 'PAGÓ') {
      // ESCENARIO A: Entrega y paga hoy. Sube stock, la deuda vieja no se toca.
      dineroCobrado = montoHoy;
      nFisicoTotal += (cant12 + cant20) - vacios;
    } 
    else if (tipo === 'DEBE') {
      // ESCENARIO C: Entrega y no paga. Sube stock y sube deuda.
      nDeuda12 += cant12;
      nDeuda20 += cant20;
      dineroCobrado = 0;
      nFisicoTotal += (cant12 + cant20) - vacios;
    } 
    else if (tipo === 'COBRÓ_DEUDA') {
      // ESCENARIO B: No entrega nada (o ya entregó), solo cobra deuda vieja.
      // Baja deuda, STOCK NO SUBE.
      if (cant12 === 0 && cant20 === 0) {
        dineroCobrado = deuda; 
        nDeuda12 = 0; nDeuda20 = 0;
      } else {
        dineroCobrado = montoHoy;
        nDeuda12 = Math.max(0, nDeuda12 - cant12);
        nDeuda20 = Math.max(0, nDeuda20 - cant20);
      }
      nFisicoTotal -= vacios;
    }

    const nDeudaTotalPesos = (nDeuda12 * precios.p12) + (nDeuda20 * precios.p20);

    await supabase.from('entregas').insert([{
      cliente_id: id,
      bidon_12l: cant12,
      bidon_20l: cant20,
      devueltos_20l: vacios,
      pago_realizado: tipo !== 'DEBE',
      monto_deuda: tipo === 'DEBE' ? montoHoy : 0,
      monto_pagado: dineroCobrado 
    }]);

    await supabase.from('clientes').update({ 
      deuda_total: nDeudaTotalPesos,
      deuda_12l: nDeuda12,
      deuda_20l: nDeuda20,
      envases_20l: nFisicoTotal
    }).eq('id', id);

    window.location.reload();
  };

  return (
    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 mb-4 flex flex-col md:grid md:grid-cols-12 md:items-center gap-4 overflow-hidden transition-all">
      
      {/* 1. INFO Y ETIQUETAS */}
      <div className="md:col-span-3">
        <div onClick={() => setVerHistorial(!verHistorial)} className="cursor-pointer active:opacity-50 group">
          <h3 className="font-black text-slate-800 uppercase text-sm leading-tight group-hover:text-blue-600 truncate">{nombre}</h3>
          <p className="text-[10px] text-slate-500 font-medium truncate mb-2">{direccion || 'Sin dirección'}</p>
        </div>
        
        <div className="flex flex-wrap gap-1.5 items-center">
          {deuda12 > 0 && <span className="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg font-black border border-rose-100 uppercase">Debe {deuda12} (12L)</span>}
          {deuda20 > 0 && <span className="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg font-black border border-rose-100 uppercase">Debe {deuda20} (20L)</span>}
          {deuda === 0 && (
            <span className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-black border border-emerald-100 uppercase tracking-wider">
              ✓ Al día
            </span>
          )}
          <span className="text-[9px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-lg font-black border border-amber-100 uppercase">
            En Mano: {totalEnMano}
          </span>
        </div>
      </div>

      {/* 2. SELECTORES DE ENTREGA */}
      <div className="md:col-span-4 flex items-center justify-between bg-slate-50 p-2 md:p-3 rounded-2xl border border-slate-100 h-14">
        <div className="flex flex-col items-center flex-1">
          <span className="text-[7px] md:text-[8px] font-black text-blue-400 uppercase mb-0.5">12L</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCant12(Math.max(0, cant12 - 1))} className="w-7 h-7 bg-white rounded-lg shadow-sm text-blue-600 font-bold active:scale-90">-</button>
            <span className="text-xs font-black text-slate-700 w-5 text-center">{cant12}</span>
            <button onClick={() => setCant12(cant12 + 1)} className="w-7 h-7 bg-white rounded-lg shadow-sm text-blue-600 font-bold active:scale-90">+</button>
          </div>
        </div>
        <div className="w-[1px] h-6 bg-slate-200 mx-1"></div>
        <div className="flex flex-col items-center flex-1">
          <span className="text-[7px] md:text-[8px] font-black text-blue-400 uppercase mb-0.5">20L</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setCant20(Math.max(0, cant20 - 1))} className="w-7 h-7 bg-white rounded-lg shadow-sm text-blue-600 font-bold active:scale-90">-</button>
            <span className="text-xs font-black text-slate-700 w-5 text-center">{cant20}</span>
            <button onClick={() => setCant20(cant20 + 1)} className="w-7 h-7 bg-white rounded-lg shadow-sm text-blue-600 font-bold active:scale-90">+</button>
          </div>
        </div>
      </div>

      {/* 3. SELECTOR DE VACÍOS */}
      <div className="md:col-span-2 flex flex-col items-center bg-amber-50/30 p-2 rounded-2xl border border-amber-100 h-14">
        <span className="text-[8px] font-black text-amber-500 uppercase mb-1">Retiro Vacíos</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setVacios(Math.max(0, vacios - 1))} className="w-7 h-7 bg-white rounded-lg shadow-sm text-amber-600 font-bold active:scale-90">-</button>
          <span className="text-sm font-black text-slate-700 w-5 text-center">{vacios}</span>
          <button onClick={() => setVacios(vacios + 1)} className="w-7 h-7 bg-white rounded-lg shadow-sm text-amber-600 font-bold active:scale-90">+</button>
        </div>
      </div>

      {/* 4. ACCIONES */}
      <div className="md:col-span-2 flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          <button onClick={() => registrarEntrega('PAGÓ')} className="flex-1 py-3 bg-emerald-500 text-white font-black rounded-xl text-[9px] uppercase shadow-md active:scale-95 transition-all">PAGÓ</button>
          <button onClick={() => registrarEntrega('DEBE')} className="flex-1 py-3 bg-white text-rose-500 border border-rose-200 font-black rounded-xl text-[9px] uppercase active:scale-95 transition-all">DEBE</button>
        </div>
        {(deuda12 > 0 || deuda20 > 0) && (
          <button 
            onClick={() => registrarEntrega('COBRÓ_DEUDA')} 
            className="w-full py-2.5 bg-blue-50 text-blue-600 font-black rounded-xl text-[8px] uppercase border border-blue-100 active:bg-blue-100"
          >
            Cobrar Deuda Vieja
          </button>
        )}
      </div>

      {/* 5. SALDO PC */}
      <div className="hidden md:block md:col-span-1 text-right">
        <span className={`text-sm font-black ${deuda > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>${deuda.toLocaleString()}</span>
      </div>

      {/* HISTORIAL DESPLEGABLE */}
      {verHistorial && (
        <div className="md:col-span-12 bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 mt-[-1rem] animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-b border-slate-200 pb-2 mb-2">Últimos 5 movimientos</p>
          {historial.length > 0 ? historial.map((h, i) => (
            <div key={i} className="flex justify-between text-[10px] font-bold items-center">
              <span className="text-slate-400 w-16">{new Date(h.fecha).toLocaleDateString('es-AR', {day:'2-digit', month:'2-digit'})}</span>
              <span className="text-slate-50 flex-1 text-center">
                Entregó: {h.bidon_12l > 0 ? `${h.bidon_12l} (12L) ` : ''}{h.bidon_20l > 0 ? `${h.bidon_20l} (20L)` : ''} 
                {h.devueltos_20l > 0 ? ` | Volvieron: ${h.devueltos_20l}` : ''}
              </span>
              <div className="w-24 text-right flex items-center justify-end gap-2">
                <span className={`text-[10px] ${h.pago_realizado ? 'text-emerald-600' : 'text-rose-500'}`}>
                  ${(h.monto_pagado || h.monto_deuda).toLocaleString()}
                </span>
                {i === 0 && (
                  <button onClick={() => deshacerEntrega(h)} className="p-1 bg-rose-100 text-rose-600 rounded-md hover:bg-rose-200">
                    <ArrowUturnLeftIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          )) : <p className="text-center text-[10px] text-slate-400">Sin historial registrado</p>}
        </div>
      )}
    </div>
  );
}