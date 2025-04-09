import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    // Base classes for all buttons
    const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
    
    // Size-specific classes
    const sizeClasses = {
      sm: 'py-1.5 px-3 text-sm',
      md: 'py-2 px-4 text-base',
      lg: 'py-2.5 px-5 text-lg'
    };
    
    // Variant-specific classes
    const variantClasses = {
      primary: 'bg-brand-green text-brand-blue hover:bg-opacity-90',
      outline: 'bg-transparent border border-brand-gray text-brand-blue hover:bg-brand-gray/10',
      danger: 'bg-red-500 text-white hover:bg-red-600'
    };
    
    return (
      <button
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          loading && 'opacity-70',
          className
        )}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';