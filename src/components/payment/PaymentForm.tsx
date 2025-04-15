import React, { useState } from 'react';
import { CreditCard, Smartphone, QrCode, Copy, CheckCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { PaymentGatewayService } from '../../services/payment/paymentGatewayService';

interface PaymentFormProps {
  amount: number;
  description: string;
  customerName: string;
  customerEmail: string;
  onPaymentGenerated?: (paymentData: any) => void;
  onSuccess?: () => void;
}

export const PaymentForm: React.FC<PaymentFormProps> = ({
  amount,
  description,
  customerName,
  customerEmail,
  onPaymentGenerated,
  onSuccess
}) => {
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CARD'>('PIX');
  const [customerDocument, setCustomerDocument] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let result;
      
      if (paymentMethod === 'PIX') {
        result = await PaymentGatewayService.generatePixPayment({
          amount,
          description,
          customerName,
          customerEmail,
          customerDocument: customerDocument || undefined
        });
      } else {
        result = await PaymentGatewayService.generateCardPaymentLink({
          amount,
          description,
          customerName,
          customerEmail,
          customerDocument: customerDocument || undefined
        });
      }
      
      setPaymentData(result);
      
      if (onPaymentGenerated) {
        onPaymentGenerated(result);
      }
    } catch (error) {
      console.error('Erro ao gerar pagamento:', error);
      // TODO: Mostrar mensagem de erro
    } finally {
      setLoading(false);
    }
  };
  
  const handleCopy = () => {
    if (paymentData?.qrCodeText) {
      navigator.clipboard.writeText(paymentData.qrCodeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleCardPayment = () => {
    if (paymentData?.paymentLink) {
      window.open(paymentData.paymentLink, '_blank');
    }
  };
  
  return (
    <div className="space-y-6">
      {!paymentData ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">Método de Pagamento</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div
              className={`border rounded-lg p-4 flex items-center cursor-pointer ${
                paymentMethod === 'PIX' ? 'border-brand-green bg-brand-green/10' : 'border-gray-200'
              }`}
              onClick={() => setPaymentMethod('PIX')}
            >
              <QrCode className={`${paymentMethod === 'PIX' ? 'text-brand-green' : 'text-gray-400'} mr-2`} size={20} />
              <span className="font-medium">PIX</span>
            </div>
            
            <div
              className={`border rounded-lg p-4 flex items-center cursor-pointer ${
                paymentMethod === 'CARD' ? 'border-brand-green bg-brand-green/10' : 'border-gray-200'
              }`}
              onClick={() => setPaymentMethod('CARD')}
            >
              <CreditCard className={`${paymentMethod === 'CARD' ? 'text-brand-green' : 'text-gray-400'} mr-2`} size={20} />
              <span className="font-medium">Cartão</span>
            </div>
          </div>
          
          <div className="mt-6">
            <Input
              label="CPF/CNPJ (opcional)"
              value={customerDocument}
              onChange={(e) => setCustomerDocument(e.target.value)}
              placeholder="Digite o CPF ou CNPJ para nota fiscal"
            />
            <p className="text-xs text-gray-500 mt-1">
              O documento é necessário para emissão de nota fiscal
            </p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg mt-4">
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">Valor:</span>
              <span className="font-medium text-gray-900">R$ {amount.toFixed(2).replace('.', ',')}</span>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-sm text-gray-500">Descrição:</span>
              <span className="text-sm text-gray-900">{description}</span>
            </div>
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-4"
          >
            {loading ? 'Gerando pagamento...' : 'Continuar para pagamento'}
          </Button>
        </form>
      ) : (
        <div className="space-y-6">
          <div className="text-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              {paymentMethod === 'PIX' ? 'QR Code PIX' : 'Link de Pagamento'}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {paymentMethod === 'PIX' 
                ? 'Escaneie o QR code abaixo com o aplicativo do seu banco'
                : 'Clique no botão abaixo para ir para a página de pagamento'}
            </p>
          </div>
          
          {paymentMethod === 'PIX' && paymentData?.qrCode && (
            <div className="flex flex-col items-center">
              <div className="border-2 border-brand-green rounded-lg p-2 mb-4">
                <img 
                  src={paymentData.qrCode} 
                  alt="QR Code PIX" 
                  className="w-64 h-64"
                />
              </div>
              
              <div className="w-full bg-gray-50 p-3 rounded-lg flex items-center justify-between">
                <div className="truncate flex-1 pr-2">
                  <span className="text-xs text-gray-500 block">PIX Copia e Cola:</span>
                  <span className="text-xs font-mono">{paymentData.qrCodeText.substring(0, 20)}...</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleCopy}
                  className="flex-shrink-0"
                >
                  {copied 
                    ? <CheckCircle size={16} className="text-brand-green" />
                    : <Copy size={16} />
                  }
                  {copied ? 'Copiado!' : 'Copiar'}
                </Button>
              </div>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                O pagamento será confirmado automaticamente.
                <br />Este QR Code é válido por 1 hora.
              </p>
            </div>
          )}
          
          {paymentMethod === 'CARD' && paymentData?.paymentLink && (
            <div className="flex flex-col items-center">
              <div className="text-center mb-4">
                <CreditCard size={64} className="text-brand-green mx-auto" />
              </div>
              
              <Button 
                onClick={handleCardPayment}
                className="w-full"
              >
                Ir para página de pagamento
              </Button>
              
              <p className="text-xs text-gray-500 mt-4 text-center">
                Você será redirecionado para uma página segura de pagamento.
                <br />Este link é válido por 24 horas.
              </p>
            </div>
          )}
          
          {onSuccess && (
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={onSuccess}
            >
              Concluir
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
