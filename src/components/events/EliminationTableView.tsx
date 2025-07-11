import React from 'react';
import { Match } from '../../types';
import { Edit3, MapPin, Calendar, Trophy, Users } from 'lucide-react';

interface EliminationTableViewProps {
  matches: Match[];
  playerNameMap?: Record<string, string>;
  onMatchClick: (match: Match) => void;
  courts?: any[];
}

const EliminationTableView: React.FC<EliminationTableViewProps> = ({ 
  matches, 
  playerNameMap, 
  onMatchClick,
  courts = []
}) => {
  // Agrupar partidas por round
  const matchesByRound = matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, Match[]>);

  // Ordenar rounds
  const sortedRounds = Object.keys(matchesByRound)
    .map(Number)
    .sort((a, b) => a - b);

  const getRoundName = (round: number, totalRounds: number) => {
    const roundsFromEnd = totalRounds - round;
    switch (roundsFromEnd) {
      case 0: return 'Final';
      case 1: return 'Semifinal';
      case 2: return 'Quartas de Final';
      case 3: return 'Oitavas de Final';
      default: return `${round + 1}ª Rodada`;
    }
  };

  const getTeamName = (team: string[] | null | undefined): string => {
    if (!team || team.length === 0) return 'A definir';
    
    return team.map(playerId => {
      if (playerNameMap && playerNameMap[playerId]) {
        return playerNameMap[playerId];
      }
      return playerId;
    }).join(' & ');
  };

  const getCourtName = (courtId: string | null): string => {
    if (!courtId) return '';
    const court = courts.find(c => c.id === courtId);
    return court ? court.name : '';
  };

  const totalRounds = sortedRounds.length;

  return (
    <div className="space-y-8">
      {sortedRounds.map((round) => {
        const roundMatches = matchesByRound[round];
        const roundName = getRoundName(round, totalRounds);

        return (
          <div key={round} className="space-y-4">
            <div className="flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold text-gray-900">{roundName}</h3>
              <span className="bg-indigo-100 text-indigo-800 text-sm font-medium px-2.5 py-0.5 rounded">
                {roundMatches.length} {roundMatches.length === 1 ? 'partida' : 'partidas'}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Confronto
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Resultado
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quadra
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Horário
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {roundMatches
                    .sort((a, b) => a.position - b.position)
                    .map((match) => {
                      const team1Name = getTeamName(match.team1);
                      const team2Name = getTeamName(match.team2);
                      const canEdit = match.team1 && match.team2 && 
                                     match.team1.length > 0 && match.team2.length > 0 &&
                                     !match.team1.includes('A definir') && !match.team2.includes('A definir');

                      return (
                        <tr
                          key={match.id}
                          className={`hover:bg-gray-50 ${
                            match.completed ? 'bg-green-50' : ''
                          }`}
                        >
                          <td className="px-6 py-4">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className={`font-medium ${
                                  match.winnerId === 'team1' ? 'text-green-600 font-bold' : 'text-gray-900'
                                }`}>
                                  {team1Name}
                                </span>
                              </div>
                              <div className="text-sm text-gray-500 pl-6">vs</div>
                              <div className="flex items-center space-x-2">
                                <Users className="w-4 h-4 text-gray-400" />
                                <span className={`font-medium ${
                                  match.winnerId === 'team2' ? 'text-green-600 font-bold' : 'text-gray-900'
                                }`}>
                                  {team2Name}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 text-center">
                            {match.completed && match.score1 !== null && match.score2 !== null ? (
                              <div className="space-y-1">
                                <div className={`text-lg font-bold ${
                                  match.winnerId === 'team1' ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {match.score1}
                                </div>
                                <div className="text-xs text-gray-400">×</div>
                                <div className={`text-lg font-bold ${
                                  match.winnerId === 'team2' ? 'text-green-600' : 'text-gray-600'
                                }`}>
                                  {match.score2}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">Não realizada</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {!canEdit ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                Aguardando
                              </span>
                            ) : match.completed ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Finalizada
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                Pronta
                              </span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {match.courtId ? (
                              <div className="flex items-center justify-center space-x-1">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {getCourtName(match.courtId)}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {match.scheduledTime ? (
                              <div className="flex items-center justify-center space-x-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                <span className="text-sm text-gray-900">
                                  {new Date(match.scheduledTime).toLocaleTimeString('pt-BR', { 
                                    hour: '2-digit', 
                                    minute: '2-digit' 
                                  })}
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>

                          <td className="px-6 py-4 text-center">
                            {canEdit && (
                              <button
                                onClick={() => onMatchClick(match)}
                                className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                                title="Editar resultado"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EliminationTableView;
