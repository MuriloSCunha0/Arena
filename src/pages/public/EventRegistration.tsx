import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, MapPin, DollarSign, Users, Info, Loader2, Check } from 'lucide-react';
import { EventsService } from '../../services/supabase/events';
import { Event, TeamFormationType } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PaymentQRCode } from '../../components/registration/PaymentQRCode';
import { PixPaymentService } from '../../services/payment/pixProcessor';
import { formatCurrency } from '../../utils/formatters';

enum RegistrationStep {
  LOADING,
  FORM,
  PAYMENT,
  CONFIRMATION
}

export const EventRegistration: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<RegistrationStep>(RegistrationStep.LOADING);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    birthDate: '',
    phone: '',
    email: '',
    partnerName: '',
    paymentMethod: 'PIX'
  });
  
  // Payment state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [pixQrcode, setPixQrcode] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  
  // Load event data
  useEffect(() => {
    const fetchEvent = async () => {
      try {
        if (!eventId) {
          setError('ID do evento não fornecido');
          return;
        }
        
        const eventData = await EventsService.getByIdWithOrganizer(eventId);
        if (!eventData) {
          setError('Evento não encontrado');
          return;
        }
        
        setEvent(eventData);
        setStep(RegistrationStep.FORM);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Erro ao carregar informações do evento');
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!event) return;
    
    setPaymentProcessing(true);
    
    try {
      // 1. Register participant
      const participant = await EventsService.registerParticipant(event.id, {
        name: formData.name,
        birthDate: formData.birthDate,
        phone: formData.phone,
        email: formData.email,
        partnerName: event.teamFormation === TeamFormationType.FORMED ? formData.partnerName : undefined,
        paymentMethod: formData.paymentMethod,
        paymentStatus: 'PENDING'
      });
      
      setParticipantId(participant.id);
      
      // 2. Process payment if PIX
      if (formData.paymentMethod === 'PIX') {
        const paymentResult = await PixPaymentService.generatePayment(
          event.id,
          participant.id,
          event.price || 0,
          formData.name
        );
        
        if (paymentResult.success) {
          setPixCode(paymentResult.paymentCode || '');
          setPixQrcode(paymentResult.qrcodeUrl || '');
          setTransactionId(paymentResult.transactionId || '');
          setStep(RegistrationStep.PAYMENT);
        } else {
          setError(`Erro ao gerar pagamento PIX: ${paymentResult.message}`);
        }
      } else {
        // For other payment methods, just show confirmation
        setStep(RegistrationStep.CONFIRMATION);
      }
    } catch (err: any) {
      setError(`Erro ao processar inscrição: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setPaymentProcessing(false);
    }
  };
  
  const handleCopyPix = () => {
    navigator.clipboard.writeText(pixCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 3000);
  };
  
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-16">
          <Loader2 size={36} className="animate-spin text-brand-green" />
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="text-center py-16">
          <div className="text-red-500 mb-4">{error}</div>
          <Button onClick={() => navigate('/')}>Voltar</Button>
        </div>
      );
    }
    
    if (!event) {
      return (
        <div className="text-center py-16">
          <div className="text-gray-500 mb-4">Evento não encontrado</div>
          <Button onClick={() => navigate('/')}>Voltar</Button>
        </div>
      );
    }
    
    switch (step) {
      case RegistrationStep.FORM:
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Event Info */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-brand-blue mb-4">{event.title}</h2>
              <p className="text-gray-600 mb-6">{event.description}</p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <Calendar className="text-brand-purple mr-2 mt-1" size={18} />
                  <div>
                    <p className="font-medium">Data e Hora</p>
                    <p className="text-gray-600">
                      {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <MapPin className="text-brand-purple mr-2 mt-1" size={18} />
                  <div>
                    <p className="font-medium">Local</p>
                    <p className="text-gray-600">{event.location}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <DollarSign className="text-brand-purple mr-2 mt-1" size={18} />
                  <div>
                    <p className="font-medium">Valor da Inscrição</p>
                    <p className="text-gray-600">{formatCurrency(event.price || 0)}</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Users className="text-brand-purple mr-2 mt-1" size={18} />
                  <div>
                    <p className="font-medium">Formato das Equipes</p>
                    <p className="text-gray-600">
                      {event.teamFormation === TeamFormationType.FORMED ? 'Duplas formadas' : 'Duplas aleatórias'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <Info className="text-brand-purple mr-2 mt-1" size={18} />
                  <div>
                    <p className="font-medium">Categorias</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.categories?.map(category => (
                        <span key={category} className="bg-brand-purple/10 text-brand-purple text-xs px-2 py-0.5 rounded-full">
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Registration Form */}
            <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
              <h2 className="text-xl font-bold text-brand-blue mb-4">Formulário de Inscrição</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  label="Nome Completo"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  type="date"
                  label="Data de Nascimento"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleInputChange}
                  required
                />
                
                <Input
                  label="Telefone (WhatsApp)"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="DDD + número"
                  required
                />
                
                <Input
                  type="email"
                  label="Email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
                
                {event.teamFormation === TeamFormationType.FORMED && (
                  <Input
                    label="Nome do Parceiro (Dupla)"
                    name="partnerName"
                    value={formData.partnerName}
                    onChange={handleInputChange}
                    required
                  />
                )}
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pagamento
                  </label>
                  <select
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
                    required
                  >
                    <option value="PIX">PIX</option>
                    <option value="CASH">Dinheiro (no local)</option>
                  </select>
                </div>
                
                <div className="border-t pt-4 mt-6">
                  <p className="text-sm text-gray-500 mb-4">
                    Ao concluir sua inscrição, você concorda com os termos e regras deste evento.
                  </p>
                  
                  <Button
                    type="submit"
                    className="w-full"
                    loading={paymentProcessing}
                  >
                    {paymentProcessing ? 'Processando...' : 'Finalizar Inscrição'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        );
        
      case RegistrationStep.PAYMENT:
        return (
          <div className="max-w-md mx-auto">
            <PaymentQRCode
              qrcodeUrl={pixQrcode}
              paymentCode={pixCode}
              onCopy={handleCopyPix}
              copied={codeCopied}
            />
            
            <div className="mt-8 text-center">
              <Button 
                onClick={() => setStep(RegistrationStep.CONFIRMATION)} 
                variant="outline"
              >
                Já realizei o pagamento
              </Button>
            </div>
          </div>
        );
        
      case RegistrationStep.CONFIRMATION:
        return (
          <div className="max-w-md mx-auto text-center">
            <div className="flex justify-center mb-6">
              <div className="bg-green-100 rounded-full p-4">
                <Check className="text-green-600" size={36} />
              </div>
            </div>
            
            <h2 className="text-xl font-bold text-brand-blue mb-2">Inscrição Realizada!</h2>
            <p className="text-gray-600 mb-6">
              {formData.paymentMethod === 'PIX' 
                ? 'Sua inscrição foi recebida e será confirmada assim que o pagamento for identificado.'
                : 'Sua inscrição foi recebida. Realize o pagamento no dia do evento.'}
            </p>
            
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
              <div className="text-sm">
                <p className="font-medium">Nome: {formData.name}</p>
                <p className="font-medium mt-1">Evento: {event.title}</p>
                <p className="text-gray-500 mt-1">
                  {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                </p>
                {formData.paymentMethod === 'PIX' && (
                  <p className="text-green-600 mt-1">PIX enviado - aguardando confirmação</p>
                )}
              </div>
            </div>
            
            <Button onClick={() => navigate('/')}>Voltar</Button>
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold text-brand-blue">Inscrição em Evento</h1>
        <p className="text-gray-600">Arena Conexão</p>
      </header>
      
      {renderContent()}
    </div>
  );
};
