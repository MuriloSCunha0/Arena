import React, { useState, useEffect } from 'react';
import { Match } from '../../types';
import { BeachTennisScore, MatchFormat } from '../../types/tournament';
import { Button } from '../ui/Button';
import { MinusCircle, PlusCircle, Save, X, Info, Award } from 'lucide-react';
import { useNotificationStore } from '../../store';

interface BeachTennisMatchEditorProps {
  match: Match;
  onSave: (matchId: string, beachTennisScore: BeachTennisScore) => Promise<void>;
  onClose: () => void;
  participantMap?: Map<string, string>; // Maps IDs to names
  matchFormat?: MatchFormat;
}

export const BeachTennisMatchEditor: React.FC<BeachTennisMatchEditorProps> = ({
  match,
  onSave,
  onClose,
  participantMap = new Map(),
  matchFormat = MatchFormat.GROUP_STAGE
}) => {
  const addNotification = useNotificationStore(state => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState<BeachTennisScore>({
    sets: [],
    completed: false,
    winnerId: null
  });

  // Initialize score structure based on match format
  useEffect(() => {
    let initialSets: BeachTennisScore['sets'] = [];
    
    switch(matchFormat) {
      case MatchFormat.GROUP_STAGE:
        // 1 set with tiebreak
        initialSets = [{ team1Games: 0, team2Games: 0, tiebreak: undefined }];
        break;
        
      case MatchFormat.ELIMINATION_EARLY:
      case MatchFormat.ELIMINATION_FINAL:
        // Best of 3 sets
        initialSets = [
          { team1Games: 0, team2Games: 0, tiebreak: undefined },
          { team1Games: 0, team2Games: 0, tiebreak: undefined },
          { team1Games: 0, team2Games: 0, tiebreak: undefined }
        ];
        break;
        
      default:
        initialSets = [{ team1Games: 0, team2Games: 0, tiebreak: undefined }];
    }
    
    // Initialize from existing data if available
    if (match.beachTennisScore) {
      setScoreData(match.beachTennisScore);
    } else {
      setScoreData({
        sets: initialSets,
        completed: false,
        winnerId: null
      });
    }
  }, [match, matchFormat]);
  // Get team names
  const getTeamName = (teamIds: string[] | null) => {
    if (!teamIds || teamIds.length === 0) return 'TBD';
    return teamIds.map(id => participantMap.get(id) || id).join(' & ');
  };

  const team1Name = getTeamName(match.team1);
  const team2Name = getTeamName(match.team2);

  // Update games for a specific set
  const updateGames = (setIndex: number, team: 'team1' | 'team2', value: number) => {
    const newSets = [...scoreData.sets];
    
    // Make sure value is between 0 and 7 (possible tiebreak)
    const clampedValue = Math.max(0, Math.min(7, value));
    
    if (team === 'team1') {
      newSets[setIndex].team1Games = clampedValue;
    } else {
      newSets[setIndex].team2Games = clampedValue;
    }
    
    // If either team reaches 7 or 6 games, it might be a tiebreak
    if (newSets[setIndex].team1Games >= 6 && newSets[setIndex].team2Games >= 6) {
      // Ensure we have a tiebreak structure
      if (!newSets[setIndex].tiebreak) {
        newSets[setIndex].tiebreak = { team1Points: 0, team2Points: 0 };
      }
    } else {
      // No tiebreak needed
      newSets[setIndex].tiebreak = undefined;
    }
    
    setScoreData(prev => ({
      ...prev,
      sets: newSets
    }));
  };

  // Update tiebreak points
  const updateTiebreak = (setIndex: number, team: 'team1' | 'team2', value: number) => {
    const newSets = [...scoreData.sets];
    
    // Ensure there's a tiebreak object
    if (!newSets[setIndex].tiebreak) {
      newSets[setIndex].tiebreak = { team1Points: 0, team2Points: 0 };
    }
    
    // Clamp the value (minimum 0, no maximum for tiebreak)
    const clampedValue = Math.max(0, value);
    
    // Update the points
    if (team === 'team1') {
      newSets[setIndex].tiebreak.team1Points = clampedValue;
    } else {
      newSets[setIndex].tiebreak.team2Points = clampedValue;
    }
    
    setScoreData(prev => ({
      ...prev,
      sets: newSets
    }));
  };

  // Calculate winner based on current score
  const calculateWinner = (): 'team1' | 'team2' | null => {
    let team1Sets = 0;
    let team2Sets = 0;
    
    // Count sets won by each team
    scoreData.sets.forEach(set => {
      if (set.tiebreak) {
        // Tiebreak win
        if (set.team1Games === 6 && set.team2Games === 6) {
          if (set.tiebreak.team1Points > set.tiebreak.team2Points) {
            team1Sets++;
          } else if (set.tiebreak.team2Points > set.tiebreak.team1Points) {
            team2Sets++;
          }
        }
      } else {
        // Regular set win
        if (set.team1Games > set.team2Games && set.team1Games >= 4) {
          team1Sets++;
        } else if (set.team2Games > set.team1Games && set.team2Games >= 4) {
          team2Sets++;
        }
      }
    });
    
    // Best of 1 set (GROUP_STAGE)
    if (matchFormat === MatchFormat.GROUP_STAGE) {
      if (team1Sets > team2Sets) return 'team1';
      if (team2Sets > team1Sets) return 'team2';
      return null;
    }
    
    // Best of 3 sets (elimination rounds)
    if (team1Sets >= 2) return 'team1';
    if (team2Sets >= 2) return 'team2';
    
    return null;
  };

  // Check if enough data to complete the match
  const canCompleteMatch = () => {
    const winner = calculateWinner();
    return winner !== null;
  };

  // Handle match completion and saving
  const handleSaveMatch = async () => {
    try {
      setLoading(true);
      
      // Calculate winner
      const winner = calculateWinner();
      
      if (!winner) {
        addNotification({
          type: 'warning', 
          message: 'Não é possível completar a partida sem um vencedor definido.'
        });
        return;
      }
        // Update scoreData with winner and completed status
      const finalScoreData: BeachTennisScore = {
        ...scoreData,
        winnerId: winner,
        completed: true
      };
      
      // Save via the provided callback
      await onSave(match.id, finalScoreData);
      
      addNotification({
        type: 'success',
        message: 'Resultado da partida salvo com sucesso!'
      });
      
      onClose();
    } catch (error) {
      console.error('Error saving match result:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao salvar resultado da partida.'
      });
    } finally {
      setLoading(false);
    }
  };

  // Row for each set
  const renderSetRow = (setIndex: number) => {
    const set = scoreData.sets[setIndex];
    return (
      <div key={`set-${setIndex}`} className="bg-white rounded-lg p-4 border border-gray-200 mb-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium text-brand-purple">Set {setIndex + 1}</h3>
          {set.tiebreak && (
            <div className="bg-amber-50 text-amber-700 text-xs px-2 py-1 rounded-full border border-amber-200">
              Tie Break
            </div>
          )}
        </div>
        
        {/* Team 1 Score */}
        <div className="flex flex-col md:flex-row md:items-center mb-4">
          <div className="w-full md:w-1/3 font-medium text-gray-700 mb-2 md:mb-0">
            {team1Name}
          </div>
          <div className="flex items-center">
            <button 
              onClick={() => updateGames(setIndex, 'team1', (set.team1Games || 0) - 1)}
              className="p-1 rounded-full hover:bg-gray-100"
              type="button"
              disabled={set.team1Games === 0}
            >
              <MinusCircle size={18} className={set.team1Games === 0 ? "text-gray-300" : "text-gray-500"} />
            </button>
            
            <div className="mx-3 w-16 h-12 flex items-center justify-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-lg">
              {set.team1Games}
            </div>
            
            <button 
              onClick={() => updateGames(setIndex, 'team1', (set.team1Games || 0) + 1)}
              className="p-1 rounded-full hover:bg-gray-100"
              type="button"
            >
              <PlusCircle size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Team 2 Score */}
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="w-full md:w-1/3 font-medium text-gray-700 mb-2 md:mb-0">
            {team2Name}
          </div>
          <div className="flex items-center">
            <button 
              onClick={() => updateGames(setIndex, 'team2', (set.team2Games || 0) - 1)}
              className="p-1 rounded-full hover:bg-gray-100"
              type="button"
              disabled={set.team2Games === 0}
            >
              <MinusCircle size={18} className={set.team2Games === 0 ? "text-gray-300" : "text-gray-500"} />
            </button>
            
            <div className="mx-3 w-16 h-12 flex items-center justify-center text-xl font-bold bg-gray-50 border border-gray-200 rounded-lg">
              {set.team2Games}
            </div>
            
            <button 
              onClick={() => updateGames(setIndex, 'team2', (set.team2Games || 0) + 1)}
              className="p-1 rounded-full hover:bg-gray-100"
              type="button"
            >
              <PlusCircle size={18} className="text-gray-500" />
            </button>
          </div>
        </div>
        
        {/* Tiebreak Section */}
        {set.tiebreak && (
          <div className="mt-4 pt-4 border-t border-dashed border-gray-200">
            <div className="flex items-center mb-2">
              <Info size={16} className="text-amber-500 mr-1" />
              <h4 className="text-sm font-medium text-amber-700">Tie Break</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              {/* Team 1 Tiebreak */}
              <div>
                <div className="text-xs text-gray-500 mb-1">{team1Name}</div>
                <div className="flex items-center">
                  <button 
                    onClick={() => updateTiebreak(setIndex, 'team1', (set.tiebreak?.team1Points || 0) - 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                    type="button"
                    disabled={(set.tiebreak?.team1Points || 0) === 0}
                  >
                    <MinusCircle size={16} className={(set.tiebreak?.team1Points || 0) === 0 ? "text-gray-300" : "text-gray-500"} />
                  </button>
                  
                  <div className="mx-2 w-12 h-8 flex items-center justify-center text-lg font-bold bg-gray-50 border border-gray-200 rounded-lg">
                    {set.tiebreak?.team1Points || 0}
                  </div>
                  
                  <button 
                    onClick={() => updateTiebreak(setIndex, 'team1', (set.tiebreak?.team1Points || 0) + 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                    type="button"
                  >
                    <PlusCircle size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* Team 2 Tiebreak */}
              <div>
                <div className="text-xs text-gray-500 mb-1">{team2Name}</div>
                <div className="flex items-center">
                  <button 
                    onClick={() => updateTiebreak(setIndex, 'team2', (set.tiebreak?.team2Points || 0) - 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                    type="button"
                    disabled={(set.tiebreak?.team2Points || 0) === 0}
                  >
                    <MinusCircle size={16} className={(set.tiebreak?.team2Points || 0) === 0 ? "text-gray-300" : "text-gray-500"} />
                  </button>
                  
                  <div className="mx-2 w-12 h-8 flex items-center justify-center text-lg font-bold bg-gray-50 border border-gray-200 rounded-lg">
                    {set.tiebreak?.team2Points || 0}
                  </div>
                  
                  <button 
                    onClick={() => updateTiebreak(setIndex, 'team2', (set.tiebreak?.team2Points || 0) + 1)}
                    className="p-1 rounded-full hover:bg-gray-100"
                    type="button"
                  >
                    <PlusCircle size={16} className="text-gray-500" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Calculate match result
  const winner = calculateWinner();
  const setsWonTeam1 = scoreData.sets.filter(set => {
    if (set.tiebreak && set.team1Games === 6 && set.team2Games === 6) {
      return set.tiebreak.team1Points > set.tiebreak.team2Points;
    }
    return set.team1Games > set.team2Games && set.team1Games >= 4;
  }).length;
  
  const setsWonTeam2 = scoreData.sets.filter(set => {
    if (set.tiebreak && set.team1Games === 6 && set.team2Games === 6) {
      return set.tiebreak.team2Points > set.tiebreak.team1Points;
    }
    return set.team2Games > set.team1Games && set.team2Games >= 4;
  }).length;

  return (
    <div className="space-y-4">
      {/* Match Info */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium">Registrar Placar de Beach Tennis</h3>
            <p className="text-sm text-gray-500">
              {matchFormat === MatchFormat.GROUP_STAGE ? 'Fase de Grupos' : 
               matchFormat === MatchFormat.ELIMINATION_FINAL ? 'Final' : 'Fase Eliminatória'}
            </p>
          </div>
          <div className={`text-sm font-medium px-3 py-1 rounded-full ${
            winner === 'team1' ? 'bg-green-100 text-green-800' : 
            winner === 'team2' ? 'bg-blue-100 text-blue-800' : 
            'bg-gray-100 text-gray-600'
          }`}>
            {winner === 'team1' ? `${team1Name} vence` : 
             winner === 'team2' ? `${team2Name} vence` : 
             'Partida em Andamento'}
          </div>
        </div>
      </div>
      
      {/* Score summary */}
      <div className="bg-gray-100 p-4 rounded-lg flex justify-between items-center">
        <div className="font-medium">{team1Name}</div>
        <div className="flex items-center">
          <span className="text-xl font-bold">{setsWonTeam1}</span>
          <span className="mx-2 text-2xl text-gray-400">-</span>
          <span className="text-xl font-bold">{setsWonTeam2}</span>
        </div>
        <div className="font-medium">{team2Name}</div>
      </div>
      
      {/* Set inputs */}
      <div className="space-y-2">
        {scoreData.sets.map((_, index) => renderSetRow(index))}
      </div>
      
      {/* Action buttons */}
      <div className="flex justify-end space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={onClose}
          disabled={loading}
        >
          <X size={18} className="mr-2" />
          Cancelar
        </Button>
        
        <Button
          onClick={handleSaveMatch}
          disabled={!canCompleteMatch() || loading}
          loading={loading}
        >
          {winner ? (
            <>
              <Award size={18} className="mr-2" />
              Confirmar {winner === 'team1' ? team1Name : team2Name} como Vencedor
            </>
          ) : (
            <>
              <Save size={18} className="mr-2" />
              Salvar Placar
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
