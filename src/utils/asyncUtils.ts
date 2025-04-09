/**
 * Utilitários para operações assíncronas
 * Versão otimizada para evitar bloqueios na interface
 */

/**
 * Aplica um timeout a qualquer Promise, rejeitando-a se demorar demais
 * @param promise A Promise original
 * @param timeoutMs Timeout em milissegundos
 * @param errorMessage Mensagem de erro opcional
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  errorMessage: string = 'Operação excedeu o tempo limite'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
    })
  ]);
}

/**
 * Executa uma função com um pequeno atraso para evitar bloqueio da UI
 * @param callback Função a ser executada
 * @param delayMs Atraso em milissegundos
 */
export function runWithDelay<T>(callback: () => T, delayMs: number = 10): Promise<T> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(callback());
    }, delayMs);
  });
}

/**
 * Divide o processamento de arrays grandes em chunks para evitar bloqueios
 * @param array Array a ser processado
 * @param chunkSize Tamanho de cada chunk
 * @param processFn Função para processar cada item
 */
export async function processInChunks<T, U>(
  array: T[],
  chunkSize: number = 50,
  processFn: (item: T) => U
): Promise<U[]> {
  const results: U[] = [];
  
  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    
    // Processar chunk e permitir que a UI respire entre chunks
    await new Promise((resolve) => {
      setTimeout(() => {
        results.push(...chunk.map(processFn));
        resolve(undefined);
      }, 0);
    });
  }
  
  return results;
}
