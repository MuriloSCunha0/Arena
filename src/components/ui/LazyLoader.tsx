import React, { Suspense, lazy, ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyLoaderProps {
  component: () => Promise<{ default: ComponentType<any> }>;
  props?: Record<string, any>;
  fallback?: React.ReactNode;
}

/**
 * Componente para carregar componentes de forma lazy com Suspense
 */
export const LazyLoader: React.FC<LazyLoaderProps> = ({ 
  component, 
  props = {}, 
  fallback 
}) => {
  const LazyComponent = lazy(component);
  
  const defaultFallback = (
    <div className="flex justify-center items-center py-12">
      <Loader2 size={32} className="animate-spin text-brand-green" />
    </div>
  );
  
  return (
    <Suspense fallback={fallback || defaultFallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

/**
 * HOC para criar um componente com carregamento lazy
 */
export function withLazyLoading<T>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  loadingComponent?: React.ReactNode
) {
  return (props: T) => (
    <LazyLoader 
      component={importFn} 
      props={props as Record<string, any>} 
      fallback={loadingComponent} 
    />
  );
}
