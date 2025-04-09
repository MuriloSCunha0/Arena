import React from 'react';
import { Loader2 } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

interface FinancialSummaryCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  loading?: boolean;
}

export const FinancialSummaryCard: React.FC<FinancialSummaryCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
  loading = false
}) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          {loading ? (
            <div className="mt-2">
              <Loader2 size={20} className="animate-spin text-brand-gray" />
            </div>
          ) : (
            <p className="text-2xl font-bold text-brand-blue mt-1">{formatCurrency(value)}</p>
          )}
        </div>
        <div className={`p-3 rounded-full ${bgColor}`}>
          <Icon className={`text-${color.replace('bg-', '')}`} size={20} />
        </div>
      </div>
    </div>
  );
};
