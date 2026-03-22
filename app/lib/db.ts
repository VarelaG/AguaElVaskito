import Dexie, { Table } from 'dexie';

// Define interfaces mirroring Supabase tables
export interface Cliente {
    id: string; // UUID
    nombre: string;
    direccion: string | null;
    deuda_total: number;
    deuda_12l: number;
    deuda_20l: number;
    envases_12l: number;
    envases_20l: number;
    empresa_id?: string;
    updated_at?: string;
    // Local flags
    sync_status?: 'synced' | 'pending';
}

export interface Entrega {
    id: string; // UUID
    cliente_id: string;
    bidon_12l: number;
    bidon_20l: number;
    devueltos_20l: number;
    pago_realizado: boolean;
    monto_deuda: number;
    monto_pagado: number;
    fecha: string; // ISO string
    empresa_id?: string;
    sync_status?: 'synced' | 'pending';
}

export interface Configuracion {
    id: string;
    precio_12l: number;
    precio_20l: number;
    empresa_id?: string;
}

export interface Mutation {
    id?: number; // Auto-increment for order
    table: 'clientes' | 'entregas' | 'configuracion';
    type: 'INSERT' | 'UPDATE' | 'DELETE';
    payload: any;
    status: 'pending' | 'processing' | 'failed';
    retries: number;
    created_at: number;
    error?: string;
}

export class VaskitoDB extends Dexie {
    clientes!: Table<Cliente>;
    entregas!: Table<Entrega>;
    configuracion!: Table<Configuracion>;
    mutation_queue!: Table<Mutation>;

    constructor() {
        super('VaskitoDB');
        this.version(1).stores({
            clientes: 'id, nombre, sync_status',
            entregas: 'id, cliente_id, fecha, sync_status',
            configuracion: 'id',
            mutation_queue: '++id, table, status'
        });
        this.version(2).stores({
            clientes: 'id, nombre, empresa_id, sync_status',
            entregas: 'id, cliente_id, fecha, empresa_id, sync_status',
            configuracion: 'id, empresa_id',
            mutation_queue: '++id, table, status'
        });
    }
}

export const db = new VaskitoDB();
