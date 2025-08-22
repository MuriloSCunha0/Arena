import React, { ReactNode } from 'react';
import { cn } from '../../utils/cn';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  actions,
  className,
  size = 'md'
}) => {
  const sizeClasses = {
    sm: {
      title: 'text-xl font-bold',
      description: 'text-sm',
      spacing: 'mb-4'
    },
    md: {
      title: 'heading-page',
      description: 'text-description',
      spacing: 'mb-6'
    },
    lg: {
      title: 'text-3xl font-bold',
      description: 'text-base text-gray-500',
      spacing: 'mb-8'
    }
  };

  return (
    <div className={cn(
      'flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4',
      sizeClasses[size].spacing,
      className
    )}>
      <div className="flex-1 min-w-0">
        <h1 className={cn(sizeClasses[size].title, 'text-brand-blue')}>
          {title}
        </h1>
        {description && (
          <p className={cn(sizeClasses[size].description, 'mt-1 leading-relaxed')}>
            {description}
          </p>
        )}
      </div>
      
      {actions && (
        <div className="flex items-center gap-3 mt-4 sm:mt-0 flex-shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
