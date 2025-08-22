import React, { useState, useEffect } from 'react';
import { Grid, Search, Trophy, Users, TrendingUp } from 'lucide-react';
import { useParticipantsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { traduzirErroSupabase } from '../../lib/supabase';

interface TournamentGroupsProps {
  eventId: string;
}

interface GroupTeam {
  id: string;
  player1: string;
  player2: string;
  ranking1?: number;
  ranking2?: number;
  averageRanking?: number;
  points?: number;
  matches?: {
    played: number;
    won: number;
    lost: number;
  };
  sets?: {
    won: number;
    lost: number;
  };
}

interface Group {
  id: string;
  name: string;
  teams: GroupTeam[];
}

export const TournamentGroups: React.FC<TournamentGroupsProps> = ({ eventId }) => {
  const { 
    eventParticipants: participants,
    loading, 
    error,
    fetchParticipantsByEvent
  } = useParticipantsStore();
  
  const addNotification = useNotificationStore(state => state.addNotification);
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  
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

  // Process participants to create groups
  useEffect(() => {
    if (participants.length > 0) {
      const teams: GroupTeam[] = [];
      const processedParticipants = new Set<string>();

      // Create teams from participants
      participants.forEach(participant => {
        if (!processedParticipants.has(participant.id) && participant.partnerId) {
          const partner = participants.find(p => p.id === participant.partnerId);
          
          if (partner && !processedParticipants.has(partner.id)) {
            const team: GroupTeam = {
              id: `${participant.id}-${partner.id}`,
              player1: participant.name,
              player2: partner.name,
              ranking1: participant.ranking,
              ranking2: partner.ranking,
              points: 0,
              matches: { played: 0, won: 0, lost: 0 },
              sets: { won: 0, lost: 0 }
            };

            // Calculate average ranking if both players have rankings
            if (participant.ranking && partner.ranking) {
              team.averageRanking = (participant.ranking + partner.ranking) / 2;
            }

            teams.push(team);
            processedParticipants.add(participant.id);
            processedParticipants.add(partner.id);
          }
        }
      });

      // Create groups (assuming 4 teams per group for now)
      const teamsPerGroup = 4;
      const numberOfGroups = Math.ceil(teams.length / teamsPerGroup);
      const createdGroups: Group[] = [];

      for (let i = 0; i < numberOfGroups; i++) {
        const groupTeams = teams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
        const groupName = String.fromCharCode(65 + i); // A, B, C, etc.
        
        createdGroups.push({
          id: `group-${groupName}`,
          name: `Grupo ${groupName}`,
          teams: groupTeams
        });
      }

      setGroups(createdGroups);
    }
  }, [participants]);
  
  const filteredGroups = groups.map(group => ({
    ...group,
    teams: group.teams.filter(team => 
      team.player1.toLowerCase().includes(searchTerm.toLowerCase()) || 
      team.player2.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(group => group.teams.length > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Carregando grupos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Grid className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Grupos do Torneio ({groups.length})
          </h2>
        </div>
        
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar equipe..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Groups */}
      {filteredGroups.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGroups.map((group) => (
            <div key={group.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">{group.name}</h3>
                  <div className="flex items-center space-x-1 text-sm">
                    <Users className="w-4 h-4" />
                    <span>{group.teams.length} duplas</span>
                  </div>
                </div>
              </div>

              <div className="p-4">
                {/* Group standings table */}
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 text-sm font-medium text-gray-600">Pos</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-600">Dupla</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-600">Pts</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-600">J</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-600">V</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-600">D</th>
                        <th className="text-center py-2 text-sm font-medium text-gray-600">Ranking</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.teams
                        .sort((a, b) => (b.points || 0) - (a.points || 0))
                        .map((team, index) => (
                        <tr key={team.id} className={`border-b border-gray-100 ${index === 0 ? 'bg-yellow-50' : ''}`}>
                          <td className="py-2 text-sm">
                            <div className="flex items-center">
                              {index === 0 && <Trophy className="w-4 h-4 text-yellow-500 mr-1" />}
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-2">
                            <div className="text-sm">
                              <div className="font-medium text-gray-900">{team.player1}</div>
                              <div className="text-gray-600">{team.player2}</div>
                            </div>
                          </td>
                          <td className="text-center py-2 text-sm font-medium">
                            {team.points || 0}
                          </td>
                          <td className="text-center py-2 text-sm">
                            {team.matches?.played || 0}
                          </td>
                          <td className="text-center py-2 text-sm text-green-600">
                            {team.matches?.won || 0}
                          </td>
                          <td className="text-center py-2 text-sm text-red-600">
                            {team.matches?.lost || 0}
                          </td>
                          <td className="text-center py-2 text-sm">
                            {team.averageRanking ? (
                              <div className="flex items-center justify-center space-x-1">
                                <TrendingUp className="w-3 h-3 text-blue-500" />
                                <span>{team.averageRanking.toFixed(1)}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {group.teams.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    Nenhuma dupla neste grupo
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Grid className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? 'Nenhum grupo encontrado' : 'Grupos ainda não definidos'}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? 'Tente ajustar sua busca para encontrar grupos.'
              : 'Os grupos serão criados quando houver duplas suficientes inscritas.'
            }
          </p>
        </div>
      )}

      {/* Tournament info */}
      {groups.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
          <h4 className="font-semibold text-blue-900 mb-2">Informações do Formato</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-blue-600 font-medium">Total de Grupos:</span>
              <span className="ml-2 text-blue-900">{groups.length}</span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Total de Duplas:</span>
              <span className="ml-2 text-blue-900">
                {groups.reduce((total, group) => total + group.teams.length, 0)}
              </span>
            </div>
            <div>
              <span className="text-blue-600 font-medium">Formato:</span>
              <span className="ml-2 text-blue-900">Fase de Grupos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
