import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="w-full">
        <textarea
          className={cn(
            "w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2",
            error
              ? "border-red-300 focus:border-red-300 focus:ring-red-300"
              : "border-brand-gray focus:border-brand-green focus:ring-brand-green/20",
            className
          )}
          ref={ref}
          {...props}
        />
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
