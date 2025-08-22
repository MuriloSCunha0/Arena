import React, { forwardRef, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { cn } from '../../utils/cn';

interface BaseInputProps {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
  helpText?: string;
  required?: boolean;
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement>, BaseInputProps {
  textarea?: false;
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {
  textarea: true;
  rows?: number;
}

type CombinedInputProps = InputProps | TextareaProps;

const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, CombinedInputProps>(
  ({ label, error, icon, helpText, textarea, className, required, ...props }, ref) => {
    const baseInputClasses = `
      w-full border rounded-xl shadow-sm transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-50
    `;
    
    const inputClasses = cn(
      baseInputClasses,
      error 
        ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
        : 'border-brand-gray focus:border-brand-green',
      icon ? 'pl-10' : 'px-4',
      textarea ? 'py-3' : 'py-2.5',
      'text-base placeholder:text-gray-400',
      className
    );

    const labelClasses = cn(
      'block text-sm font-medium mb-2',
      error ? 'text-red-700' : 'text-gray-700'
    );

    return (
      <div className="w-full">
        {label && (
          <label className={labelClasses}>
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none">
              {icon}
            </div>
          )}
          
          {textarea ? (
            <textarea
              className={inputClasses}
              ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
              rows={(props as TextareaProps).rows || 4}
              {...(props as TextareaProps)}
            />
          ) : (
            <input
              ref={ref as React.ForwardedRef<HTMLInputElement>}
              className={inputClasses}
              {...(props as InputProps)}
            />
          )}
        </div>
        
        {helpText && !error && (
          <p className="mt-1 text-sm text-gray-500">{helpText}</p>
        )}
        
        {error && (
          <p className="mt-1 text-sm text-red-600 flex items-center">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };