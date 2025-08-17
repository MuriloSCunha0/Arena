import React from 'react';
import { Trophy, Medal, Award, Star, Crown } from 'lucide-react';
import { GroupRanking } from '../types';

interface GroupRankingsProps {
  groupRankings: Record<number, GroupRanking[]>;
  playerNameMap?: Record<string, string>;
  isGroupStageComplete: boolean;
  qualifiersPerGroup?: number;
}

const GroupRankings: React.FC<GroupRankingsProps> = ({
  groupRankings,
  playerNameMap = {},
  isGroupStageComplete: _isGroupStageComplete,
  qualifiersPerGroup = 2
}) => {
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <Star className="w-4 h-4 text-gray-300" />;
    }
  };

  const getRankColor = (position: number, isQualified: boolean) => {
    if (isQualified) {
      return position === 1 
        ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300'
        : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
    }
    return 'bg-gray-50 border-gray-200';
  };

  const getTeamDisplayName = (teamId: string[]) => {
    return teamId
      .map(id => playerNameMap[id] || `Player ${id}`)
      .join(' / ');
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Critérios de Classificação Beach Tennis
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div>1. <strong>Saldo de Games</strong> (games ganhos - games perdidos)</div>
          <div>2. <strong>Total de Games Ganhos</strong></div>
          <div>3. <strong>Confronto Direto</strong> (em caso de empate)</div>
          <div>4. <strong>Menor Número de Games Perdidos</strong></div>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupRankings).map(([groupNumber, rankings]) => (
          <div key={groupNumber} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
              <h3 className="font-bold text-lg">Grupo {groupNumber}</h3>
            </div>
            <div className="p-4 space-y-3">
              {rankings.map((team, index) => {
                const position = index + 1;
                const isQualified = position <= qualifiersPerGroup;
                
                return (
                  <div
                    key={team.teamId.join('|')}
                    className={`p-3 rounded-lg border-2 ${getRankColor(position, isQualified)}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getRankIcon(position)}
                      <span className="font-semibold">{position}º</span>
                      {isQualified && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          CLASSIFICADO
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-gray-900 mb-2">
                      {getTeamDisplayName(team.teamId)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Saldo:</span>
                        <span className={team.stats.gameDifference > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {team.stats.gameDifference > 0 ? '+' : ''}{team.stats.gameDifference}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vitórias:</span>
                        <span className="font-medium text-blue-600">{team.stats.wins}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupRankings;
