import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnChange?: any[];
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  // Reset state when specified props change
  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetOnChange && 
        prevProps.resetOnChange !== this.props.resetOnChange) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Erro capturado pelo ErrorBoundary:", error);
    console.error("Detalhes do componente:", errorInfo.componentStack);
    
    this.setState({
      error,
      errorInfo
    });
    
    // Callback para logging externo ou outras ações
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
    
    // Opcionalmente, você pode enviar o erro para um serviço de logging
    // reportErrorToService(error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private formatDatabaseError(error: any): string {
    // Verificar se é um erro de banco de dados PostgreSQL
    if (error && error.code === '23514') {
      // Constraint violations
      if (error.message?.includes('users_cpf_format')) {
        return 'O CPF informado está em um formato inválido. Use o formato xxx.xxx.xxx-xx';
      }
      if (error.message?.includes('users_phone_format')) {
        return 'O telefone informado está em um formato inválido. Use o formato (xx) xxxxx-xxxx';
      }
      // Outros erros de constraint podem ser adicionados aqui
      return 'Um campo do formulário contém dados em formato inválido.';
    }
    
    // Se não for um erro de banco de dados específico, retorne a mensagem original
    return error?.toString() || 'Erro desconhecido';
  }

  public render() {
    if (this.state.hasError) {
      // Se definido um fallback personalizado, use-o
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Componente de fallback padrão
      return (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg max-w-3xl mx-auto my-8">
          <div className="flex items-center mb-4">
            <AlertCircle size={24} className="text-red-500 mr-3" />            <h2 className="text-xl font-medium text-red-700">Ops! Algo deu errado</h2>
          </div>
          
          <p className="text-sm text-red-600 mb-4">
            Ocorreu um erro inesperado nesta parte da aplicação. Tente recarregar a página ou voltar para a página inicial.
          </p>
          
          {/* Mostrar detalhes do erro apenas em ambiente de desenvolvimento */}
          {import.meta.env.DEV && (
            <div className="bg-white p-4 rounded border border-red-100 overflow-auto max-h-64 text-xs font-mono mb-6 text-gray-700">
              <p className="font-bold mb-2">Detalhes do erro (apenas em desenvolvimento):</p>
              <p className="text-red-600 mb-2">
                {this.state.error ? this.formatDatabaseError(this.state.error) : 'Erro desconhecido'}
              </p>
              <hr className="my-2 border-red-100" />
              <pre>{this.state.errorInfo?.componentStack}</pre>
            </div>
          )}
          
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={this.handleReset}
              variant="outline"
              className="flex items-center"
            >
              <RefreshCw size={16} className="mr-1" />
              Tentar novamente
            </Button>
            
            <Button 
              onClick={this.handleReload}
              className="flex items-center"
            >
              <RefreshCw size={16} className="mr-1" />
              Recarregar página
            </Button>
            
            <Button 
              onClick={this.handleGoHome}
              variant="outline"
              className="flex items-center"
            >
              <Home size={16} className="mr-1" />
              Voltar ao início
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
