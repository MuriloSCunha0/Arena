import React, { useState, useEffect } from 'react';
import { Users, Search, Mail, Phone, Calendar, Trophy, CheckCircle, XCircle } from 'lucide-react';
import { useParticipantsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { traduzirErroSupabase } from '../../lib/supabase';

interface TournamentParticipantsProps {
  eventId: string;
}

export const TournamentParticipants: React.FC<TournamentParticipantsProps> = ({ eventId }) => {
  const { 
    eventParticipants: participants,
    loading, 
    error,
    fetchParticipantsByEvent
  } = useParticipantsStore();
  
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  
  useEffect(() => {
    if (eventId) {
      fetchParticipantsByEvent(eventId).catch((error) => {
        addNotification({
          type: 'error',
          message: traduzirErroSupabase(error) || 'Falha ao carregar participantes'
        });
      });
    }
  }, [eventId, fetchParticipantsByEvent, addNotification]);
  
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);
  
  const filteredParticipants = participants.filter(participant => 
    participant.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (participant.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando participantes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Participantes Inscritos ({filteredParticipants.length})
          </h2>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar participante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Participants List */}
      {filteredParticipants.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParticipants.map((participant) => (
            <div key={participant.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900">{participant.name}</h3>
                <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                  participant.paymentStatus === 'CONFIRMED' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {participant.paymentStatus === 'CONFIRMED' ? (
                    <CheckCircle className="w-3 h-3" />
                  ) : (
                    <XCircle className="w-3 h-3" />
                  )}
                  <span>{participant.paymentStatus === 'CONFIRMED' ? 'Pago' : 'Pendente'}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-gray-600">
                {participant.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{participant.email}</span>
                  </div>
                )}
                
                {participant.phone && (
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{participant.phone}</span>
                  </div>
                )}
                
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    Inscrito em {new Date(participant.registeredAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {participant.partnerName && (
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>Parceiro: {participant.partnerName}</span>
                  </div>
                )}

                {participant.ranking && (
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-gray-400" />
                    <span>Ranking: {participant.ranking}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nenhum participante encontrado' : 'Nenhum participante inscrito'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Tente ajustar sua busca para encontrar participantes.'
              : 'Este torneio ainda não possui participantes inscritos.'
            }
          </p>
        </div>
      )}
    </div>
  );
};
