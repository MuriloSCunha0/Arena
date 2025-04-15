import React from 'react';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  className,
  actions,
}) => {
  return (
    <div className={cn(
      "flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6",
      className
    )}>
      <div>
        <h1 className="text-2xl font-bold text-brand-blue">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center space-x-2 mt-2 sm:mt-0">
          {actions}
        </div>
      )}
    </div>
  );
};
