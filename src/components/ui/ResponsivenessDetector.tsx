import React, { useEffect, useState } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import performanceMonitor from '../../utils/performanceMonitor';

interface ResponsivenessDetectorProps {
  children: React.ReactNode;
  threshold?: number; // tempo em ms para considerar travamento
}

/**
 * Componente que monitora a responsividade da UI e mostra um aviso 
 * quando detecta bloqueios do thread principal
 */
export const ResponsivenessDetector: React.FC<ResponsivenessDetectorProps> = ({
  children,
  threshold = 1000 // 1 segundo por padrão
}) => {
  const [isUnresponsive, setIsUnresponsive] = useState(false);
  const [blockingTime, setBlockingTime] = useState(0);
  
  useEffect(() => {
    // Adiciona listener para detectar bloqueios
    const removeListener = performanceMonitor.addBlockingListener((time) => {
      if (time > threshold) {
        setIsUnresponsive(true);
        setBlockingTime(time);
      }
    });
    
    return () => {
      removeListener();
    };
  }, [threshold]);
  
  const handleDismiss = () => {
    setIsUnresponsive(false);
  };
  
  const handleReload = () => {
    window.location.reload();
  };
  
  if (isUnresponsive) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full">
          <div className="flex items-center mb-4 text-amber-600">
            <AlertOctagon className="mr-2" size={24} />
            <h2 className="text-xl font-bold">Página pouco responsiva</h2>
          </div>
          
          <p className="mb-4">
            Detectamos que a página está demorando para responder 
            (bloqueio de {Math.round(blockingTime)}ms).
          </p>
          
          <p className="text-sm text-gray-600 mb-6">
            Isso pode estar sendo causado por operações pesadas em execução.
            Você pode aguardar ou recarregar a página.
          </p>
          
          <div className="flex justify-end space-x-3">
            <Button variant="outline" onClick={handleDismiss}>
              Continuar mesmo assim
            </Button>
            <Button onClick={handleReload}>
              <RefreshCw size={16} className="mr-2" />
              Recarregar página
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  return <>{children}</>;
};
