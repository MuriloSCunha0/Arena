import React, { useCallback } from 'react';
import { useNotificationStore } from '../components/ui/Notification';

export interface ErrorContext {
  component?: string;
  action?: string;
  details?: any;
}

export const useErrorHandler = () => {
  const addNotification = useNotificationStore((state) => state.addNotification);

  const handleError = useCallback((
    error: unknown, 
    context?: ErrorContext,
    customMessage?: string
  ) => {
    // Log do erro para debugging
    const errorInfo = {
      error,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    console.error('🚨 Error Handler:', errorInfo);

    // Determinar mensagem de erro
    let errorMessage = customMessage;
    
    if (!errorMessage) {
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else {
        errorMessage = 'Ocorreu um erro inesperado';
      }
    }

    // Adicionar contexto à mensagem se disponível
    if (context?.component && context?.action) {
      errorMessage = `Erro em ${context.component} - ${context.action}: ${errorMessage}`;
    }

    // Mostrar notificação de erro
    addNotification({
      type: 'error',
      message: errorMessage,
      duration: context?.action === 'critical' ? 0 : 5000 // Erros críticos ficam até serem fechados
    });

    // Se for um erro crítico, também loggar no console com mais detalhes
    if (context?.action === 'critical') {
      console.error('🔥 CRITICAL ERROR:', {
        message: errorMessage,
        error,
        context,
        stack: error instanceof Error ? error.stack : undefined
      });
    }

    return errorMessage;
  }, [addNotification]);

  const handleAsyncError = useCallback(async (
    asyncOperation: () => Promise<any>,
    context?: ErrorContext,
    customMessage?: string
  ) => {
    try {
      return await asyncOperation();
    } catch (error) {
      handleError(error, context, customMessage);
      throw error; // Re-throw para que componentes possam tratar se necessário
    }
  }, [handleError]);

  const wrapAsyncAction = useCallback((
    asyncAction: (...args: any[]) => Promise<any>,
    context?: ErrorContext,
    customMessage?: string
  ) => {
    return async (...args: any[]) => {
      try {
        return await asyncAction(...args);
      } catch (error) {
        handleError(error, context, customMessage);
        throw error;
      }
    };
  }, [handleError]);

  return {
    handleError,
    handleAsyncError,
    wrapAsyncAction
  };
};

// Hook para loading states padronizados
export const useLoadingState = (initialState = false) => {
  const [loading, setLoading] = React.useState(initialState);
  const { handleError } = useErrorHandler();

  const withLoading = useCallback(async (
    asyncOperation: () => Promise<any>,
    context?: ErrorContext
  ) => {
    try {
      setLoading(true);
      const result = await asyncOperation();
      return result;
    } catch (error) {
      handleError(error, context);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError]);

  return {
    loading,
    setLoading,
    withLoading
  };
};

// Padrões de erro comuns
export const ERROR_PATTERNS = {
  NETWORK: /network|fetch|connection/i,
  AUTH: /auth|unauthorized|forbidden/i,
  VALIDATION: /validation|invalid|required/i,
  PERMISSION: /permission|access denied/i,
  NOT_FOUND: /not found|404/i
};

// Mensagens de erro amigáveis
export const ERROR_MESSAGES = {
  NETWORK: 'Problemas de conexão. Verifique sua internet e tente novamente.',
  AUTH: 'Sua sessão expirou. Faça login novamente.',
  VALIDATION: 'Por favor, verifique os dados informados.',
  PERMISSION: 'Você não tem permissão para realizar esta ação.',
  NOT_FOUND: 'O item solicitado não foi encontrado.',
  DEFAULT: 'Ocorreu um erro inesperado. Tente novamente.'
};

export default useErrorHandler;
