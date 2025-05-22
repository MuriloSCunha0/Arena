import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Calendar, User } from 'lucide-react';
import { PartnerInvite } from '../types';
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
          className="p-4 rounded-lg border border-gray-200 bg-white"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-brand-blue">{invite.eventName}</h3>
              <p className="text-sm text-gray-700 mt-1 flex items-center">
                <User size={16} className="mr-1" />
                {invite.senderName} convidou você como parceiro
              </p>
            </div>
            
            <div className="flex items-center text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              <Clock size={12} className="mr-1" />
              Pendente
            </div>
          </div>
          
          <div className="mt-3 flex items-center text-xs text-gray-500">
            <Calendar size={14} className="mr-1" />
            Enviado em {formatDate(invite.createdAt)}
          </div>
          
          <div className="mt-4 flex justify-end space-x-3">
            <Button 
              variant="outline"
              size="sm"
              onClick={() => handleDecline(invite.id)}
              disabled={processingInvites[invite.id]}
              className="flex items-center"
            >
              <XCircle size={16} className="mr-1 text-red-500" />
              Recusar
            </Button>
            
            <Button 
              variant="primary"
              size="sm"
              onClick={() => handleAccept(invite.id)}
              loading={processingInvites[invite.id]}
              className="flex items-center"
            >
              <CheckCircle size={16} className="mr-1" />
              Aceitar
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
