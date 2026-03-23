'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { db, Mutation } from './db';
import { supabase } from './supabase';
import { useLiveQuery } from 'dexie-react-hooks';

interface SyncContextType {
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: Date | null;
    empresaId: string | null;
    syncPush: () => Promise<void>;
    syncPull: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    empresaId: null,
    syncPush: async () => { },
    syncPull: async () => { },
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [empresaId, setEmpresaId] = useState<string | null>(null);
    const syncLock = useRef(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Monitor mutations to trigger push
    const pendingMutationsCount = useLiveQuery(() => db.mutation_queue.where('status').equals('pending').count());

    // Get empresa_id of the currently logged in user
    const getEmpresaId = useCallback(async (): Promise<string | null> => {
        if (empresaId) return empresaId;
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('usuarios_empresa')
                .select('empresa_id')
                .eq('user_id', user.id)
                .single();

            if (error || !data) return null;
            setEmpresaId(data.empresa_id);
            return data.empresa_id;
        } catch {
            return null;
        }
    }, [empresaId]);

    const syncPush = useCallback(async () => {
        if (!isOnline || syncLock.current) return;
        syncLock.current = true;
        setIsSyncing(true);

        const eid = await getEmpresaId();

        try {
            let hasMore = true;
            while (hasMore) {
                const pending = await db.mutation_queue
                    .where('status')
                    .equals('pending')
                    .sortBy('created_at');

                if (pending.length === 0) {
                    hasMore = false;
                    break;
                }

                for (const mutation of pending) {
                    try {
                        const { table, type, payload } = mutation;

                        await db.mutation_queue.update(mutation.id!, { status: 'processing' });

                        let error = null;

                        // Inject empresa_id into all INSERT payloads
                        const enrichedPayload = (type === 'INSERT' && eid)
                            ? { ...payload, empresa_id: eid }
                            : payload;

                        if (type === 'INSERT') {
                            const { error: e } = await supabase.from(table).insert(enrichedPayload);
                            error = e;
                        } else if (type === 'UPDATE') {
                            const { id, ...changes } = enrichedPayload;
                            if (!id) throw new Error("No ID in update payload");
                            const { error: e } = await supabase.from(table).update(changes).eq('id', id);
                            error = e;
                        } else if (type === 'DELETE') {
                            const { id } = payload;
                            const { error: e } = await supabase.from(table).delete().eq('id', id);
                            error = e;
                        }

                        if (error) {
                            console.error(`Sync error for mutation ${mutation.id}:`, error);
                            await db.mutation_queue.update(mutation.id!, {
                                status: 'failed',
                                error: error.message || 'Error desconocido',
                                retries: (mutation.retries || 0) + 1
                            });
                        } else {
                            await db.mutation_queue.delete(mutation.id!);
                        }

                    } catch (err: any) {
                        console.error("Mutation processing exception:", err);
                        await db.mutation_queue.update(mutation.id!, {
                            status: 'failed',
                            error: String(err),
                            retries: (mutation.retries || 0) + 1
                        });
                    }
                }
            }
        } finally {
            syncLock.current = false;
            setIsSyncing(false);
        }
    }, [isOnline, getEmpresaId]);

    const syncPull = useCallback(async () => {
        if (!isOnline || syncLock.current) return;
        syncLock.current = true;
        setIsSyncing(true);

        try {
            // PROTECCIÓN: Identificar registros bloqueados por mutaciones locales
            const lockedMutations = await db.mutation_queue
                .filter(m => m.status === 'pending' || m.status === 'failed' || m.status === 'processing')
                .toArray();

            const lockedClientes = new Set(lockedMutations.filter(m => m.table === 'clientes').map(m => m.payload.id));
            const lockedEntregas = new Set(lockedMutations.filter(m => m.table === 'entregas').map(m => m.payload.id));

            // Supabase RLS automatically filters by empresa_id via the policy,
            // so we don't need to manually filter—Supabase will only return
            // data belonging to the logged-in user's company.

            // 1. Clientes — REPLACE strategy (not accumulate)
            const { data: clientsFromServer, error: errClients } = await supabase.from('clientes').select('*');
            if (!errClients) {
                const safeClients = (clientsFromServer || []).filter(c => !lockedClientes.has(c.id));
                // Delete local clients that are no longer returned by the server
                // (handles company isolation: old user data is wiped on next pull)
                const serverClientIds = safeClients.map(c => c.id);
                await db.clientes
                    .filter(c => !lockedClientes.has(c.id) && !serverClientIds.includes(c.id))
                    .delete();
                if (safeClients.length > 0) {
                    await db.clientes.bulkPut(safeClients);
                }
            }

            // 2. Entregas — REPLACE strategy
            const { data: entregasFromServer, error: errEntregas } = await supabase.from('entregas').select('*').limit(1000);
            if (!errEntregas) {
                const safeEntregas = (entregasFromServer || []).filter(e => !lockedEntregas.has(e.id));
                const serverEntregaIds = safeEntregas.map(e => e.id);
                await db.entregas
                    .filter(e => !lockedEntregas.has(e.id) && !serverEntregaIds.includes(e.id))
                    .delete();
                if (safeEntregas.length > 0) {
                    await db.entregas.bulkPut(safeEntregas);
                }
            }

            // 3. Config — REPLACE strategy
            const { data: configFromServer, error: errConfig } = await supabase.from('configuracion').select('*');
            if (!errConfig) {
                const safeConfig = (configFromServer || []).filter(c => !lockedMutations.some(m => m.table === 'configuracion' && m.payload.id === c.id));
                const serverConfigIds = safeConfig.map(c => c.id);
                // Wipe local configs that aren't pending and aren't on the server (handles tenant switching)
                await db.configuracion
                    .filter(c => !lockedMutations.some(m => m.table === 'configuracion' && m.payload.id === c.id) && !serverConfigIds.includes(c.id))
                    .delete();
                if (safeConfig.length > 0) {
                    await db.configuracion.bulkPut(safeConfig);
                }
            }

            // 4. Empresa info (for display name)
            const eid = await getEmpresaId();
            if (eid) {
                const { data: empresa } = await supabase
                    .from('empresas')
                    .select('nombre')
                    .eq('id', eid)
                    .single();
                if (empresa) {
                    localStorage.setItem('empresa_nombre', empresa.nombre);
                }
            }

            setLastSync(new Date());

        } catch (error) {
            console.error("Pull sync failed", error);
        } finally {
            syncLock.current = false;
            setIsSyncing(false);
        }
    }, [isOnline, getEmpresaId]);

    // Initial Pull on mount (if online)
    useEffect(() => {
        if (isOnline) {
            syncPull();
        }
    }, [isOnline, syncPull]);

    // Trigger Push if pending mutations exist and we go online
    useEffect(() => {
        if (isOnline && (pendingMutationsCount ?? 0) > 0) {
            syncPush().then(() => {
                syncPull();
            });
        }
    }, [isOnline, pendingMutationsCount, syncPush, syncPull]);

    // Online/Offline listeners
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <SyncContext.Provider value={{ isOnline, isSyncing, lastSync, empresaId, syncPush, syncPull }}>
            {children}
        </SyncContext.Provider>
    );
}
