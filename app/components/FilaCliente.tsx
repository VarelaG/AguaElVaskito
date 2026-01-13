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

  useEffect(() => {
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
    cargarDatos();
  }, [id]);

  const registrarEntrega = async (pago: boolean) => {
    // 1. Validación de seguridad: Si no hay entrega, ni cobro, ni devolución, no hacemos nada
    if (cant12 === 0 && cant20 === 0 && vacios === 0) {
      if (pago && deuda > 0) {
        // Permitimos continuar si solo viene a pagar deuda vieja
      } else {
        return alert("Seleccioná bidones entregados, vacíos o realizá un pago.");
      }
    }

    const montoHoy = (cant12 * precios.p12) + (cant20 * precios.p20);
    
    let nDeuda12 = deuda12 || 0;
    let nDeuda20 = deuda20 || 0;
    let dineroCobrado = 0;

    if (pago) {
      if (cant12 === 0 && cant20 === 0) {
        // Caso: Paga deuda vieja acumulada (Lógica de Git)
        dineroCobrado = (nDeuda12 * precios.p12) + (nDeuda20 * precios.p20);
        nDeuda12 = 0; 
        nDeuda20 = 0;
      } else {
        // Caso: Paga lo de hoy y se descuenta de la deuda vieja (Lógica de Git)
        dineroCobrado = montoHoy;
        nDeuda12 = Math.max(0, nDeuda12 - cant12);
        nDeuda20 = Math.max(0, nDeuda20 - cant20);
      }
    } else {
      // Caso: No paga, se suma el producto a la deuda (Lógica de Git)
      nDeuda12 += cant12;
      nDeuda20 += cant20;
      dineroCobrado = 0;
    }

    // Lógica de Envases Físicos: Independiente del dinero
    // Nuevo Stock = Tenía + Entregados hoy - Devueltos vacíos
    const nFisicoTotal = Math.max(0, totalEnMano + cant12 + cant20 - vacios);
    
    // Recalcular saldo total en pesos basado en las nuevas unidades de deuda
    const nDeudaTotalPesos = (nDeuda12 * precios.p12) + (nDeuda20 * precios.p20);

    // 2. Registro en la tabla de entregas para el historial
    const { error: errorE } = await supabase.from('entregas').insert([{
      cliente_id: id,
      bidon_12l: cant12,
      bidon_20l: cant20,
      devueltos_20l: vacios,
      pago_realizado: pago,
      monto_deuda: pago ? 0 : montoHoy,
      monto_pagado: dineroCobrado 
    }]);

    // 3. Actualización de la ficha del cliente
    const { error: errorC } = await supabase.from('clientes').update({ 
      deuda_total: nDeudaTotalPesos,
      deuda_12l: nDeuda12,
      deuda_20l: nDeuda20,
      envases_12l: 0, // Mantenemos en 0 para centralizar stock físico en una columna
      envases_20l: nFisicoTotal
    }).eq('id', id);

    if (!errorE && !errorC) window.location.reload();
  };

  return (
    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 mb-4 flex flex-col md:grid md:grid-cols-12 md:items-center gap-4 overflow-hidden transition-all">
      
      {/* 1. INFO Y ETIQUETAS (md:col-span-3 para dar espacio a los selectores) */}
      <div className="md:col-span-3">
        <div onClick={() => setVerHistorial(!verHistorial)} className="cursor-pointer active:opacity-50 group">
          <h3 className="font-black text-slate-800 uppercase text-sm leading-tight group-hover:text-blue-600 truncate">{nombre}</h3>
          <p className="text-[10px] text-slate-500 font-medium truncate mb-2">{direccion || 'Sin dirección'}</p>
        </div>
        
        <div className="flex flex-wrap gap-1.5 items-center">
          {deuda12 > 0 && (
            <span className="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg font-black border border-rose-100 uppercase">
              Debe {deuda12} (12L)
            </span>
          )}
          {deuda20 > 0 && (
            <span className="text-[9px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg font-black border border-rose-100 uppercase">
              Debe {deuda20} (20L)
            </span>
          )}
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

      {/* 2. SELECTORES DE ENTREGA (md:col-span-4 - Ahora es más ancho para que entren los botones) */}
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

      {/* 3. SELECTOR DE VACÍOS (Col 2) */}
      <div className="md:col-span-2 flex flex-col items-center bg-amber-50/30 p-2 rounded-2xl border border-amber-100 h-14">
        <span className="text-[8px] font-black text-amber-500 uppercase mb-1">Retiro Vacíos</span>
        <div className="flex items-center gap-3">
          <button onClick={() => setVacios(Math.max(0, vacios - 1))} className="w-7 h-7 bg-white rounded-lg shadow-sm text-amber-600 font-bold active:scale-90">-</button>
          <span className="text-sm font-black text-slate-700 w-5 text-center">{vacios}</span>
          <button onClick={() => setVacios(vacios + 1)} className="w-7 h-7 bg-white rounded-lg shadow-sm text-amber-600 font-bold active:scale-90">+</button>
        </div>
      </div>

      {/* 4. ACCIONES (Col 2) */}
      <div className="md:col-span-2 flex gap-2">
        <button onClick={() => registrarEntrega(true)} className="flex-1 py-3.5 bg-emerald-500 text-white font-black rounded-2xl text-[10px] uppercase shadow-lg shadow-emerald-100 active:scale-95 transition-all">PAGÓ</button>
        <button onClick={() => registrarEntrega(false)} className="flex-1 py-3.5 bg-white text-rose-500 border-2 border-rose-100 font-black rounded-2xl text-[10px] uppercase active:scale-95 transition-all">DEBE</button>
      </div>

      {/* 5. SALDO PC (Col 1) */}
      <div className="hidden md:block md:col-span-1 text-right">
        <span className="text-[8px] font-bold text-slate-400 block uppercase leading-none mb-1">Saldo</span>
        <span className={`text-sm font-black leading-none ${deuda > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>${deuda.toLocaleString()}</span>
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
              <span className={`w-16 text-right ${h.pago_realizado ? 'text-emerald-600' : 'text-rose-500'}`}>
                ${(h.monto_pagado || h.monto_deuda).toLocaleString()}
              </span>
            </div>
          )) : <p className="text-center text-[10px] text-slate-400">Sin historial registrado</p>}
        </div>
      )}
    </div>
  );
}