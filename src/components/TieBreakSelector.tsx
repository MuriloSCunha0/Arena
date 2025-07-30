import React, { useState } from 'react';
import { AlertTriangle, UserX, CheckCircle } from 'lucide-react';
import { OverallRanking } from '../types';

interface TieBreakSelectorProps {
  tiedTeams: OverallRanking[];
  onTeamEliminated: (eliminatedTeam: OverallRanking) => void;
  playerNameMap: Record<string, string>;
}

export const TieBreakSelector: React.FC<TieBreakSelectorProps> = ({
  tiedTeams,
  onTeamEliminated,
  playerNameMap
}) => {
  const [selectedTeam, setSelectedTeam] = useState<OverallRanking | null>(null);

  const getTeamDisplayName = (teamId: string[]): string => {
    return teamId.map(id => playerNameMap[id] || 'Desconhecido').join(' & ');
  };

  const handleConfirmElimination = () => {
    if (selectedTeam) {
      onTeamEliminated(selectedTeam);
    }
  };

  return (
    <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 mb-4">
      <div className="flex items-center mb-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 mr-2" />
        <h4 className="font-medium text-yellow-800">
          Desempate Necessário - {tiedTeams.length} duplas empatadas
        </h4>
      </div>
      
      <p className="text-sm text-yellow-700 mb-4">
        As duplas abaixo estão empatadas nos critérios de classificação. 
        Selecione a dupla que deve ser <strong>eliminada</strong> da fase eliminatória:
      </p>
      
      <div className="space-y-2 mb-4">
        {tiedTeams.map((team) => (
          <div
            key={team.teamId.join('|')}
            className={`p-3 border-2 rounded-lg cursor-pointer transition-all ${
              selectedTeam?.teamId.join('|') === team.teamId.join('|')
                ? 'border-red-500 bg-red-50'
                : 'border-yellow-200 bg-white hover:border-yellow-400'
            }`}
            onClick={() => setSelectedTeam(team)}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {getTeamDisplayName(team.teamId)}
                </div>
                <div className="text-sm text-gray-600">
                  Grupo {team.groupNumber} • {team.stats.wins}V • 
                  SG: {team.stats.gameDifference > 0 ? '+' : ''}{team.stats.gameDifference} • 
                  PG: {team.stats.gamesWon}
                </div>
              </div>
              {selectedTeam?.teamId.join('|') === team.teamId.join('|') && (
                <UserX className="w-5 h-5 text-red-600" />
              )}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-end">
        <button
          onClick={handleConfirmElimination}
          disabled={!selectedTeam}
          className={`px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors ${
            selectedTeam
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <UserX className="w-4 h-4 mr-2" />
          Eliminar Dupla Selecionada
        </button>
      </div>
    </div>
  );
};