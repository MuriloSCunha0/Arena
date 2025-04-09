import React, { useState, useEffect } from 'react';
import { Link, Share2, Copy, CheckCircle, ExternalLink, Award, Calendar, MapPin, DollarSign, Trophy } from 'lucide-react';
import { Button } from '../ui/Button';
import { Event, TeamFormationType } from '../../types';
import { useParticipantsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Modal } from '../ui/Modal';

interface RegistrationLinkProps {
  event: Event;
}

export const RegistrationLink: React.FC<RegistrationLinkProps> = ({ event }) => {
  const [copied, setCopied] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const { eventParticipants, loading, fetchParticipantsByEvent } = useParticipantsStore();
  const addNotification = useNotificationStore(state => state.addNotification);
  
  useEffect(() => {
    if (event.id) {
      fetchParticipantsByEvent(event.id).catch(() => {
        addNotification({
          type: 'error',
          message: 'Falha ao carregar dados de inscrição'
        });
      });
    }
  }, [event.id, fetchParticipantsByEvent, addNotification]);
  
  // Calculate financial metrics
  const totalParticipants = eventParticipants.length;
  const confirmedPayments = eventParticipants.filter(p => p.paymentStatus === 'CONFIRMED').length;
  const pendingPayments = totalParticipants - confirmedPayments;
  const totalAmount = confirmedPayments * event.price;
  
  // URL hardcoded que deveria ser configurável ou vir do backend
  const registrationLink = `https://arena-conexao.com.br/inscricao/${event.id}`;
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(registrationLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    addNotification({
      type: 'success',
      message: 'Link copiado para a área de transferência!'
    });
  };
  
  const toggleLinkStatus = () => {
    // Esta função apenas muda o estado visual, sem efeito real no backend
    setIsActive(!isActive);
    
    addNotification({
      type: isActive ? 'info' : 'success',
      message: isActive 
        ? 'Link de inscrição desativado!'
        : 'Link de inscrição ativado!'
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-brand-blue">Link de Inscrição</h3>
          <p className="text-sm text-gray-500">
            Compartilhe este link para que os participantes possam se inscrever
          </p>
        </div>
        
        <div className="flex items-center">
          <Button 
            variant={isActive ? 'danger' : 'primary'}
            onClick={toggleLinkStatus}
          >
            {isActive ? 'Desativar Link' : 'Ativar Link'}
          </Button>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 flex-grow">
            <Link size={18} className="text-brand-purple" />
            <input
              type="text"
              value={registrationLink}
              readOnly
              className="flex-grow bg-gray-50 border border-brand-gray rounded-lg px-4 py-2 text-gray-700"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              className="flex-grow sm:flex-grow-0"
              onClick={handleCopyLink}
            >
              {copied ? <CheckCircle size={18} className="mr-1" /> : <Copy size={18} className="mr-1" />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
            <Button 
              variant="outline"
              className="flex-grow sm:flex-grow-0"
              onClick={() => window.open(registrationLink, '_blank')}
            >
              <ExternalLink size={18} className="mr-1" />
              Abrir
            </Button>
          </div>
        </div>
        
        <div className="mt-6 border-t border-brand-gray pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-brand-green/10 p-3 rounded-full">
              <Share2 size={24} className="text-brand-green" />
            </div>
            <div>
              <h4 className="font-medium text-brand-blue">Compartilhe o link</h4>
              <p className="text-sm text-gray-500 mt-1">
                Envie este link para que os participantes possam se inscrever no evento.
                {event.teamFormation === TeamFormationType.FORMED 
                  ? ' Apenas um integrante da dupla precisará fazer a inscrição.'
                  : ' Cada participante se inscreve individualmente.'}
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-6 border-t border-brand-gray pt-6">
          <div className="flex items-start gap-4">
            <div className="bg-brand-purple/10 p-3 rounded-full">
              <Award size={24} className="text-brand-purple" />
            </div>
            <div>
              <h4 className="font-medium text-brand-blue">Visualizar formulário</h4>
              <p className="text-sm text-gray-500 mt-1 mb-4">
                Veja como está o formulário de inscrição que será apresentado aos participantes.
              </p>
              <Button variant="outline" onClick={() => setShowPreviewModal(true)}>
                Pré-visualizar Formulário
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow border border-brand-gray">
        <h3 className="text-lg font-semibold text-brand-blue mb-4">Estatísticas de Inscrição</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-brand-gray rounded-lg p-4">
            <div className="text-xl font-bold text-brand-blue">{totalParticipants}/{event.maxParticipants}</div>
            <div className="text-sm text-gray-500">Participantes Inscritos</div>
          </div>
          <div className="border border-brand-gray rounded-lg p-4">
            <div className="text-xl font-bold text-brand-green">R$ {totalAmount.toFixed(2).replace('.', ',')}</div>
            <div className="text-sm text-gray-500">Valor Arrecadado</div>
          </div>
          <div className="border border-brand-gray rounded-lg p-4">
            <div className="text-xl font-bold text-brand-orange">{pendingPayments}</div>
            <div className="text-sm text-gray-500">Pagamentos Pendentes</div>
          </div>
        </div>
      </div>
      
      {/* Modal para pré-visualização do formulário de inscrição */}
      <Modal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title="Pré-visualização do Formulário"
      >
        <div className="px-1 py-2 sm:p-4 max-h-[80vh] overflow-y-auto">
          {/* Cabeçalho do evento */}
          <div className="relative mb-8 rounded-xl overflow-hidden">
            {/* Banner com gradiente */}
            <div className="absolute inset-0 bg-gradient-to-r from-brand-blue to-brand-purple opacity-90"></div>
            
            <div className="relative p-6 text-white">
              <h3 className="text-2xl font-bold mb-2">
                {event.title}
              </h3>
              <p className="text-white/90 mb-4 max-w-2xl">
                {event.description || "Sem descrição disponível"}
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center bg-white/10 p-2.5 rounded-lg backdrop-blur-sm">
                  <Calendar className="text-brand-green h-5 w-5 mr-2" />
                  <div>
                    <p className="font-semibold">Data e Hora</p>
                    <p className="text-white/90">
                      {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center bg-white/10 p-2.5 rounded-lg backdrop-blur-sm">
                  <MapPin className="text-brand-green h-5 w-5 mr-2" />
                  <div>
                    <p className="font-semibold">Local</p>
                    <p className="text-white/90">{event.location}</p>
                  </div>
                </div>
                
                <div className="flex items-center bg-white/10 p-2.5 rounded-lg backdrop-blur-sm">
                  <DollarSign className="text-brand-green h-5 w-5 mr-2" />
                  <div>
                    <p className="font-semibold">Valor da Inscrição</p>
                    <p className="text-white/90">
                      {`R$ ${event.price.toFixed(2).replace('.', ',')}`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center bg-white/10 p-2.5 rounded-lg backdrop-blur-sm">
                  <Trophy className="text-brand-green h-5 w-5 mr-2" />
                  <div>
                    <p className="font-semibold">Premiação</p>
                    <p className="text-white/90">{event.prize || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Corpo do formulário */}
          <div className="space-y-5 bg-white p-4 sm:p-6 rounded-xl shadow-sm border border-brand-gray/20">
            <div className="flex items-center space-x-2 mb-4">
              <div className="h-6 w-6 rounded-full bg-brand-green flex items-center justify-center text-white font-bold text-sm">
                1
              </div>
              <h4 className="text-lg font-semibold text-brand-blue">Dados do Participante</h4>
            </div>
            
            <div className="space-y-4">
              <div className="transition-all duration-200 hover:shadow-md">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nome Completo <span className="text-brand-orange">*</span>
                </label>
                <div className="border border-brand-gray/50 rounded-lg p-3 bg-gray-50 focus-within:ring-1 focus-within:ring-brand-green focus-within:border-brand-green">
                  <div className="flex items-center text-gray-500 text-sm">
                    <span>Campo de entrada do participante</span>
                  </div>
                </div>
              </div>
              
              <div className="transition-all duration-200 hover:shadow-md">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-brand-orange">*</span>
                </label>
                <div className="border border-brand-gray/50 rounded-lg p-3 bg-gray-50 focus-within:ring-1 focus-within:ring-brand-green focus-within:border-brand-green">
                  <div className="flex items-center text-gray-500 text-sm">
                    <span>Campo de entrada do participante</span>
                  </div>
                </div>
              </div>
              
              <div className="transition-all duration-200 hover:shadow-md">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Telefone <span className="text-brand-orange">*</span>
                </label>
                <div className="border border-brand-gray/50 rounded-lg p-3 bg-gray-50 focus-within:ring-1 focus-within:ring-brand-green focus-within:border-brand-green">
                  <div className="flex items-center text-gray-500 text-sm">
                    <span>Campo de entrada do participante</span>
                  </div>
                </div>
              </div>
              
              {event.teamFormation === TeamFormationType.FORMED && (
                <div className="transition-all duration-200 hover:shadow-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nome do Parceiro (Dupla) <span className="text-brand-orange">*</span>
                  </label>
                  <div className="border border-brand-gray/50 rounded-lg p-3 bg-gray-50 focus-within:ring-1 focus-within:ring-brand-green focus-within:border-brand-green">
                    <div className="flex items-center text-gray-500 text-sm">
                      <span>Campo de entrada do participante</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-4 border-t border-gray-200">
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-6 w-6 rounded-full bg-brand-green flex items-center justify-center text-white font-bold text-sm">
                  2
                </div>
                <h4 className="text-lg font-semibold text-brand-blue">Pagamento</h4>
              </div>
              
              <div className="transition-all duration-200 hover:shadow-md">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Método de Pagamento <span className="text-brand-orange">*</span>
                </label>
                <div className="border border-brand-gray/50 rounded-lg bg-gray-50">
                  <div className="flex flex-col sm:flex-row">
                    <div className="flex-1 p-3 border-b sm:border-b-0 sm:border-r border-brand-gray/30 text-center cursor-pointer hover:bg-brand-green/5 transition-colors rounded-tl-lg rounded-tr-lg sm:rounded-tr-none sm:rounded-bl-lg">
                      <p className="font-medium text-brand-blue">PIX</p>
                      <p className="text-xs text-gray-500">Pagamento instantâneo</p>
                    </div>
                    <div className="flex-1 p-3 border-b sm:border-b-0 sm:border-r border-brand-gray/30 text-center cursor-pointer hover:bg-brand-purple/5 transition-colors">
                      <p className="font-medium text-brand-blue">Cartão</p>
                      <p className="text-xs text-gray-500">Crédito/Débito</p>
                    </div>
                    <div className="flex-1 p-3 text-center cursor-pointer hover:bg-brand-orange/5 transition-colors rounded-bl-lg rounded-br-lg sm:rounded-bl-none sm:rounded-tr-lg">
                      <p className="font-medium text-brand-blue">Dinheiro</p>
                      <p className="text-xs text-gray-500">No local</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-brand-purple/10 rounded-lg p-4 text-sm">
                <p className="text-brand-purple font-medium mb-2">Termos e Condições</p>
                <p className="text-gray-600">
                  Ao concluir sua inscrição, você concorda com os termos e regras deste evento.
                  {event.rules && (
                    <span className="block mt-2 text-xs italic">
                      "{event.rules.substring(0, 100)}..."
                    </span>
                  )}
                </p>
              </div>
              
              <div className="mt-6 flex flex-col-reverse sm:flex-row justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPreviewModal(false)}
                  className="w-full sm:w-auto"
                >
                  Fechar Prévia
                </Button>
                
                <Button 
                  className="w-full sm:w-auto bg-gradient-to-r from-brand-green to-brand-blue text-white"
                >
                  Confirmar Inscrição
                  <span className="ml-2 bg-white bg-opacity-30 text-xs px-2 py-0.5 rounded-full">
                    Demo
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
