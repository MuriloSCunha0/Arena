import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  textarea?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, textarea, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          {textarea ? (
            <textarea
              className={`w-full px-${icon ? '10' : '3'} py-2 border rounded-lg shadow-sm 
                ${error ? 'border-red-500 focus:ring-red-500' : 'border-brand-gray focus:ring-brand-green'} 
                focus:outline-none focus:ring-2`}
              {...props as any}
              ref={ref as any}
              rows={4}
            />
          ) : (
            <input
              ref={ref}
              className={`w-full px-${icon ? '10' : '3'} py-2 border rounded-lg shadow-sm 
                ${error ? 'border-red-500 focus:ring-red-500' : 'border-brand-gray focus:ring-brand-green'} 
                focus:outline-none focus:ring-2`}
              {...props}
            />
          )}
        </div>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );  }
);

Input.displayName = 'Input'; // Helps with error messages

export { Input };