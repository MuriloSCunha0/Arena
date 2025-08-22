import React, { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant = 'primary', 
    size = 'md', 
    loading, 
    disabled, 
    fullWidth,
    children, 
    ...props 
  }, ref) => {
    // Base classes for all buttons
    const baseClasses = `
      inline-flex items-center justify-center rounded-xl font-medium 
      transition-all duration-200 focus-ring disabled:opacity-50 
      disabled:pointer-events-none disabled:cursor-not-allowed
      active:scale-95 transform
    `;
    
    // Size-specific classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm h-8',
      md: 'px-4 py-2 text-base h-10',
      lg: 'px-6 py-2.5 text-lg h-12',
      xl: 'px-8 py-3 text-xl h-14'
    };
    
    // Variant-specific classes
    const variantClasses = {
      primary: `
        bg-gradient-to-r from-brand-green to-brand-green-light 
        text-brand-blue hover:from-brand-green-dark hover:to-brand-green
        shadow-md hover:shadow-lg border border-brand-green/20
      `,
      secondary: `
        bg-gradient-to-r from-brand-purple to-brand-purple-light 
        text-white hover:from-brand-purple-dark hover:to-brand-purple
        shadow-md hover:shadow-lg border border-brand-purple/20
      `,
      outline: `
        bg-transparent border-2 border-brand-gray text-brand-blue 
        hover:bg-brand-sand hover:border-brand-green
      `,
      ghost: `
        bg-transparent text-brand-blue hover:bg-brand-sand
      `,
      danger: `
        bg-gradient-to-r from-red-500 to-red-600 
        text-white hover:from-red-600 hover:to-red-700
        shadow-md hover:shadow-lg border border-red-500/20
      `,
      success: `
        bg-gradient-to-r from-emerald-500 to-emerald-600 
        text-white hover:from-emerald-600 hover:to-emerald-700
        shadow-md hover:shadow-lg border border-emerald-500/20
      `
    };
    
    const widthClass = fullWidth ? 'w-full' : '';
    
    return (
      <button
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          widthClass,
          loading && 'opacity-70 cursor-not-allowed',
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