import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
}

/**
 * Componente para mostrar erro com opção de retry
 */
export const ErrorRetry: React.FC<ErrorRetryProps> = ({ 
  message = 'Ocorreu um erro ao carregar os dados', 
  onRetry 
}) => {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
      <h3 className="mt-2 text-lg font-medium text-red-800">Erro de carregamento</h3>
      <p className="mt-1 text-sm text-red-700">{message}</p>
      <div className="mt-4">
        <Button onClick={onRetry}>
          <RefreshCw size={16} className="mr-2" />
          Tentar novamente
        </Button>
      </div>
    </div>
  );
};
