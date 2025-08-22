import React, { useState, useEffect } from 'react';
import { UserCheck, Search, Trophy, Calendar } from 'lucide-react';
import { useParticipantsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { traduzirErroSupabase } from '../../lib/supabase';

interface TournamentTeamsProps {
  eventId: string;
}

interface Team {
  id: string;
  player1: {
    id: string;
    name: string;
    ranking?: number;
  };
  player2: {
    id: string;
    name: string;
    ranking?: number;
  };
  averageRanking?: number;
  formationDate: string;
}

export const TournamentTeams: React.FC<TournamentTeamsProps> = ({ eventId }) => {
  const { 
    eventParticipants: participants,
    loading, 
    error,
    fetchParticipantsByEvent
  } = useParticipantsStore();
  
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [teams, setTeams] = useState<Team[]>([]);
  
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

  // Process participants to form teams
  useEffect(() => {
    if (participants.length > 0) {
      const formedTeams: Team[] = [];
      const processedParticipants = new Set<string>();

      participants.forEach(participant => {
        if (!processedParticipants.has(participant.id) && participant.partnerId) {
          const partner = participants.find(p => p.id === participant.partnerId);
          
          if (partner && !processedParticipants.has(partner.id)) {
            const team: Team = {
              id: `${participant.id}-${partner.id}`,
              player1: {
                id: participant.id,
                name: participant.name,
                ranking: participant.ranking
              },
              player2: {
                id: partner.id,
                name: partner.name,
                ranking: partner.ranking
              },
              formationDate: participant.registeredAt
            };

            // Calculate average ranking if both players have rankings
            if (participant.ranking && partner.ranking) {
              team.averageRanking = (participant.ranking + partner.ranking) / 2;
            }

            formedTeams.push(team);
            processedParticipants.add(participant.id);
            processedParticipants.add(partner.id);
          }
        }
      });

      // Sort teams by average ranking (lower is better)
      formedTeams.sort((a, b) => {
        if (a.averageRanking && b.averageRanking) {
          return a.averageRanking - b.averageRanking;
        }
        return 0;
      });

      setTeams(formedTeams);
    }
  }, [participants]);
  
  const filteredTeams = teams.filter(team => 
    team.player1.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    team.player2.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando duplas...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <UserCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Duplas Formadas ({filteredTeams.length})
          </h2>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar dupla..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Teams List */}
      {filteredTeams.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeams.map((team, index) => (
            <div key={team.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">Dupla #{index + 1}</h3>
                {team.averageRanking && (
                  <div className="flex items-center space-x-1 px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                    <Trophy className="w-3 h-3" />
                    <span>Avg: {team.averageRanking.toFixed(1)}</span>
                  </div>
                )}
              </div>

              {/* Player 1 */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{team.player1.name}</span>
                  {team.player1.ranking && (
                    <span className="text-sm text-gray-600">#{team.player1.ranking}</span>
                  )}
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex items-center justify-center py-2">
                <div className="h-px bg-gray-200 flex-1"></div>
                <span className="px-2 text-xs text-gray-500 bg-gray-50 rounded">+</span>
                <div className="h-px bg-gray-200 flex-1"></div>
              </div>

              {/* Player 2 */}
              <div className="space-y-2 mb-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900">{team.player2.name}</span>
                  {team.player2.ranking && (
                    <span className="text-sm text-gray-600">#{team.player2.ranking}</span>
                  )}
                </div>
              </div>

              {/* Formation Date */}
              <div className="flex items-center space-x-2 text-sm text-gray-600 mt-3 pt-3 border-t border-gray-100">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>
                  Formada em {new Date(team.formationDate).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <UserCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nenhuma dupla encontrada' : 'Nenhuma dupla formada'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Tente ajustar sua busca para encontrar duplas.'
              : 'As duplas serão formadas conforme os participantes se inscrevem.'
            }
          </p>
        </div>
      )}

      {/* Unpartnered participants */}
      {participants.some(p => !p.partnerId) && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Participantes sem Dupla</h3>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {participants
                .filter(p => !p.partnerId)
                .map(participant => (
                  <div key={participant.id} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                    <span className="text-sm font-medium">{participant.name}</span>
                    {participant.ranking && (
                      <span className="text-xs text-gray-600">#{participant.ranking}</span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
