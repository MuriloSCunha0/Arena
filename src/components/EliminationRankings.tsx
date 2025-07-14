import React from 'react';
import { Trophy, AlertCircle, Clock, Crown, Target } from 'lucide-react';
import { OverallRanking, Match } from '../types';

interface EliminationRankingsProps {
  qualifiedTeams: OverallRanking[];
  eliminationMatches: Match[];
  playerNameMap?: Record<string, string>;
}

type TeamStatus = 'champion' | 'active' | 'eliminated' | 'qualified';

const EliminationRankings: React.FC<EliminationRankingsProps> = ({
  qualifiedTeams,
  eliminationMatches,
  playerNameMap = {}
}) => {
  const getTeamDisplayName = (teamId: string[]) => {
    return teamId
      .map(id => playerNameMap[id] || `Player ${id}`)
      .join(' / ');
  };

  const getTeamStatus = (team: OverallRanking): { status: TeamStatus; position: string } => {
    const teamKey = team.teamId.join('|');
    
    // Verificar se é campeão (ganhou a final)
    const finalMatch = eliminationMatches.find(match => 
      match.stage === 'FINALS' && match.completed && match.winnerId === 'team1' && 
      match.team1?.join('|') === teamKey
    ) || eliminationMatches.find(match => 
      match.stage === 'FINALS' && match.completed && match.winnerId === 'team2' && 
      match.team2?.join('|') === teamKey
    );

    if (finalMatch) {
      return { status: 'champion', position: 'Campeão' };
    }

    // Verificar se foi eliminado
    const eliminatedMatch = eliminationMatches.find(match => 
      match.completed && 
      ((match.team1?.join('|') === teamKey && match.winnerId === 'team2') ||
       (match.team2?.join('|') === teamKey && match.winnerId === 'team1'))
    );

    if (eliminatedMatch) {
      const roundName = getRoundName(eliminatedMatch.round || 1);
      return { status: 'eliminated', position: `Eliminado nas ${roundName}` };
    }

    // Verificar se tem partida pendente
    const pendingMatch = eliminationMatches.find(match => 
      !match.completed && 
      (match.team1?.join('|') === teamKey || match.team2?.join('|') === teamKey)
    );

    if (pendingMatch) {
      const roundName = getRoundName(pendingMatch.round || 1);
      return { status: 'active', position: `Ativo nas ${roundName}` };
    }

    return { status: 'qualified', position: 'Aguardando primeiro jogo' };
  };

  const getRoundName = (round: number): string => {
    switch (round) {
      case 1: return 'Primeira Rodada';
      case 2: return 'Segunda Rodada';
      case 3: return 'Quartas de Final';
      case 4: return 'Semifinal';
      case 5: return 'Final';
      default: return `${round}ª Rodada`;
    }
  };

  const getStatusIcon = (status: TeamStatus) => {
    switch (status) {
      case 'champion': return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'active': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'eliminated': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'qualified': return <Target className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusColor = (status: TeamStatus) => {
    switch (status) {
      case 'champion': return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
      case 'active': return 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300';
      case 'eliminated': return 'bg-gradient-to-r from-red-50 to-red-100 border-red-300';
      case 'qualified': return 'bg-gradient-to-r from-green-50 to-green-100 border-green-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Trophy className="w-7 h-7" />
          Status da Eliminatória
        </h2>
      </div>

      <div className="space-y-4">
        {qualifiedTeams
          .sort((a, b) => a.rank - b.rank)
          .map((team) => {
            const statusInfo = getTeamStatus(team);
            
            return (
              <div
                key={team.teamId.join('|')}
                className={`p-4 rounded-lg border-2 ${getStatusColor(statusInfo.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {team.rank}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {getTeamDisplayName(team.teamId)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Grupo {team.groupNumber} • {team.rank}º colocado geral
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(statusInfo.status)}
                    <span className="font-medium">{statusInfo.position}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default EliminationRankings;
