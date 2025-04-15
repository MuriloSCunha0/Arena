import React, { createContext, useContext, useState } from 'react';
import { cn } from '../../utils/cn';

// Context to share the active tab value between components
type TabsContextValue = {
  value: string;
  onValueChange: (value: string) => void;
};

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

function useTabs() {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within a Tabs provider');
  }
  return context;
}

// Root Tabs component
interface TabsProps {
  defaultValue: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function Tabs({
  defaultValue,
  value,
  onValueChange,
  children,
  className,
}: TabsProps) {
  const [tabValue, setTabValue] = useState(defaultValue);
  
  const currentValue = value !== undefined ? value : tabValue;
  const changeValue = onValueChange || setTabValue;
  
  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: changeValue }}>
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </TabsContext.Provider>
  );
}

// TabsList component - container for tab triggers
interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn('flex border-b border-brand-gray overflow-x-auto', className)}>
      {children}
    </div>
  );
}

// TabsTrigger component - clickable tab button
interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { value: activeValue, onValueChange } = useTabs();
  const isActive = activeValue === value;
  
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      className={cn(
        'flex items-center px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors',
        isActive 
          ? 'text-brand-green border-b-2 border-brand-green' 
          : 'text-gray-500 hover:text-brand-blue hover:bg-gray-50',
        className
      )}
      onClick={() => onValueChange(value)}
    >
      {children}
    </button>
  );
}

// TabsContent component - content shown when tab is active
interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { value: activeValue } = useTabs();
  
  if (activeValue !== value) {
    return null;
  }
  
  return (
    <div 
      role="tabpanel"
      className={cn('pt-4', className)}
    >
      {children}
    </div>
  );
}
