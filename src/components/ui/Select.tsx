import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: boolean | string;
  errorMessage?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, label, error, errorMessage, ...props }, ref) => {
    // Convert error to boolean if it's a string (for backward compatibility)
    const hasError = typeof error === 'string' ? !!error : !!error;
    // Use error as errorMessage if error is a string and no errorMessage is provided
    const errorText = typeof error === 'string' ? error : errorMessage;
    
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          className={cn(
            "w-full px-3 py-2 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all",
            hasError
              ? "border-red-300 focus:border-red-300 focus:ring-red-200 text-red-900 placeholder-red-300"
              : "border-gray-300 focus:border-brand-green focus:ring-brand-green/20 text-gray-900 placeholder-gray-400",
            props.disabled && "bg-gray-100 cursor-not-allowed opacity-75",
            className
          )}
          ref={ref}
          {...props}
        >
          {children}
        </select>
        
        {hasError && errorText && (
          <div className="flex items-center mt-1.5 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>{errorText}</span>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
