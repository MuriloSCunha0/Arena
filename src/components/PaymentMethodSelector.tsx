import React from 'react';
import { CreditCard, Landmark, Wallet, QrCode } from 'lucide-react';

interface PaymentMethodSelectorProps {
  value: string;
  onChange: (method: string) => void;
}

export const PaymentMethodSelector: React.FC<PaymentMethodSelectorProps> = ({
  value,
  onChange
}) => {
  const methods = [
    { id: 'PIX', label: 'PIX', icon: QrCode },
    { id: 'CARD', label: 'Cartão', icon: CreditCard },
    { id: 'BANK', label: 'Transferência', icon: Landmark },
    { id: 'CASH', label: 'Dinheiro', icon: Wallet }
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {methods.map((method) => {
        const isSelected = value === method.id;
        const Icon = method.icon;
        
        return (
          <div
            key={method.id}
            className={`
              p-3 border rounded-md cursor-pointer flex-1 min-w-[120px] flex flex-col items-center
              ${isSelected 
                ? 'bg-brand-blue text-white border-brand-blue' 
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}
            `}
            onClick={() => onChange(method.id)}
          >
            <Icon size={24} className="mb-1" />
            <span className="text-sm">{method.label}</span>
          </div>
        );
      })}
    </div>
  );
};
