'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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
    const [lastSync, setLastSync] = useState<Date | null>(null);

    // Monitor mutations to trigger push
    const pendingMutationsCount = useLiveQuery(() => db.mutation_queue.where('status').equals('pending').count());

    const syncPush = useCallback(async () => {
        if (!isOnline || isSyncing) return;
        setIsSyncing(true);

        try {
            const pending = await db.mutation_queue.orderBy('created_at').toArray();

            for (const mutation of pending) {
                try {
                    // Process mutation based on type
                    const { table, type, payload } = mutation;

                    let error = null;

                    if (type === 'INSERT') {
                        // Remove 'id' if it's a number (Dexie auto-inc) to let Supabase gen UUID if needed,
                        // BUT we are using UUIDs for clients/entregas. 
                        // If the payload has a UUID generated locally, we send it.
                        const { error: e } = await supabase.from(table).insert(payload);
                        error = e;
                    } else if (type === 'UPDATE') {
                        // Expect payload to have key info or we need ID. 
                        // Defines payload as the changes. We need the ID.
                        // Assumption: payload contains 'id' and the changes.
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
                        // If error is critical, maybe mark as failed? For now, retry or skip.
                        // If it's a "duplicate key" maybe we ignore?
                        // We'll leave it in queue but mark as 'failed' to stop blocking? 
                        // Or remove it? 
                        // Simple strategy: Remove it to avoid blocking everything forever.
                        await db.mutation_queue.delete(mutation.id!);
                    } else {
                        // Success
                        await db.mutation_queue.delete(mutation.id!);
                    }

                } catch (err) {
                    console.error("Mutation processing exception:", err);
                    // Mark failed or increment retries
                }
            }
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing]);

    const syncPull = useCallback(async () => {
        if (!isOnline || isSyncing) return;
        setIsSyncing(true);
        try {
            // 1. Clientes
            const { data: clients, error: errClients } = await supabase.from('clientes').select('*');
            if (clients && !errClients) {
                await db.clientes.bulkPut(clients); // Upsert
            }

            // 2. Entregas (Maybe limit to recent? For now all)
            // Optimisation: Fetch only recent or by pages. 
            const { data: entregas, error: errEntregas } = await supabase.from('entregas').select('*').limit(1000);
            if (entregas && !errEntregas) {
                await db.entregas.bulkPut(entregas);
            }

            // 3. Config
            const { data: config, error: errConfig } = await supabase.from('configuracion').select('*');
            if (config && !errConfig) {
                await db.configuracion.bulkPut(config);
            }

            setLastSync(new Date());

        } catch (error) {
            console.error("Pull sync failed", error);
        } finally {
            setIsSyncing(false);
        }
    }, [isOnline, isSyncing]);

    // Initial Pull on mount (if online)
    useEffect(() => {
        if (isOnline) {
            syncPull();
        }
    }, [isOnline]); // Run when coming online

    // Trigger Push if pending mutations exist and we go online
    useEffect(() => {
        if (isOnline && (pendingMutationsCount ?? 0) > 0) {
            syncPush().then(() => {
                // After push, we usually want to pull to get latest state (e.g. UUIDs if we were using temp ones, or other users' edits)
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
        <SyncContext.Provider value={{ isOnline, isSyncing, lastSync, syncPush, syncPull }}>
            {children}
        </SyncContext.Provider>
    );
}
