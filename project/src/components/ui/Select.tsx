import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle } from 'lucide-react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
  errorMessage?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, error, errorMessage, ...props }, ref) => {
    return (
      <div className="w-full">
        <select
          className={cn(
            "w-full px-3 py-2 border rounded-md appearance-none focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all",
            error
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
        
        {error && errorMessage && (
          <div className="flex items-center mt-1.5 text-sm text-red-500">
            <AlertCircle className="h-4 w-4 mr-1" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
