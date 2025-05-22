import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { User, AlertCircle, Check, ArrowLeft, Users, QrCode } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNotificationStore } from '../../components/ui/Notification';
import { useAuth } from '../../hooks/useAuth';
import { useParticipant } from '../../hooks/useParticipant';
import { formatCurrency, formatCPF, formatPhone, formatDate } from '../../utils/formatters';
import { validateCPF } from '../../utils/validation';
import { supabase } from '../../lib/supabase';
import { EventDetail } from '../../types';
import { UserSearchInput } from '../../components/UserSearchInput';
import { PaymentMethodSelector } from '../../components/PaymentMethodSelector';
import { PaymentService } from '../../services/supabase/paymentService';

export const EventRegistration: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const { user, isAuth, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const addNotification = useNotificationStore(state => state.addNotification);
  const { registerForEvent, checkEventRegistration, invitePartner, loading: participantLoading } = useParticipant();

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerData, setPartnerData] = useState<any | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    birthDate: '',
    paymentMethod: 'PIX'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccessScreen, setShowSuccessScreen] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);

  // Carregar dados do evento
  useEffect(() => {
    const fetchEvent = async () => {
      if (!eventId) return;
      
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, organizers(*)')
          .eq('id', eventId)
          .single();
          
        if (error) throw error;
        setEvent(data as EventDetail);
      } catch (error) {
        console.error('Error fetching event:', error);
        addNotification({
          type: 'error',
          message: 'Não foi possível carregar os dados do evento'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchEvent();
  }, [eventId, addNotification]);

  // Verificar se usuário já está inscrito
  useEffect(() => {
    const checkRegistration = async () => {
      if (!eventId || !user) return;
      
      try {
        const participant = await checkEventRegistration(user.id, eventId);
        if (participant) {
          setIsAlreadyRegistered(true);
          addNotification({
            type: 'info',
            message: 'Você já está inscrito neste evento'
          });
        }
      } catch (error) {
        console.error('Error checking registration:', error);
      }
    };
    
    if (user) {
      // Preencher dados do formulário com informações do usuário
      const fetchUserData = async () => {
        try {
          const { data: userData, error } = await supabase
            .from('users')
            .select('full_name, email, phone, cpf, birth_date')
            .eq('id', user.id)
            .single();
            
          if (error) throw error;
          
          setFormData({
            name: userData.full_name || '',
            email: userData.email || '',
            phone: userData.phone || '',
            cpf: userData.cpf || '',
            birthDate: userData.birth_date || '',
            paymentMethod: 'PIX'
          });
        } catch (error) {
          console.error('Error fetching user data:', error);
        }
      };
      
      fetchUserData();
      checkRegistration();
    }
  }, [user, eventId, checkEventRegistration, addNotification]);

  // Redirecionar para login se não estiver autenticado
  useEffect(() => {
    if (!authLoading && !isAuth() && !loading) {
      // Salvar a URL atual para redirecionar de volta após login
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname);
      
      addNotification({
        type: 'info',
        message: 'Faça login para se inscrever neste evento'
      });
      
      navigate('/login', { replace: true });
    }
  }, [authLoading, isAuth, loading, navigate, addNotification]);

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpar erro do campo quando o usuário digitar
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email é obrigatório';
    } else if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Telefone é obrigatório';
    }
    
    if (!formData.cpf.trim()) {
      newErrors.cpf = 'CPF é obrigatório';
    } else if (!validateCPF(formData.cpf)) {
      newErrors.cpf = 'CPF inválido';
    }
    
    // Validar parceiro se for torneio de duplas formadas
    if (event?.team_formation === 'FORMED' && !partnerId) {
      newErrors.partner = 'Selecione um parceiro para o torneio';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!eventId || !user) return;
    
    try {
      setSubmitting(true);
      
      // 1. Registrar o participante
      const participant = await registerForEvent(user.id, eventId, formData);
      
      // 2. Se for evento de duplas formadas e tiver parceiro selecionado
      if (event?.team_formation === 'FORMED' && partnerId) {
        await invitePartner(user.id, eventId, partnerId);
        addNotification({
          type: 'success',
          message: 'Convite enviado ao seu parceiro'
        });
      }
      
      // 3. Processar pagamento - usando dados reais do banco
      if (formData.paymentMethod === 'PIX') {
        // Gerar dados de pagamento PIX reais
        const pixInfo = await PaymentService.generatePixPayment(participant.id, eventId);
        
        setPaymentInfo({
          qrCodeUrl: pixInfo.pixQrcodeUrl,
          pixKey: pixInfo.pixPaymentCode,
          amount: pixInfo.amount,
          description: `Inscrição: ${event?.title}`
        });
        
        setShowSuccessScreen(true);
      } else if (formData.paymentMethod === 'CARD') {
        // Em produção: Integrar com gateway de pagamento
        // Registrar intenção de pagamento no banco
        await supabase
          .from('participants')
          .update({
            payment_method: 'CARD',
          })
          .eq('id', participant.id);
        
        // Redirecionar para gateway ou exibir formulário de cartão
        setShowSuccessScreen(true);
      } else {
        // Para outros métodos de pagamento, apenas registrar
        await supabase
          .from('participants')
          .update({
            payment_method: formData.paymentMethod,
          })
          .eq('id', participant.id);
        
        setShowSuccessScreen(true);
      }
    } catch (error) {
      console.error('Error submitting registration:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao processar inscrição'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePartnerSelect = (selectedUser: any) => {
    if (selectedUser) {
      setPartnerId(selectedUser.id);
      setPartnerData(selectedUser);
    } else {
      setPartnerId(null);
      setPartnerData(null);
    }
    
    // Limpar erro se tiver
    if (errors.partner) {
      setErrors(prev => ({ ...prev, partner: '' }));
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner-border text-primary" role="status">
          <span className="sr-only">Carregando...</span>
        </div>
      </div>
    );
  }

  if (isAlreadyRegistered) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow">
          <div className="text-center mb-6">
            <Check size={64} className="mx-auto text-green-500" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Você já está inscrito!</h2>
            <p className="mt-2 text-gray-600">
              Você já está inscrito neste evento. Confira os detalhes na sua área do participante.
            </p>
          </div>
          
          <div className="mt-6">
            <Link to="/meus-torneios" className="block w-full py-3 px-4 text-center text-white bg-brand-blue rounded-md hover:bg-brand-blue/90">
              Ver Meus Torneios
            </Link>
            
            <Link to="/" className="block w-full mt-3 py-3 px-4 text-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Voltar para Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (showSuccessScreen) {
    return (
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto bg-white p-8 rounded-lg shadow">
          <div className="text-center mb-6">
            <Check size={64} className="mx-auto text-green-500" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Inscrição Realizada!</h2>
            <p className="mt-2 text-gray-600">
              Sua inscrição para {event?.title} foi registrada com sucesso.
            </p>
            
            {event?.team_formation === 'FORMED' && partnerId && (
              <div className="mt-4 p-4 bg-blue-50 rounded-md">
                <p className="text-blue-700">
                  Seu parceiro receberá um convite para confirmar a participação.
                </p>
              </div>
            )}
          </div>
          
          {paymentInfo && formData.paymentMethod === 'PIX' && (
            <div className="mt-6 p-4 border rounded-md bg-gray-50">
              <h3 className="text-lg font-medium mb-2 flex items-center">
                <QrCode size={20} className="mr-2 text-brand-blue" />
                Pagamento via PIX
              </h3>
              
              <div className="flex justify-center my-4">
                <img 
                  src={paymentInfo.qrCodeUrl} 
                  alt="QR Code PIX" 
                  className="h-48 w-48 border rounded" 
                />
              </div>
              
              <div className="text-center mb-4">
                <p className="text-gray-600 text-sm mb-1">Valor a pagar</p>
                <p className="text-xl font-bold text-green-600">
                  {formatCurrency(event?.price || 0)}
                </p>
              </div>
              
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-1">Chave PIX:</p>
                <div className="flex items-center rounded-md border bg-white p-2">
                  <span className="flex-1 text-gray-900 truncate">{paymentInfo.pixKey}</span>
                  <button 
                    className="ml-2 text-brand-blue"
                    onClick={() => {
                      navigator.clipboard.writeText(paymentInfo.pixKey);
                      addNotification({
                        type: 'success',
                        message: 'Chave PIX copiada para a área de transferência!'
                      });
                    }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
              
              <p className="mt-4 text-sm text-gray-500 text-center">
                Após efetuar o pagamento, sua inscrição será confirmada automaticamente.
              </p>
            </div>
          )}
          
          <div className="mt-6">
            <Link to="/meus-torneios" className="block w-full py-3 px-4 text-center text-white bg-brand-blue rounded-md hover:bg-brand-blue/90">
              Ver Meus Torneios
            </Link>
            
            <Link to="/" className="block w-full mt-3 py-3 px-4 text-center text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">
              Voltar para Início
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900">Inscrição para Evento</h2>
          <p className="mt-2 text-sm text-gray-600">
            Complete o formulário abaixo para se inscrever em {event?.title}
          </p>
        </div>
        
        {/* Link para voltar */}
        <div className="mb-6">
          <Link 
            to={`/eventos/${eventId}`}
            className="inline-flex items-center text-sm text-brand-blue hover:text-brand-blue/80"
          >
            <ArrowLeft size={16} className="mr-1" /> Voltar para detalhes do evento
          </Link>
        </div>
        
        {/* Detalhes do Evento */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{event?.title}</h3>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
            <p>📅 {formatDate(event?.date || '')}</p>
            <p>📍 {event?.location}</p>
            <p className="font-medium text-brand-blue">💰 {formatCurrency(event?.price || 0)}</p>
          </div>
          
          {event?.team_formation && (
            <div className="mt-3 p-2 rounded bg-blue-50 text-blue-700 text-sm flex items-center">
              <Users size={16} className="mr-2" />
              {event.team_formation === 'FORMED' ? 'Duplas formadas' : 'Duplas aleatórias'}
            </div>
          )}
        </div>
        
        {/* Formulário de Inscrição */}
        <div className="bg-white p-6 rounded-lg shadow">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label 
                htmlFor="name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Nome completo *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                className={`w-full p-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label 
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleFormChange}
                  className={`w-full p-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>
              
              <div>
                <label 
                  htmlFor="phone"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Telefone *
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formatPhone(formData.phone)}
                  onChange={handleFormChange}
                  placeholder="(00) 00000-0000"
                  className={`w-full p-2 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label 
                  htmlFor="cpf"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  CPF *
                </label>
                <input
                  type="text"
                  id="cpf"
                  name="cpf"
                  value={formatCPF(formData.cpf)}
                  onChange={handleFormChange}
                  placeholder="000.000.000-00"
                  className={`w-full p-2 border rounded-md ${errors.cpf ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.cpf && (
                  <p className="mt-1 text-sm text-red-600">{errors.cpf}</p>
                )}
              </div>
              
              <div>
                <label 
                  htmlFor="birthDate"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Data de Nascimento
                </label>
                <input
                  type="date"
                  id="birthDate"
                  name="birthDate"
                  value={formData.birthDate}
                  onChange={handleFormChange}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            {/* Seleção de parceiro para eventos de dupla formada */}
            {event?.team_formation === 'FORMED' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selecione seu parceiro *
                </label>
                
                <div className="relative">
                  <UserSearchInput 
                    onUserSelect={handlePartnerSelect} 
                    excludeUserId={user?.id}
                  />
                </div>
                
                {partnerData && (
                  <div className="mt-2 p-3 border rounded-md bg-blue-50">
                    <p className="text-sm font-medium">Parceiro selecionado:</p>
                    <p className="text-sm">{partnerData.full_name}</p>
                  </div>
                )}
                
                {errors.partner && (
                  <p className="mt-1 text-sm text-red-600">{errors.partner}</p>
                )}
                
                <p className="mt-1 text-xs text-gray-500">
                  Seu parceiro receberá um convite e precisará confirmar a participação.
                </p>
              </div>
            )}
            
            {/* Método de Pagamento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento *
              </label>
              
              <PaymentMethodSelector
                value={formData.paymentMethod}
                onChange={(method) => setFormData(prev => ({ ...prev, paymentMethod: method }))}
              />
            </div>
            
            {/* Informações de valores */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-md font-medium mb-2 flex items-center">
                <Users size={20} className="mr-2 text-brand-blue" />
                Detalhes da Inscrição
              </h3>
              
              <div className="flex justify-between items-center">
                <span>Inscrição</span>
                <span className="font-medium">{formatCurrency(event?.price || 0)}</span>
              </div>
              
              {event?.team_formation === 'FORMED' && (
                <div className="mt-2 flex justify-between items-center">
                  <span>Parceiro (convite enviado)</span>
                  <span className="font-medium">{partnerData ? partnerData.full_name : 'Aguardando seleção'}</span>
                </div>
              )}
              
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between items-center">
                <span className="font-medium">Total</span>
                <span className="font-bold text-brand-blue">{formatCurrency(event?.price || 0)}</span>
              </div>
            </div>
            
            {/* Termos e condições */}
            <div className="flex items-start mt-4">
              <input
                id="terms"
                name="terms"
                type="checkbox"
                className="h-4 w-4 text-brand-blue rounded border-gray-300"
                required
              />
              <label htmlFor="terms" className="ml-2 block text-sm text-gray-600">
                Concordo com os termos e regras do evento
              </label>
            </div>
            
            {/* Botão de envio */}
            <div>
              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={submitting}
                loading={submitting}
              >
                {submitting ? 'Processando...' : 'Confirmar Inscrição'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
