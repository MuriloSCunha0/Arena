import React, { useEffect, useState } from 'react';
import { AlertTriangle, XCircle, RefreshCw } from 'lucide-react';

export const BlockDetector: React.FC = () => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockingTime, setBlockingTime] = useState(0);
  
  useEffect(() => {
    let lastPing = Date.now();
    let checkInterval: number;
    let pingInterval: number;
    
    // Função que verifica se o thread principal está bloqueado
    const checkBlocking = () => {
      const now = Date.now();
      const diff = now - lastPing;
      
      // Se o último ping foi há mais de 500ms, consideramos que a UI está bloqueada
      if (diff > 500) {
        setIsBlocked(true);
        setBlockingTime(diff);
      } else if (isBlocked) {
        setIsBlocked(false);
      }
    };
    
    // Função que atualiza o timestamp do último ping
    const updatePing = () => {
      lastPing = Date.now();
    };
    
    // Inicializar os intervalos
    pingInterval = window.setInterval(updatePing, 100);
    checkInterval = window.setInterval(checkBlocking, 500);
    
    // Limpar os intervalos quando o componente for desmontado
    return () => {
      clearInterval(pingInterval);
      clearInterval(checkInterval);
    };
  }, [isBlocked]);
  
  const handleReload = () => {
    window.location.reload();
  };
  
  if (!isBlocked) return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-700 p-3 rounded-lg shadow-lg max-w-xs z-50 animate-pulse">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <AlertTriangle className="mr-2" size={18} />
          <span className="font-medium">Aplicação lenta</span>
        </div>
        <button 
          onClick={() => setIsBlocked(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <XCircle size={16} />
        </button>
      </div>
      <p className="text-xs">
        A aplicação está respondendo lentamente ({Math.round(blockingTime)}ms). 
      </p>
      <button
        onClick={handleReload}
        className="mt-2 w-full py-1 bg-brand-blue text-white text-xs rounded-md flex items-center justify-center hover:bg-opacity-90"
      >
        <RefreshCw size={12} className="mr-1" />
        Recarregar página
      </button>
    </div>
  );
};
