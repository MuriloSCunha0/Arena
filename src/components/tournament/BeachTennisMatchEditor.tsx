import React, { useState } from 'react';
import { Match } from '../../types';
import { Button } from '../ui/Button';
import { AlertCircle, Trophy, Users } from 'lucide-react';

interface BeachTennisMatchEditorProps {
  match: Match;
  onSave: (matchId: string, team1Games: number, team2Games: number, tiebreakT1?: number, tiebreakT2?: number) => Promise<void>;
  onClose: () => void;
  participantMap: Map<string, string>;
}

const BeachTennisMatchEditor: React.FC<BeachTennisMatchEditorProps> = ({ 
  match, 
  onSave, 
  onClose, 
  participantMap 
}) => {
  const [team1Games, setTeam1Games] = useState<number>(match.score1 || 0);
  const [team2Games, setTeam2Games] = useState<number>(match.score2 || 0);
  const [team1Tiebreak, setTeam1Tiebreak] = useState<number>(0);
  const [team2Tiebreak, setTeam2Tiebreak] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get team names
  const team1Name = match.team1 && match.team1.length > 0 
    ? match.team1.map(id => participantMap.get(id) || 'Desconhecido').join(' & ')
    : 'Time 1';
    
  const team2Name = match.team2 && match.team2.length > 0 
    ? match.team2.map(id => participantMap.get(id) || 'Desconhecido').join(' & ')
    : 'Time 2';

  // Check if tiebreak is needed (games are 6-6)
  const needsTiebreak = team1Games === 6 && team2Games === 6;

  // Check if the score is valid
  const isValidScore = () => {
    // If it's 6-6, must have tiebreak
    if (needsTiebreak) {
      return team1Tiebreak !== team2Tiebreak && 
             (team1Tiebreak >= 7 || team2Tiebreak >= 7) &&
             Math.abs(team1Tiebreak - team2Tiebreak) >= 2;
    }

    // Normal game rules
    if (team1Games === team2Games) return false; // No ties allowed
    
    // Must win by 2 if score is 5-7 or 7-5
    if ((team1Games === 7 && team2Games === 5) || (team1Games === 5 && team2Games === 7)) {
      return true;
    }
    
    // Must win at 6 with difference of 2+ if opponent has 4 or less
    if (team1Games === 6 && team2Games <= 4) return true;
    if (team2Games === 6 && team1Games <= 4) return true;
    
    // Must win at 6-5 or higher with difference of 1
    if ((team1Games === 6 && team2Games === 5) || (team1Games === 5 && team2Games === 6)) {
      return false; // Need to continue to 7-5
    }

    return false;
  };

  const getWinner = () => {
    if (needsTiebreak) {
      if (team1Tiebreak > team2Tiebreak) return team1Name;
      if (team2Tiebreak > team1Tiebreak) return team2Name;
      return null;
    }
    
    if (team1Games > team2Games) return team1Name;
    if (team2Games > team1Games) return team2Name;
    return null;
  };

  const handleSave = async () => {
    if (!isValidScore()) {
      setError('Pontuação inválida. Verifique as regras do Beach Tennis.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      if (needsTiebreak) {
        await onSave(match.id, team1Games, team2Games, team1Tiebreak, team2Tiebreak);
      } else {
        await onSave(match.id, team1Games, team2Games);
      }
      onClose();
    } catch (error) {
      console.error('Error saving match results:', error);
      setError((error as Error).message || 'Erro ao salvar o resultado');
    } finally {
      setSaving(false);
    }
  };

  const incrementGames = (team: 'team1' | 'team2') => {
    if (team === 'team1' && team1Games < 7) setTeam1Games(team1Games + 1);
    if (team === 'team2' && team2Games < 7) setTeam2Games(team2Games + 1);
  };

  const decrementGames = (team: 'team1' | 'team2') => {
    if (team === 'team1' && team1Games > 0) setTeam1Games(team1Games - 1);
    if (team === 'team2' && team2Games > 0) setTeam2Games(team2Games - 1);
  };

  const incrementTiebreak = (team: 'team1' | 'team2') => {
    if (team === 'team1') setTeam1Tiebreak(team1Tiebreak + 1);
    if (team === 'team2') setTeam2Tiebreak(team2Tiebreak + 1);
  };

  const decrementTiebreak = (team: 'team1' | 'team2') => {
    if (team === 'team1' && team1Tiebreak > 0) setTeam1Tiebreak(team1Tiebreak - 1);
    if (team === 'team2' && team2Tiebreak > 0) setTeam2Tiebreak(team2Tiebreak - 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center border-b pb-4">
        <h3 className="text-xl font-bold text-gray-900 flex items-center justify-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          Resultado Beach Tennis
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          1 set até 6 games • Diferença mínima de 2 • Tiebreak em 6-6
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Teams and Score */}
      <div className="space-y-4">
        {/* Team 1 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-semibold text-gray-900 truncate max-w-[200px]">{team1Name}</h4>
                <p className="text-sm text-gray-600">Time 1</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => decrementGames('team1')}
                className="w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center font-bold"
                disabled={saving || team1Games === 0}
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="7"
                value={team1Games}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value >= 0 && value <= 7) {
                    setTeam1Games(value);
                  }
                }}
                className="text-3xl font-bold text-blue-600 w-16 text-center border-2 border-blue-200 rounded-lg focus:border-blue-500 focus:outline-none"
                disabled={saving}
              />
              <button
                onClick={() => incrementGames('team1')}
                className="w-8 h-8 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center font-bold"
                disabled={saving || team1Games === 7}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* VS Divider */}
        <div className="text-center">
          <span className="bg-gray-100 px-4 py-2 rounded-full text-sm font-medium text-gray-600">
            VS
          </span>
        </div>

        {/* Team 2 */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <h4 className="font-semibold text-gray-900 truncate max-w-[200px]">{team2Name}</h4>
                <p className="text-sm text-gray-600">Time 2</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => decrementGames('team2')}
                className="w-8 h-8 rounded-full bg-green-600 text-white hover:bg-green-700 flex items-center justify-center font-bold"
                disabled={saving || team2Games === 0}
              >
                -
              </button>
              <input
                type="number"
                min="0"
                max="7"
                value={team2Games}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 0;
                  if (value >= 0 && value <= 7) {
                    setTeam2Games(value);
                  }
                }}
                className="text-3xl font-bold text-green-600 w-16 text-center border-2 border-green-200 rounded-lg focus:border-green-500 focus:outline-none"
                disabled={saving}
              />
              <button
                onClick={() => incrementGames('team2')}
                className="w-8 h-8 rounded-full bg-green-600 text-white hover:bg-green-700 flex items-center justify-center font-bold"
                disabled={saving || team2Games === 7}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tiebreak Section */}
      {needsTiebreak && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="text-lg font-semibold text-center mb-4 text-yellow-800">
            🏆 Tiebreak (até 7 pontos, diferença de 2)
          </h4>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">{team1Name}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => decrementTiebreak('team1')}
                  className="w-6 h-6 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center text-sm"
                  disabled={saving || team1Tiebreak === 0}
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={team1Tiebreak}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value >= 0) {
                      setTeam1Tiebreak(value);
                    }
                  }}
                  className="text-2xl font-bold text-blue-600 w-12 text-center border-2 border-blue-200 rounded focus:border-blue-500 focus:outline-none"
                  disabled={saving}
                />
                <button
                  onClick={() => incrementTiebreak('team1')}
                  className="w-6 h-6 rounded-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center text-sm"
                  disabled={saving}
                >
                  +
                </button>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 mb-2">{team2Name}</p>
              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => decrementTiebreak('team2')}
                  className="w-6 h-6 rounded-full bg-green-600 text-white hover:bg-green-700 flex items-center justify-center text-sm"
                  disabled={saving || team2Tiebreak === 0}
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={team2Tiebreak}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 0;
                    if (value >= 0) {
                      setTeam2Tiebreak(value);
                    }
                  }}
                  className="text-2xl font-bold text-green-600 w-12 text-center border-2 border-green-200 rounded focus:border-green-500 focus:outline-none"
                  disabled={saving}
                />
                <button
                  onClick={() => incrementTiebreak('team2')}
                  className="w-6 h-6 rounded-full bg-green-600 text-white hover:bg-green-700 flex items-center justify-center text-sm"
                  disabled={saving}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Winner Display */}
      {getWinner() && (
        <div className="bg-green-100 border border-green-300 rounded-lg p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-800">
            <Trophy className="h-5 w-5" />
            <span className="font-semibold">Vencedor: {getWinner()}</span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button 
          onClick={handleSave} 
          loading={saving} 
          disabled={!isValidScore() || saving}
          className="bg-green-600 hover:bg-green-700"
        >
          Salvar Resultado
        </Button>
      </div>
    </div>
  );
};

export default BeachTennisMatchEditor;
