'use client';
import { useState } from 'react';
import { db } from '../lib/db';
import { useLiveQuery } from 'dexie-react-hooks';
import { PlusIcon, PencilSquareIcon, TrashIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function ClientesPage() {
  // Reactive query from Dexie
  const clientes = useLiveQuery(() => db.clientes.orderBy('nombre').toArray(), []) ?? [];

  const [mostrarForm, setMostrarForm] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState('');
  const [nombre, setNombre] = useState('');
  const [direccion, setDireccion] = useState('');
  const [envases20, setEnvases20] = useState(0);

  // Filter in memory (fast with local data)
  const clientesFiltrados = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.direccion ?? "").toLowerCase().includes(busqueda.toLowerCase())
  );

  const guardarCliente = async (e: React.FormEvent) => {
    e.preventDefault();

    const nombreLimpio = nombre.trim();
    const direccionLimpia = direccion.trim();

    // 1. Check for duplicates locally
    // Note: This only checks already synced/local clients. 
    // If a client exists on server but not partly synced yet, we might get conflict on sync.
    // Sync logic should handle "on conflict do nothing" or similar if ID matches.
    // For name duplicates, we strictly check local.
    const duplicado = clientes.find(c =>
      c.nombre.toLowerCase() === nombreLimpio.toLowerCase() && c.id !== editandoId
    );

    if (duplicado) {
      return alert(`⚠️ ¡Atención! Ya existe un cliente registrado como "${duplicado.nombre}".`);
    }

    // 2. Prepare Payload
    const payload = {
      nombre: nombreLimpio,
      direccion: direccionLimpia || "",
      envases_20l: envases20,
    };

    try {
      if (editandoId) {
        // UPDATE
        await db.clientes.update(editandoId, payload);
        await db.mutation_queue.add({
          table: 'clientes',
          type: 'UPDATE',
          payload: { id: editandoId, ...payload },
          status: 'pending',
          created_at: Date.now(),
          retries: 0
        });
        setEditandoId(null);
      } else {
        // CREATE
        const newId = crypto.randomUUID();
        const newCliente = {
          id: newId,
          ...payload,
          deuda_total: 0,
          deuda_12l: 0,
          deuda_20l: 0,
          envases_12l: 0
        };
        await db.clientes.add(newCliente);
        await db.mutation_queue.add({
          table: 'clientes',
          type: 'INSERT',
          payload: newCliente,
          status: 'pending',
          created_at: Date.now(),
          retries: 0
        });
      }

      setNombre('');
      setDireccion('');
      setEnvases20(0);
      setMostrarForm(false);

    } catch (err) {
      alert("Error al guardar en base de datos local: " + err);
    }
  };

  const prepararEdicion = (cliente: any) => {
    setEditandoId(cliente.id);
    setNombre(cliente.nombre);
    setDireccion(cliente.direccion || '');
    setEnvases20(cliente.envases_20l || 0);
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarCliente = async (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de borrar a "${nombre}"? Esta acción no se puede deshacer.`)) {
      // Check if has local deliveries? 
      // For now, allow delete.
      try {
        await db.clientes.delete(id);
        await db.mutation_queue.add({
          table: 'clientes',
          type: 'DELETE',
          payload: { id },
          status: 'pending',
          created_at: Date.now(),
          retries: 0
        });
      } catch (err) {
        alert("Error al eliminar: " + err);
      }
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-black p-6 pb-32">
      <header className="mb-8 mt-4 flex justify-between items-center text-slate-800 dark:text-white">
        <h1 className="text-3xl font-black tracking-tight">Gestión de Clientes</h1>
        <button onClick={() => {
          setMostrarForm(!mostrarForm);
          setEditandoId(null);
          setNombre('');
          setDireccion('');
          setEnvases20(0);
        }}
          className={`p-3 rounded-2xl shadow-lg transition-all ${mostrarForm ? 'bg-rose-500 text-white rotate-45' : 'bg-blue-600 text-white'}`}>
          <PlusIcon className="h-6 w-6" />
        </button>
      </header>

      <div className="relative mb-8">
        <MagnifyingGlassIcon className="h-5 w-5 absolute left-4 top-3 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por nombre"
          className="text-gray-700 dark:text-white w-full pl-12 pr-4 py-3 border-none rounded-2xl bg-gray-100 dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500 transition-all text-sm outline-none font-medium placeholder-gray-400 dark:placeholder-neutral-500"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {mostrarForm && (
        <div className="bg-white dark:bg-neutral-900 p-6 rounded-[2.5rem] shadow-xl border border-blue-50 dark:border-neutral-800 mb-10">
          <h2 className="font-bold text-gray-800 dark:text-white mb-6 uppercase text-xs tracking-widest">
            {editandoId ? 'Modificar Cliente' : 'Nuevo Cliente'}
          </h2>
          <form onSubmit={guardarCliente} className="space-y-4">
            <input
              required
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-neutral-500"
              placeholder="Nombre del cliente"
            />
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              className="w-full p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 dark:placeholder-neutral-500"
              placeholder="Dirección (Opcional)"
            />

            {/* INPUT DE STOCK FÍSICO (NUEVO) */}
            <div className="bg-amber-50 dark:bg-amber-900/20 p-4 rounded-2xl border border-amber-100 dark:border-amber-800/50">
              <label className="text-[10px] font-black text-amber-700 uppercase mb-2 block tracking-widest">
                Bidones en posesión hoy
              </label>
              <input
                type="number"
                value={envases20}
                onChange={(e) => setEnvases20(Number(e.target.value))}
                className="w-full bg-transparent text-2xl font-black text-amber-600 outline-none"
                placeholder="0"
              />
            </div>

            <button type="submit" className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-blue-100">
              {editandoId ? 'Actualizar Datos' : 'Registrar Cliente'}
            </button>
          </form>
        </div>
      )}

      <section className="space-y-4">
        {clientesFiltrados.length === 0 && !clientes && (
          <p className="text-center text-gray-400 py-10 font-bold uppercase text-[10px]">Cargando...</p>
        )}
        {clientesFiltrados.map((cliente) => (
          <div key={cliente.id} className="bg-white dark:bg-neutral-900 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-neutral-800 flex items-center justify-between transition-all">
            <div className="w-2/3">
              <h4 className="font-black text-gray-800 dark:text-white leading-tight uppercase text-sm">{cliente.nombre}</h4>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[10px] text-gray-400 truncate">{cliente.direccion || 'Sin dirección'}</p>
                {/* Badge de stock para visualización rápida */}
                <span className="text-[9px] bg-amber-50 dark:bg-amber-900/40 text-amber-600 dark:text-amber-500 px-2 py-0.5 rounded-lg font-black uppercase">
                  {cliente.envases_20l || 0} U.
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button onClick={() => prepararEdicion(cliente)} className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors">
                <PencilSquareIcon className="h-5 w-5" />
              </button>
              <button onClick={() => eliminarCliente(cliente.id, cliente.nombre)} className="p-3 bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-colors">
                <TrashIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}