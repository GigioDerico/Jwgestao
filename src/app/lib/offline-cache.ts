import Dexie, { type Table } from 'dexie';

interface CachedRead {
    key: string;
    value: unknown;
    updated_at: string;
}

const cacheDb = new Dexie('jwgestao_read_cache') as Dexie & {
    reads: Table<CachedRead, string>;
};

cacheDb.version(1).stores({
    reads: 'key',
});

/**
 * Leitura network-first com fallback offline: busca do servidor e guarda
 * uma cópia local; se a busca falhar (sem internet, sinal fraco), retorna
 * a última cópia gravada. Sem cópia local, propaga o erro original.
 */
export async function readThroughCache<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    try {
        const fresh = await fetcher();
        try {
            await cacheDb.reads.put({ key, value: fresh, updated_at: new Date().toISOString() });
        } catch {
            // falha ao gravar cache não pode quebrar a leitura
        }
        return fresh;
    } catch (error) {
        const cached = await cacheDb.reads.get(key).catch(() => undefined);
        if (cached !== undefined) {
            console.warn(`[offline-cache] usando cópia local de "${key}" (rede indisponível)`);
            return cached.value as T;
        }
        throw error;
    }
}
