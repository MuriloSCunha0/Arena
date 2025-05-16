import { useState, useCallback, createContext, useContext, useEffect, ReactNode } from 'react';

interface ToastOptions {
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (options: ToastOptions) => void;
  hideToast: (id: string) => void;
  clearToasts: () => void;
}

const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  showToast: () => {},
  hideToast: () => {},
  clearToasts: () => {},
});

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Remove a toast by ID
  const hideToast = useCallback((id: string) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  }, []);

  // Add a new toast
  const showToast = useCallback((options: ToastOptions) => {
    const id = Date.now().toString();
    const toast: Toast = {
      id,
      ...options,
      duration: options.duration || 5000, // Default 5 seconds
    };

    setToasts((prevToasts) => [...prevToasts, toast]);

    // Auto-remove after duration
    setTimeout(() => {
      hideToast(id);
    }, toast.duration);
  }, [hideToast]);

  // Clear all toasts
  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, clearToasts }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
};

// The actual toast UI component
const ToastContainer = () => {
  const { toasts, hideToast } = useContext(ToastContext);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-0 right-0 p-4 w-full md:max-w-sm z-50">
      <div className="flex flex-col space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-lg p-4 flex items-start shadow-lg transform transition-all duration-300 ${
              toast.type === 'success' ? 'bg-green-50 border-l-4 border-green-500' :
              toast.type === 'error' ? 'bg-red-50 border-l-4 border-red-500' :
              toast.type === 'warning' ? 'bg-yellow-50 border-l-4 border-yellow-500' :
              'bg-blue-50 border-l-4 border-blue-500'
            }`}
          >
            <div className="flex-1">
              <div className={`font-medium ${
                toast.type === 'success' ? 'text-green-800' :
                toast.type === 'error' ? 'text-red-800' :
                toast.type === 'warning' ? 'text-yellow-800' :
                'text-blue-800'
              }`}>
                {toast.title}
              </div>
              <div className={`text-sm mt-1 ${
                toast.type === 'success' ? 'text-green-700' :
                toast.type === 'error' ? 'text-red-700' :
                toast.type === 'warning' ? 'text-yellow-700' :
                'text-blue-700'
              }`}>
                {toast.message}
              </div>
            </div>
            <button
              onClick={() => hideToast(toast.id)}
              className={`ml-4 text-sm ${
                toast.type === 'success' ? 'text-green-500 hover:text-green-700' :
                toast.type === 'error' ? 'text-red-500 hover:text-red-700' :
                toast.type === 'warning' ? 'text-yellow-500 hover:text-yellow-700' :
                'text-blue-500 hover:text-blue-700'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

// Custom hook to use the toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
