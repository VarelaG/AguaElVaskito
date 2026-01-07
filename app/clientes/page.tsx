'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [cargando, setCargando] = useState(true);

  const fetchClientes = async () => {
    setCargando(true);
    const { data } = await supabase.from('clientes').select('*').order('nombre', { ascending: true });
    if (data) setClientes(data);
    setCargando(false);
  };

  useEffect(() => { fetchClientes(); }, []);

  const guardarCliente = async (e: React.FormEvent) => {
  e.preventDefault();
  
  const nombreLimpio = nombre.trim();
  const direccionLimpia = direccion.trim();

  // 1. Verificación de Duplicados Robusta
  // Traemos todos los que coincidan (limitamos a 2 por eficiencia)
  const { data: encontrados, error: errorCheck } = await supabase
    .from('clientes')
    .select('id, nombre')
    .ilike('nombre', nombreLimpio)
    .limit(2);

  if (errorCheck) {
    console.error("Error en la consulta de duplicados:", errorCheck.message);
    return alert("Error de conexión con la base de datos.");
  }

  // Buscamos si hay algún duplicado que NO sea el que estamos editando
  const duplicado = encontrados?.find(c => c.id !== editandoId);

  if (duplicado) {
    return alert(`⚠️ ¡Atención! Ya existe un cliente registrado como "${duplicado.nombre}".`);
  }

  // 2. Lógica de Persistencia
  const payload = { 
    nombre: nombreLimpio, 
    direccion: direccionLimpia || "" 
  };

  if (editandoId) {
    const { error } = await supabase.from('clientes').update(payload).eq('id', editandoId);
    if (error) return alert("Error al actualizar: " + error.message);
    setEditandoId(null);
  } else {
    const { error } = await supabase.from('clientes').insert([{ 
      ...payload, 
      deuda_total: 0, 
      deuda_12l: 0, 
      deuda_20l: 0 
    }]);
    if (error) return alert("Error al guardar: " + error.message);
  }

  setNombre(''); 
  setDireccion(''); 
  setMostrarForm(false);
  fetchClientes();
};

  const prepararEdicion = (cliente: any) => {
    setEditandoId(cliente.id);
    setNombre(cliente.nombre);
    setDireccion(cliente.direccion);
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarCliente = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de borrar a "${nombre}"? Esta acción no se puede deshacer.`)) {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (!error) fetchClientes();
      else alert("No se pudo borrar: puede que tenga entregas registradas.");
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 p-6 pb-32">
      <header className="mb-8 mt-4 flex justify-between items-center">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Gestión de Clientes</h1>
        <button onClick={() => { setMostrarForm(!mostrarForm); setEditandoId(null); setNombre(''); setDireccion(''); }} 
                className={`p-3 rounded-2xl shadow-lg transition-all ${mostrarForm ? 'bg-rose-500 text-white rotate-45' : 'bg-blue-600 text-white'}`}>
          <PlusIcon className="h-6 w-6" />
        </button>
      </header>

      {mostrarForm && (
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-blue-50 mb-10">
          <h2 className="font-bold text-gray-800 mb-6">{editandoId ? 'Modificar Cliente' : 'Nuevo Cliente'}</h2>
          <form onSubmit={guardarCliente} className="space-y-4">
            {/* FIX: Se agregó text-gray-900 para que las letras se vean claras */}
            <input 
              required 
              type="text" 
              value={nombre} 
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400" 
              placeholder="Nombre del cliente" 
            />
            <input 
              type="text" 
              value={direccion} 
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full p-4 bg-gray-50 rounded-2xl font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400" 
              placeholder="Dirección (Opcional)" 
            />
            <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-blue-100">
              {editandoId ? 'Actualizar Datos' : 'Registrar Cliente'}
            </button>
          </form>
        </div>
      )}

      <section className="space-y-4">
        {cargando ? (
          <p className="text-center text-gray-400 py-10">Actualizando lista...</p>
        ) : (
          clientes.map((cliente) => (
            <div key={cliente.id} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between transition-all">
              <div className="w-2/3">
                <h4 className="font-black text-gray-800 leading-tight uppercase text-sm">{cliente.nombre}</h4>
                <p className="text-xs text-gray-400 truncate">{cliente.direccion || 'Sin dirección'}</p>
              </div>
              
              <div className="flex gap-2">
                <button onClick={() => prepararEdicion(cliente)} className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors">
                  <PencilSquareIcon className="h-5 w-5" />
                </button>
                <button onClick={() => eliminarCliente(cliente.id, cliente.nombre)} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors">
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}