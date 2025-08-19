import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, User } from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { Button } from './ui/Button';
import { useParticipant } from '../hooks/useParticipant';
import { useAuth } from '../hooks/useAuth';
import { useNotificationStore } from './ui/Notification';

interface PartnerInvitesProps {
  onActionTaken?: () => void;
}

export const PartnerInvites: React.FC<PartnerInvitesProps> = ({
  onActionTaken
}) => {
  const { user } = useAuth();
  const { 
    pendingInvites, 
    fetchPendingInvites, 
    acceptInvite, 
    declineInvite, 
    loading 
  } = useParticipant();
  const [processingInvites, setProcessingInvites] = useState<Record<string, boolean>>({});
  const addNotification = useNotificationStore(state => state.addNotification);

  useEffect(() => {
    if (user?.id) {
      fetchPendingInvites(user.id);
    }
  }, [user, fetchPendingInvites]);

  const handleAccept = async (inviteId: string) => {
    if (!user) return;
    
    try {
      setProcessingInvites(prev => ({ ...prev, [inviteId]: true }));
      await acceptInvite(inviteId, user.id);
      
      addNotification({
        type: 'success',
        message: 'Convite aceito com sucesso!'
      });
      
      if (onActionTaken) {
        onActionTaken();
      }
    } catch (error) {
      console.error('Error accepting invite:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao aceitar convite'
      });
    } finally {
      setProcessingInvites(prev => ({ ...prev, [inviteId]: false }));
    }
  };

  const handleDecline = async (inviteId: string) => {
    if (!user) return;
    
    try {
      setProcessingInvites(prev => ({ ...prev, [inviteId]: true }));
      await declineInvite(inviteId, user.id);
      
      addNotification({
        type: 'success',
        message: 'Convite recusado'
      });
      
      if (onActionTaken) {
        onActionTaken();
      }
    } catch (error) {
      console.error('Error declining invite:', error);
      addNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Erro ao recusar convite'
      });
    } finally {
      setProcessingInvites(prev => ({ ...prev, [inviteId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-brand-blue mx-auto"></div>
      </div>
    );
  }

  if (!pendingInvites.length) {
    return (
      <div className="p-4 text-center text-gray-500">
        Você não possui convites pendentes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pendingInvites.map(invite => (
        <div
          key={invite.id}
          className="p-4 sm:p-6 rounded-xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-200"
        >
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-brand-blue mb-2">{invite.eventName}</h3>
              <div className="flex items-center text-gray-700 mb-3">
                <div className="p-1.5 bg-blue-100 rounded-lg mr-3">
                  <User size={16} className="text-blue-600" />
                </div>
                <p className="text-sm">
                  <span className="font-medium">{invite.senderName}</span> convidou você como parceiro
                </p>
              </div>
              
              <div className="flex items-center text-xs text-gray-500">
                <div className="p-1 bg-gray-100 rounded mr-2">
                  <Calendar size={12} className="text-gray-600" />
                </div>
                Enviado em {formatDate(invite.createdAt)}
              </div>
            </div>
            
            <div className="flex items-center justify-center px-3 py-1.5 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium shrink-0">
              <Clock size={12} className="mr-1" />
              Pendente
            </div>
          </div>
          
          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleDecline(invite.id)}
              disabled={processingInvites[invite.id]}
              className="flex items-center justify-center border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
            >
              <XCircle size={16} className="mr-2" />
              Recusar
            </Button>
            
            <Button 
              variant="primary"
              size="sm"
              onClick={() => handleAccept(invite.id)}
              loading={processingInvites[invite.id]}
              className="flex items-center justify-center bg-green-600 hover:bg-green-700"
            >
              <CheckCircle size={16} className="mr-2" />
              Aceitar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
