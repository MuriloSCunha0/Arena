import React, { createContext, useContext, useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

type TooltipProviderProps = {
  children: React.ReactNode;
  delayDuration?: number;
  skipDelayDuration?: number;
};

type TooltipContextValue = {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  delayDuration: number;
  skipDelayDuration: number;
};

const TooltipContext = createContext<TooltipContextValue | null>(null);

export function TooltipProvider({
  children,
  delayDuration = 700,
  skipDelayDuration = 300,
}: TooltipProviderProps) {
  const [open, setOpen] = useState(false);

  return (
    <TooltipContext.Provider
      value={{
        open,
        setOpen,
        delayDuration,
        skipDelayDuration,
      }}
    >
      {children}
    </TooltipContext.Provider>
  );
}

function useTooltip() {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error('useTooltip must be used within a TooltipProvider');
  }
  return context;
}

type TooltipProps = {
  children: React.ReactNode;
  defaultOpen?: boolean;
};

export function Tooltip({ children }: TooltipProps) {
  const [triggerElement, setTriggerElement] = useState<HTMLElement | null>(null);
  const [contentElement, setContentElement] = useState<HTMLElement | null>(null);

  return (
    <div className="inline-block">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === TooltipTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              ref: setTriggerElement,
            });
          }
          
          if (child.type === TooltipContent) {
            return React.cloneElement(child as React.ReactElement<any>, {
              triggerRef: triggerElement,
              ref: setContentElement,
            });
          }
          
          return child;
        }
        return child;
      })}
    </div>
  );
}

type TooltipTriggerProps = {
  children: React.ReactNode;
  asChild?: boolean;
  className?: string;
};

export const TooltipTrigger = React.forwardRef<HTMLSpanElement, TooltipTriggerProps>(
  ({ children, className = '', ...props }, forwardedRef) => {
    const { setOpen } = useTooltip();
    const ref = useRef<HTMLSpanElement>(null);
    
    useEffect(() => {
      if (forwardedRef && typeof forwardedRef === 'function') {
        forwardedRef(ref.current);
      } else if (forwardedRef) {
        forwardedRef.current = ref.current;
      }
    }, [forwardedRef]);

    return (
      <span
        ref={ref}
        className={`inline-block ${className}`}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        {...props}
      >
        {children}
      </span>
    );
  }
);

TooltipTrigger.displayName = 'TooltipTrigger';

type TooltipContentProps = {
  children: React.ReactNode;
  className?: string;
  sideOffset?: number;
  alignOffset?: number;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  triggerRef?: HTMLElement | null;
};

export const TooltipContent = React.forwardRef<HTMLDivElement, TooltipContentProps>(
  (
    {
      children,
      className = '',
      sideOffset = 4,
      alignOffset = 0,
      side = 'top',
      align = 'center',
      triggerRef,
      ...props
    },
    forwardedRef
  ) => {
    const { open } = useTooltip();
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const contentRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
      if (forwardedRef && typeof forwardedRef === 'function') {
        forwardedRef(contentRef.current);
      } else if (forwardedRef) {
        forwardedRef.current = contentRef.current;
      }
    }, [forwardedRef]);

    useEffect(() => {
      if (open && triggerRef && contentRef.current) {
        const triggerRect = triggerRef.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        
        let top = 0;
        let left = 0;
        
        // Calculate position based on side
        switch (side) {
          case 'top':
            top = triggerRect.top - contentRect.height - sideOffset;
            break;
          case 'bottom':
            top = triggerRect.bottom + sideOffset;
            break;
          case 'left':
            left = triggerRect.left - contentRect.width - sideOffset;
            break;
          case 'right':
            left = triggerRect.right + sideOffset;
            break;
        }
        
        // Adjust horizontal position for top/bottom
        if (side === 'top' || side === 'bottom') {
          if (align === 'start') {
            left = triggerRect.left + alignOffset;
          } else if (align === 'end') {
            left = triggerRect.right - contentRect.width - alignOffset;
          } else {
            left = triggerRect.left + (triggerRect.width / 2) - (contentRect.width / 2);
          }
        }
        
        // Adjust vertical position for left/right
        if (side === 'left' || side === 'right') {
          if (align === 'start') {
            top = triggerRect.top + alignOffset;
          } else if (align === 'end') {
            top = triggerRect.bottom - contentRect.height - alignOffset;
          } else {
            top = triggerRect.top + (triggerRect.height / 2) - (contentRect.height / 2);
          }
        }
        
        // Adjust position with window boundaries
        const viewportMargin = 8;
        const { innerWidth, innerHeight } = window;
        
        // Ensure tooltip doesn't go off-screen horizontally
        if (left < viewportMargin) {
          left = viewportMargin;
        } else if (left + contentRect.width > innerWidth - viewportMargin) {
          left = innerWidth - contentRect.width - viewportMargin;
        }
        
        // Ensure tooltip doesn't go off-screen vertically
        if (top < viewportMargin) {
          top = viewportMargin;
        } else if (top + contentRect.height > innerHeight - viewportMargin) {
          top = innerHeight - contentRect.height - viewportMargin;
        }
        
        // Adjust for scroll position
        top += window.scrollY;
        left += window.scrollX;
        
        setPosition({ top, left });
      }
    }, [open, triggerRef, side, sideOffset, align, alignOffset]);
    
    if (!open) return null;
    
    return createPortal(
      <div
        ref={contentRef}
        className={`
          absolute z-50 bg-gray-800 text-white text-sm py-1 px-2 rounded-md shadow-md max-w-xs
          ${className}
        `}
        style={{
          position: 'absolute',
          top: `${position.top}px`,
          left: `${position.left}px`,
        }}
        {...props}
      >
        {children}
      </div>,
      document.body
    );
  }
);

TooltipContent.displayName = 'TooltipContent';