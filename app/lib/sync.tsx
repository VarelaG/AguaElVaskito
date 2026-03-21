'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { db, Mutation } from './db';
import { supabase } from './supabase';
import { useLiveQuery } from 'dexie-react-hooks';

interface SyncContextType {
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: Date | null;
    syncPush: () => Promise<void>;
    syncPull: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType>({
    isOnline: true,
    isSyncing: false,
    lastSync: null,
    syncPush: async () => { },
    syncPull: async () => { },
});

export const useSync = () => useContext(SyncContext);

export function SyncProvider({ children }: { children: React.ReactNode }) {
    const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [isSyncing, setIsSyncing] = useState(false);
    const syncLock = useRef(false);
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Monitor mutations to trigger push
    const pendingMutationsCount = useLiveQuery(() => db.mutation_queue.where('status').equals('pending').count());

    const syncPush = useCallback(async () => {
        if (!isOnline || syncLock.current) return;
        syncLock.current = true;
        setIsSyncing(true);

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
                        // Process mutation based on type
                        const { table, type, payload } = mutation;

                        // Mark as processing temporarily in memory
                        await db.mutation_queue.update(mutation.id!, { status: 'processing' });

                        let error = null;

                        if (type === 'INSERT') {
                            const { error: e } = await supabase.from(table).insert(payload);
                            error = e;
                        } else if (type === 'UPDATE') {
                            const { id, ...changes } = payload;
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
                            // Marcar failed pero NO BORRARLA para no perder el dato
                            await db.mutation_queue.update(mutation.id!, { 
                                status: 'failed',
                                error: error.message || 'Error desconocido',
                                retries: (mutation.retries || 0) + 1
                            });
                        } else {
                            // Success - se subio correctamente.
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
    }, [isOnline]);

    const syncPull = useCallback(async () => {
        if (!isOnline || syncLock.current) return;
        syncLock.current = true;
        setIsSyncing(true);

        try {
            // PROTECCIÓN: Identificar registros bloqueados por mutaciones locales (pending o failed)
            const lockedMutations = await db.mutation_queue
                .filter(m => m.status === 'pending' || m.status === 'failed' || m.status === 'processing')
                .toArray();

            const lockedClientes = new Set(lockedMutations.filter(m => m.table === 'clientes').map(m => m.payload.id));
            const lockedEntregas = new Set(lockedMutations.filter(m => m.table === 'entregas').map(m => m.payload.id));
            const lockedConfiguracion = new Set(lockedMutations.filter(m => m.table === 'configuracion').map(m => m.payload.id));

            // 1. Clientes
            const { data: clients, error: errClients } = await supabase.from('clientes').select('*');
            if (clients && !errClients) {
                // Filtrar clientes que tengan mutaciones locales pendientes (Garantiza optimismo local)
                const safeClients = clients.filter(c => !lockedClientes.has(c.id));
                if (safeClients.length > 0) {
                    await db.clientes.bulkPut(safeClients); // Upsert
                }
            }

            // 2. Entregas (Maybe limit to recent? For now all)
            const { data: entregas, error: errEntregas } = await supabase.from('entregas').select('*').limit(1000);
            if (entregas && !errEntregas) {
                const safeEntregas = entregas.filter(e => !lockedEntregas.has(e.id));
                if (safeEntregas.length > 0) {
                    await db.entregas.bulkPut(safeEntregas);
                }
            }

            // 3. Config
            const { data: config, error: errConfig } = await supabase.from('configuracion').select('*');
            if (config && !errConfig) {
                const safeConfig = config.filter(c => !lockedConfiguracion.has(c.id));
                if (safeConfig.length > 0) {
                    await db.configuracion.bulkPut(safeConfig);
                }
            }

            setLastSync(new Date());

        } catch (error) {
            console.error("Pull sync failed", error);
        } finally {
            syncLock.current = false;
            setIsSyncing(false);
        }
    }, [isOnline]);

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
                // After push, we usually want to pull to get latest state
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

    // Helper (Optional) - Intentar sincronizar fallos manualmente o periodicamente.
    // Usar con precaución o un botón extra en la UI.
    const retryFailed = useCallback(async () => {
        if(!isOnline) return;
        const failed = await db.mutation_queue.where('status').equals('failed').toArray();
        for(let m of failed) {
            await db.mutation_queue.update(m.id!, { status: 'pending' });
        }
        if(failed.length > 0) {
            syncPush();
        }
    }, [isOnline, syncPush]);

    return (
        <SyncContext.Provider value={{ isOnline, isSyncing, lastSync, syncPush, syncPull }}>
            {children}
        </SyncContext.Provider>
    );
}
