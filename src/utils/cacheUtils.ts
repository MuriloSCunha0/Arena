import { supabase } from '../lib/supabase';

/**
 * Utilitário para lidar com problemas de cache do Supabase
 * Centraliza a lógica de retry e fallback para operações robustas
 */

export interface CacheErrorInfo {
  isSchemaCache: boolean;
  missingColumn?: string;
  tableName?: string;
  originalError: any;
}

/**
 * Identifica se um erro é relacionado a cache de schema
 */
export const isCacheError = (error: any): CacheErrorInfo => {
  const message = error?.message || '';
  const code = error?.code || '';
  
  const isSchemaCache = 
    code === 'PGRST204' || 
    message.includes('schema cache') ||
    message.includes('Could not find the') ||
    message.includes('column');

  let missingColumn: string | undefined;
  let tableName: string | undefined;

  if (isSchemaCache) {
    // Extrair nome da coluna e tabela do erro
    const columnMatch = message.match(/Could not find the '([^']+)' column of '([^']+)'/);
    if (columnMatch) {
      missingColumn = columnMatch[1];
      tableName = columnMatch[2];
    }
  }

  return {
    isSchemaCache,
    missingColumn,
    tableName,
    originalError: error
  };
};

/**
 * Força refresh do cache do PostgREST
 */
export const forceCacheRefresh = async (): Promise<boolean> => {
  try {
    await supabase.rpc('force_cache_refresh');
    return true;
  } catch (error) {
    try {
      // Fallback: tentar método direto
      await supabase.rpc('pg_notify', { 
        channel: 'pgrst', 
        payload: 'reload schema' 
      });
      return true;
    } catch (fallbackError) {
      console.warn('Could not force cache refresh:', fallbackError);
      return false;
    }
  }
};

/**
 * Executa uma operação com retry automático em caso de cache error
 */
export const withCacheRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  operationName: string = 'operação'
): Promise<T> => {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const cacheInfo = isCacheError(error);
      
      if (cacheInfo.isSchemaCache && attempt <= maxRetries) {
        console.warn(`Cache error on attempt ${attempt} for ${operationName}:`, error);
        
        // Forçar refresh do cache
        const refreshed = await forceCacheRefresh();
        
        if (refreshed) {
          console.log(`Cache refreshed, retrying ${operationName} (attempt ${attempt + 1})`);
          // Pequeno delay antes de retry
          await new Promise(resolve => setTimeout(resolve, 500));
          continue;
        }
      }
      
      // Se não é cache error ou esgotou tentativas, relançar erro
      break;
    }
  }
  
  // Traduzir erro para mensagem amigável
  const cacheInfo = isCacheError(lastError);
  if (cacheInfo.isSchemaCache) {
    throw new Error(
      `Erro de cache do banco de dados${cacheInfo.missingColumn ? 
        ` (coluna '${cacheInfo.missingColumn}' não encontrada)` : 
        ''}. Tente novamente em alguns instantes.`
    );
  }
  
  throw lastError;
};

/**
 * Valida se as colunas críticas existem no schema
 */
export const validateCriticalColumns = async (): Promise<{
  eventsValid: boolean;
  participantsValid: boolean;
  missingColumns: string[];
  details: any;
}> => {
  try {
    const { data, error } = await supabase.rpc('validate_schema_columns');
    
    if (error) {
      throw error;
    }
    
    const missingColumns: string[] = [];
    let eventsValid = true;
    let participantsValid = true;
    
    if (data) {
      for (const row of data) {
        if (!row.exists) {
          missingColumns.push(`${row.table_name}.${row.column_name}`);
          
          if (row.table_name === 'events') {
            eventsValid = false;
          } else if (row.table_name === 'participants') {
            participantsValid = false;
          }
        }
      }
    }
    
    return {
      eventsValid,
      participantsValid,
      missingColumns,
      details: data
    };
  } catch (error) {
    console.warn('Could not validate schema columns:', error);
    return {
      eventsValid: false,
      participantsValid: false,
      missingColumns: ['validation_failed'],
      details: null
    };
  }
};

/**
 * Remove campos problemáticos de um payload baseado no schema
 */
export const sanitizePayloadForCache = (
  payload: any, 
  tableName: 'events' | 'participants'
): any => {
  const sanitized = { ...payload };
  
  if (tableName === 'events') {
    // Lista de campos que podem causar cache miss
    const problematicFields = ['prize_pool', 'prize_distribution', 'entry_fee'];
    
    problematicFields.forEach(field => {
      if (sanitized[field] !== undefined) {
        // Mover valor para campo compatível se possível
        if (field === 'entry_fee' && sanitized.price === undefined) {
          sanitized.price = sanitized[field];
        }
        delete sanitized[field];
      }
    });
    
    // Garantir campos essenciais
    sanitized.price = sanitized.price || 0;
    sanitized.prize = sanitized.prize || '';
  }
  
  if (tableName === 'participants') {
    // Verificar campos de pagamento
    const paymentFields = ['payment_status', 'payment_method', 'payment_date'];
    
    paymentFields.forEach(field => {
      if (sanitized[field] !== undefined) {
        // Se campo não existe, remover do payload
        // A validação vai mostrar se precisa ser adicionado no banco
        console.warn(`Field ${field} may not exist in schema, removing from payload`);
        delete sanitized[field];
      }
    });
  }
  
  return sanitized;
};

/**
 * Hook para usar em componentes React para monitorar cache
 */
export const useCacheMonitor = () => {
  const checkSchema = async () => {
    return await validateCriticalColumns();
  };
  
  const refreshCache = async () => {
    return await forceCacheRefresh();
  };
  
  const runWithRetry = async <T>(
    operation: () => Promise<T>,
    operationName?: string
  ): Promise<T> => {
    return await withCacheRetry(operation, 2, operationName);
  };
  
  return {
    checkSchema,
    refreshCache,
    runWithRetry,
    isCacheError,
    sanitizePayloadForCache
  };
};

export default {
  isCacheError,
  forceCacheRefresh,
  withCacheRetry,
  validateCriticalColumns,
  sanitizePayloadForCache,
  useCacheMonitor
};
