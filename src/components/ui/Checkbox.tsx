import React, { forwardRef } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean | 'indeterminate') => void;
}

export const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, ...props }, ref) => {
    return (
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        ref={ref}
        className={cn(
          "h-4 w-4 rounded border flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green/20 focus:ring-offset-1",
          checked ? "bg-brand-green border-brand-green" : "bg-white border-gray-300",
          className
        )}
        onClick={() => onCheckedChange?.(!checked)}
        {...props}
      >
        {checked && <Check className="h-3 w-3 text-white stroke-[3]" />}
      </button>
    );
  }
);

Checkbox.displayName = "Checkbox";
