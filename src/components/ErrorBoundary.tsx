import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
    
    // Log the error for debugging purposes
    console.error("Error caught by ErrorBoundary:", error);
    console.error("Component stack trace:", errorInfo.componentStack);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
    
    // Force a hard reload of the page
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-white p-8 rounded-lg shadow-lg border border-red-100 max-w-md">
            <div className="flex justify-center mb-4">
              <AlertOctagon className="h-16 w-16 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-red-700 mb-2">Algo deu errado</h1>
            <p className="text-gray-600 mb-4">
              Ocorreu um erro inesperado na aplicação. Isso pode ser devido a problemas de conectividade 
              com o servidor ou dados inválidos.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="bg-red-50 p-4 rounded-md mb-4 overflow-auto text-left">
                <p className="text-red-800 font-mono text-sm">
                  {this.state.error.toString()}
                </p>
              </div>
            )}
            <Button 
              onClick={this.handleReset} 
              className="w-full"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
