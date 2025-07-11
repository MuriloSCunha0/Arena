/**
 * Utilitário para controle de cache de requisições e prevenção de loops infinitos
 * Previne múltiplas requisições simultâneas para o mesmo recurso
 */

interface RequestCacheEntry {
  promise: Promise<any>;
  timestamp: number;
  key: string;
}

class RequestCache {
  private cache = new Map<string, RequestCacheEntry>();
  private readonly CACHE_TTL = 5000; // 5 segundos
  private readonly MAX_CACHE_SIZE = 100;

  /**
   * Executa uma função com cache, prevenindo múltiplas chamadas simultâneas
   * @param key Chave única para identificar a requisição
   * @param fn Função assíncrona a ser executada
   * @param ttl Tempo de vida do cache em milissegundos (padrão: 5000ms)
   * @returns Promise com o resultado da função
   */
  async execute<T>(
    key: string,
    fn: () => Promise<T>,
    ttl: number = this.CACHE_TTL
  ): Promise<T> {
    // Limpar cache expirado
    this.cleanExpiredEntries();

    // Verificar se já existe uma requisição em andamento
    const existing = this.cache.get(key);
    if (existing) {
      console.log(`[RequestCache] Reusing existing request for key: ${key}`);
      return existing.promise;
    }

    // Criar nova entrada no cache
    const promise = fn()
      .catch((error) => {
        // Remover do cache em caso de erro para permitir retry
        this.cache.delete(key);
        throw error;
      })
      .finally(() => {
        // Limpar cache após TTL
        setTimeout(() => {
          this.cache.delete(key);
        }, ttl);
      });

    const entry: RequestCacheEntry = {
      promise,
      timestamp: Date.now(),
      key
    };

    this.cache.set(key, entry);

    // Limitar tamanho do cache
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.cleanOldestEntries();
    }

    return promise;
  }

  /**
   * Remove uma entrada específica do cache
   * @param key Chave da entrada a ser removida
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Limpa todo o cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Verifica se uma requisição está em andamento
   * @param key Chave da requisição
   * @returns true se a requisição está em andamento
   */
  isPending(key: string): boolean {
    return this.cache.has(key);
  }

  /**
   * Remove entradas expiradas do cache
   */
  private cleanExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Remove as entradas mais antigas para manter o tamanho do cache
   */
  private cleanOldestEntries(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove as 10 entradas mais antigas
    const toRemove = entries.slice(0, 10);
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Retorna estatísticas do cache para debug
   */
  getStats(): {
    size: number;
    keys: string[];
    pendingRequests: string[];
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      pendingRequests: Array.from(this.cache.keys())
    };
  }
}

// Instância singleton
export const requestCache = new RequestCache();

/**
 * Hook para debounce de chamadas de função
 * @param fn Função a ser executada com debounce
 * @param delay Delay em milissegundos
 * @returns Função com debounce aplicado
 */
export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): T {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    return new Promise<ReturnType<T>>((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }) as T;
}

/**
 * Cria uma chave única para cache baseada nos parâmetros
 * @param prefix Prefixo da chave
 * @param params Parâmetros para formar a chave
 * @returns Chave única
 */
export function createCacheKey(prefix: string, ...params: any[]): string {
  const paramsStr = params
    .map(p => typeof p === 'object' ? JSON.stringify(p) : String(p))
    .join('|');
  return `${prefix}:${paramsStr}`;
}

/**
 * Wrapper para executar funções com cache de requisição
 * @param key Chave única da requisição
 * @param fn Função a ser executada
 * @param ttl Tempo de vida do cache
 * @returns Promise com resultado
 */
export async function withRequestCache<T>(
  key: string,
  fn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  return requestCache.execute(key, fn, ttl);
}
