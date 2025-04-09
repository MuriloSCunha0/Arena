import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingProgressProps {
  message?: string;
  timeout?: number; // tempo máximo de espera em ms
  onTimeout?: () => void;
}

/**
 * Componente que mostra o progresso de carregamento
 * e detecta quando uma operação demora demais
 */
export const LoadingProgress: React.FC<LoadingProgressProps> = ({ 
  message = 'Carregando...',
  timeout = 15000,
  onTimeout
}) => {
  const [progress, setProgress] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showSlowWarning, setShowSlowWarning] = useState(false);
  
  useEffect(() => {
    const startTime = Date.now();
    let animationFrameId: number;
    let warningTimeoutId: number;
    let timeoutId: number;
    
    // Função para atualizar o progresso
    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      setTimeElapsed(elapsed);
      
      // Calcula o progresso como porcentagem do timeout
      // Mas limita a 90% para evitar falsa impressão de conclusão
      const calculatedProgress = Math.min((elapsed / timeout) * 100, 90);
      setProgress(calculatedProgress);
      
      if (elapsed < timeout) {
        animationFrameId = requestAnimationFrame(updateProgress);
      }
    };
    
    // Inicia a animação de progresso
    animationFrameId = requestAnimationFrame(updateProgress);
    
    // Configura o aviso de carregamento lento após metade do timeout
    warningTimeoutId = window.setTimeout(() => {
      setShowSlowWarning(true);
    }, timeout / 2);
    
    // Configura o timeout para operações muito lentas
    if (onTimeout) {
      timeoutId = window.setTimeout(() => {
        onTimeout();
      }, timeout);
    }
    
    return () => {
      cancelAnimationFrame(animationFrameId);
      clearTimeout(warningTimeoutId);
      clearTimeout(timeoutId);
    };
  }, [timeout, onTimeout]);
  
  return (
    <div className="flex flex-col items-center justify-center">
      <Loader2 size={32} className="animate-spin text-brand-green mb-4" />
      
      <p className="mb-2 text-gray-700">{message}</p>
      
      <div className="w-64 bg-gray-200 rounded-full h-2.5 mb-2">
        <div 
          className="bg-brand-green h-2.5 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <p className="text-xs text-gray-500">
        {Math.round(timeElapsed / 1000)}s decorridos
      </p>
      
      {showSlowWarning && (
        <p className="text-sm text-amber-600 mt-4">
          O carregamento está demorando mais do que o esperado. 
          Aguarde um momento ou tente recarregar a página.
        </p>
      )}
    </div>
  );
};
