import React from 'react';
import { Copy, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface PaymentQRCodeProps {
  qrcodeUrl: string;
  paymentCode: string;
  onCopy: () => void;
  copied: boolean;
}

export const PaymentQRCode: React.FC<PaymentQRCodeProps> = ({
  qrcodeUrl,
  paymentCode,
  onCopy,
  copied
}) => {
  return (
    <div className="flex flex-col items-center p-6 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-lg font-medium text-brand-blue mb-4">Pagamento via PIX</h3>
      
      <div className="bg-white p-3 rounded-lg shadow-sm mb-4 border border-gray-200">
        <img 
          src={qrcodeUrl} 
          alt="QR Code para pagamento PIX"
          className="w-48 h-48 object-cover"
        />
      </div>
      
      <p className="text-sm text-gray-500 mb-2">Escaneie o QR code ou copie o código PIX abaixo:</p>
      
      <div className="w-full relative mb-4">
        <div className="bg-white border border-gray-200 rounded-lg p-3 pr-20 overflow-hidden text-ellipsis whitespace-nowrap">
          <code className="text-xs">{paymentCode}</code>
        </div>
        <Button
          onClick={onCopy}
          className="absolute right-1 top-1 h-8 px-2.5"
          variant="outline"
        >
          {copied ? (
            <CheckCircle size={16} className="text-green-500" />
          ) : (
            <Copy size={16} />
          )}
        </Button>
      </div>
      
      <div className="text-sm text-center text-gray-500">
        <p className="mb-1">Após o pagamento, aguarde a confirmação.</p>
        <p>Sua inscrição será confirmada automaticamente.</p>
      </div>
    </div>
  );
};
