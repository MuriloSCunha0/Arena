import React, { useState } from 'react';
import { Edit3, UserX, RotateCcw, Save, X, AlertTriangle } from 'lucide-react';
import { Match, OverallRanking } from '../types';

interface BracketEditorProps {
  matches: Match[];
  availableTeams: OverallRanking[];
  playerNameMap?: Record<string, string>;
  onSave: (updatedMatches: Match[]) => void;
  onClose: () => void;
}

const BracketEditor: React.FC<BracketEditorProps> = ({
  matches,
  availableTeams: _availableTeams,
  playerNameMap = {},
  onSave,
  onClose
}) => {
  const [editedMatches, setEditedMatches] = useState<Match[]>([...matches]);

  const getTeamDisplayName = (teamId: string[] | null) => {
    if (!teamId) return 'BYE';
    return teamId
      .map(id => playerNameMap[id] || `Player ${id}`)
      .join(' / ');
  };

  const editableMatches = matches.filter(match => 
    match.stage === 'ELIMINATION' && match.round === 1
  );

  const assignBye = (matchId: string, teamSlot: 'team1' | 'team2') => {
    setEditedMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        const otherSlot = teamSlot === 'team1' ? 'team2' : 'team1';
        const winningTeamSlot = match[otherSlot] ? otherSlot : null;
        
        return {
          ...match,
          [teamSlot]: null,
          completed: true,
          winnerId: winningTeamSlot,
        };
      }
      return match;
    }));
  };

  const swapTeams = (matchId: string) => {
    setEditedMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          team1: match.team2,
          team2: match.team1,
        };
      }
      return match;
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Edit3 className="w-7 h-7" />
                Editor de Chaveamento
              </h2>
              <p className="text-indigo-100 mt-1">
                Edite os confrontos da primeira rodada eliminatória
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">Instruções:</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• Apenas confrontos da primeira rodada podem ser editados</li>
                  <li>• Use "Trocar Posições" para inverter as duplas</li>
                  <li>• "Atribuir BYE" remove uma dupla e avança a outra</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {editableMatches.map((match, index) => (
              <div key={match.id} className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                <div className="font-semibold text-gray-800 mb-3">
                  Confronto {index + 1}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="font-medium">{getTeamDisplayName(match.team1)}</div>
                    <button
                      onClick={() => assignBye(match.id, 'team1')}
                      className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                      title="Atribuir BYE"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-center text-gray-400 text-sm font-medium">VS</div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="font-medium">{getTeamDisplayName(match.team2)}</div>
                    <button
                      onClick={() => assignBye(match.id, 'team2')}
                      className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                      title="Atribuir BYE"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => swapTeams(match.id)}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Trocar Posições
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => onSave(editedMatches)}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
            >
              <Save className="w-5 h-5" />
              Salvar Alterações
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BracketEditor;
