import React, { useState, useEffect } from 'react';
import { Match } from '../../types';
import { BeachTennisScore, MatchFormat } from '../../types/tournament';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MinusCircle, PlusCircle, Save, X, Info, Award, AlertCircle } from 'lucide-react';
import { useNotificationStore } from '../../store';

interface ModalRegistroGamesProps {
  match: Match;
  isOpen: boolean;
  onClose: () => void;
  onSave: (matchId: string, beachTennisScore: BeachTennisScore, walkover?: boolean) => Promise<void>;
  participantMap?: Map<string, string>; // Maps IDs to names
  matchFormat?: MatchFormat;
}

export const ModalRegistroGames: React.FC<ModalRegistroGamesProps> = ({
  match,
  isOpen,
  onClose,
  onSave,
  participantMap = new Map(),
  matchFormat = MatchFormat.GROUP_STAGE
}) => {
  const addNotification = useNotificationStore(state => state.addNotification);
  const [loading, setLoading] = useState(false);
  const [scoreData, setScoreData] = useState<BeachTennisScore & { isWalkover?: boolean, incidentReport?: string }>({
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
        // Best of 3 sets, 4 games per set, TB7
        initialSets = [
          { team1Games: 0, team2Games: 0, tiebreak: undefined },
          { team1Games: 0, team2Games: 0, tiebreak: undefined },
          { team1Games: 0, team2Games: 0, tiebreak: undefined }
        ];
        break;
        
      case MatchFormat.ELIMINATION_FINAL:
        // Best of 3 sets, 4 games per set, MTB10
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
      setScoreData({
        ...match.beachTennisScore,
        isWalkover: match.walkover
      });
    } else {
      setScoreData({
        sets: initialSets,
        completed: false,
        winnerId: null,
        isWalkover: match.walkover
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
    
    // Determine max games based on match format
    const maxGames = matchFormat === MatchFormat.GROUP_STAGE ? 7 : 4;
    
    // Make sure value is between 0 and max
    const clampedValue = Math.max(0, Math.min(maxGames, value));
    
    if (team === 'team1') {
      newSets[setIndex].team1Games = clampedValue;
    } else {
      newSets[setIndex].team2Games = clampedValue;
    }
    
    // Handle tiebreak based on match format
    if (matchFormat === MatchFormat.GROUP_STAGE) {
      // Group stage: tiebreak at 6-6
      if (newSets[setIndex].team1Games >= 6 && newSets[setIndex].team2Games >= 6) {
        if (!newSets[setIndex].tiebreak) {
          newSets[setIndex].tiebreak = { team1Points: 0, team2Points: 0 };
        }
      } else if ((newSets[setIndex].team1Games >= 6 && newSets[setIndex].team1Games - newSets[setIndex].team2Games >= 2) || 
                 (newSets[setIndex].team2Games >= 6 && newSets[setIndex].team2Games - newSets[setIndex].team1Games >= 2)) {
        // No tiebreak needed if someone wins by 2 games
        newSets[setIndex].tiebreak = undefined;
      }
    } else {
      // Elimination rounds: tiebreak at 4-4
      if (newSets[setIndex].team1Games >= 4 && newSets[setIndex].team2Games >= 4) {
        if (!newSets[setIndex].tiebreak) {
          newSets[setIndex].tiebreak = { team1Points: 0, team2Points: 0 };
        }
      } else if ((newSets[setIndex].team1Games >= 4 && newSets[setIndex].team1Games - newSets[setIndex].team2Games >= 2) || 
                 (newSets[setIndex].team2Games >= 4 && newSets[setIndex].team2Games - newSets[setIndex].team1Games >= 2)) {
        // No tiebreak needed if someone wins by 2 games
        newSets[setIndex].tiebreak = undefined;
      }
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
    
    // Clamp the value (minimum 0)
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
    if (scoreData.isWalkover && scoreData.winnerId) {
      return scoreData.winnerId;
    }
    
    let team1Sets = 0;
    let team2Sets = 0;
    
    // Count sets won by each team
    scoreData.sets.forEach(set => {
      // Skip empty sets
      if (set.team1Games === 0 && set.team2Games === 0) {
        return;
      }
        // Special case for match tiebreak in final set
      const currentSetIndex = scoreData.sets.indexOf(set);
      if (currentSetIndex === 2 && matchFormat === MatchFormat.ELIMINATION_FINAL && set.tiebreak) {
        // Match tiebreak is first to 10 with 2 point lead
        if (set.tiebreak.team1Points >= 10 && 
            set.tiebreak.team1Points - set.tiebreak.team2Points >= 2) {
          team1Sets++;
        } else if (set.tiebreak.team2Points >= 10 && 
                  set.tiebreak.team2Points - set.tiebreak.team1Points >= 2) {
          team2Sets++;
        }
        return;
      }
      
      // Regular set with possible tiebreak
      if (matchFormat === MatchFormat.GROUP_STAGE) {
        // Group stage format
        if (set.tiebreak) {
          // Tiebreak (must be 6-6)
          if (set.tiebreak.team1Points > set.tiebreak.team2Points && 
              set.tiebreak.team1Points >= 7 && 
              set.tiebreak.team1Points - set.tiebreak.team2Points >= 2) {
            team1Sets++;
          } else if (set.tiebreak.team2Points > set.tiebreak.team1Points &&
                    set.tiebreak.team2Points >= 7 &&
                    set.tiebreak.team2Points - set.tiebreak.team1Points >= 2) {
            team2Sets++;
          }
        } else {
          // Regular set win (must have 6 games and 2 game lead)
          if (set.team1Games >= 6 && set.team1Games - set.team2Games >= 2) {
            team1Sets++;
          } else if (set.team2Games >= 6 && set.team2Games - set.team1Games >= 2) {
            team2Sets++;
          }
        }
      } else {
        // Elimination format (shorter sets)
        if (set.tiebreak) {
          // Tiebreak (must be 4-4)
          if (set.tiebreak.team1Points > set.tiebreak.team2Points && 
              set.tiebreak.team1Points >= 7 && 
              set.tiebreak.team1Points - set.tiebreak.team2Points >= 2) {
            team1Sets++;
          } else if (set.tiebreak.team2Points > set.tiebreak.team1Points &&
                    set.tiebreak.team2Points >= 7 &&
                    set.tiebreak.team2Points - set.tiebreak.team1Points >= 2) {
            team2Sets++;
          }
        } else {
          // Regular set win (must have 4 games and 2 game lead)
          if (set.team1Games >= 4 && set.team1Games - set.team2Games >= 2) {
            team1Sets++;
          } else if (set.team2Games >= 4 && set.team2Games - set.team1Games >= 2) {
            team2Sets++;
          }
        }
      }
    });
    
    // Different winning conditions based on match format
    if (matchFormat === MatchFormat.GROUP_STAGE) {
      // Best of 1 set
      if (team1Sets > team2Sets) return 'team1';
      if (team2Sets > team1Sets) return 'team2';
      return null;
    } else {
      // Best of 3 sets for elimination rounds
      if (team1Sets >= 2) return 'team1';
      if (team2Sets >= 2) return 'team2';
      return null;
    }
  };

  // Check if enough data to complete the match
  const canCompleteMatch = () => {
    if (scoreData.isWalkover && scoreData.winnerId) return true;
    return calculateWinner() !== null;
  };

  // Handle match completion and saving
  const handleSaveMatch = async () => {
    try {
      setLoading(true);
      
      // Calculate winner
      const winner = calculateWinner();
      
      if (!winner && !scoreData.isWalkover) {
        addNotification({
          type: 'warning', 
          message: 'Não é possível completar a partida sem um vencedor definido.'
        });
        setLoading(false);
        return;
      }
      
      // Get final winner - either from score or from walkover selection
      const finalWinner = scoreData.isWalkover ? scoreData.winnerId : winner;
      
      if (!finalWinner) {
        addNotification({
          type: 'warning',
          message: 'Selecione um vencedor para o walkover.'
        });
        setLoading(false);
        return;
      }
      
      // Update scoreData with winner and completed status
      const finalScoreData: BeachTennisScore = {
        sets: scoreData.sets,
        winnerId: finalWinner,
        completed: true,
        incidentReport: scoreData.incidentReport
      };
      
      // Call parent save function
      await onSave(match.id, finalScoreData, scoreData.isWalkover);
      
      addNotification({
        type: 'success',
        message: 'Resultado salvo com sucesso!'
      });
      
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error saving match result:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao salvar resultado: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle walkover toggle
  const toggleWalkover = () => {
    setScoreData(prev => ({
      ...prev,
      isWalkover: !prev.isWalkover,
      winnerId: null // Reset winner when toggling walkover
    }));
  };

  // Handle incident report input
  const handleIncidentReportChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setScoreData(prev => ({
      ...prev,
      incidentReport: e.target.value
    }));
  };

  // Format explaining current match format rules
  const renderMatchFormatRules = () => {
    switch(matchFormat) {
      case MatchFormat.GROUP_STAGE:
        return (
          <div className="text-sm text-gray-600 mb-4 px-3 py-2 bg-blue-50 rounded-md flex items-start">
            <Info size={16} className="mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Formato da Fase de Grupos:</p>
              <p>1 set até 6 games, com tie-break em 6-6.</p>
            </div>
          </div>
        );
        
      case MatchFormat.ELIMINATION_EARLY:
        return (
          <div className="text-sm text-gray-600 mb-4 px-3 py-2 bg-blue-50 rounded-md flex items-start">
            <Info size={16} className="mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Formato da Fase Eliminatória (Rodadas Iniciais):</p>
              <p>Melhor de 3 sets, 4 games por set, Tie-break normal em 4-4 (até 7 pontos).</p>
            </div>
          </div>
        );
        
      case MatchFormat.ELIMINATION_FINAL:
        return (
          <div className="text-sm text-gray-600 mb-4 px-3 py-2 bg-blue-50 rounded-md flex items-start">
            <Info size={16} className="mt-0.5 mr-2 text-blue-500 flex-shrink-0" />
            <div>
              <p className="font-medium mb-1">Formato da Final:</p>
              <p>Melhor de 3 sets, 4 games por set, Match Tie-break no 3º set (até 10 pontos).</p>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose}
      title="Registrar Resultado da Partida"
      size="large"
    >
      <div className="space-y-4">
        {renderMatchFormatRules()}
        
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-md font-medium">
          <div className="text-left flex-1">{team1Name}</div>
          <div className="text-center mx-2">VS</div>
          <div className="text-right flex-1">{team2Name}</div>
        </div>
        
        {/* Checkbox for walkover */}
        <div className="flex items-center">
          <input 
            type="checkbox" 
            id="walkover" 
            checked={!!scoreData.isWalkover}
            onChange={toggleWalkover}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="walkover" className="ml-2 text-sm text-gray-600">
            Walkover (W.O.) - Vitória por ausência
          </label>
        </div>
        
        {scoreData.isWalkover ? (
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-2">Selecione o vencedor:</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                className={`p-3 border rounded text-center ${scoreData.winnerId === 'team1' ? 
                  'bg-green-100 border-green-500' : 'hover:bg-gray-50'}`}
                onClick={() => {
                  setScoreData(prev => ({
                    ...prev,
                    winnerId: 'team1'
                  }));
                }}
              >
                {team1Name}
              </button>
              <button 
                className={`p-3 border rounded text-center ${scoreData.winnerId === 'team2' ? 
                  'bg-green-100 border-green-500' : 'hover:bg-gray-50'}`}
                onClick={() => {
                  setScoreData(prev => ({
                    ...prev,
                    winnerId: 'team2'
                  }));
                }}
              >
                {team2Name}
              </button>
            </div>
          </div>
        ) : (
          // Score input for each set
          <div className="space-y-3">
            {scoreData.sets.map((set, setIndex) => {
              // Skip rendering third set for early rounds if not needed
              if (setIndex === 2 && matchFormat === MatchFormat.ELIMINATION_EARLY) {                const team1SetsWon = scoreData.sets
                  .filter((_, i) => i < 2)
                  .filter(s => (s.team1Games > s.team2Games && ((s.team1Games >= 4 && s.team1Games - s.team2Games >= 2) || 
                              (s.tiebreak && s.tiebreak.team1Points > s.tiebreak.team2Points))))
                  .length;
                    const team2SetsWon = scoreData.sets
                  .filter((_, i) => i < 2)
                  .filter(s => (s.team2Games > s.team1Games && ((s.team2Games >= 4 && s.team2Games - s.team1Games >= 2) || 
                              (s.tiebreak && s.tiebreak.team2Points > s.tiebreak.team1Points))))
                  .length;
                  
                // Only show third set if needed
                if (team1SetsWon !== 2 && team2SetsWon !== 2 && (team1SetsWon + team2SetsWon < 2)) {
                  return null;
                }
              }
              
              return (
                <div key={`set-${setIndex}`} className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Set {setIndex + 1}</h4>
                    {setIndex === 2 && matchFormat === MatchFormat.ELIMINATION_FINAL && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                        Match Tiebreak (10 pontos)
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="text-sm font-medium">{team1Name}</div>
                      <div className="flex items-center">
                        <button 
                          className="p-1 rounded-full hover:bg-gray-100" 
                          onClick={() => updateGames(setIndex, 'team1', (set.team1Games || 0) - 1)}
                          disabled={loading || scoreData.isWalkover}
                        >
                          <MinusCircle size={20} />
                        </button>
                        <input 
                          type="number" 
                          min="0" 
                          max={matchFormat === MatchFormat.GROUP_STAGE ? "7" : "4"}
                          value={set.team1Games || 0}
                          onChange={(e) => updateGames(setIndex, 'team1', parseInt(e.target.value) || 0)}
                          className="w-12 mx-2 p-2 border rounded text-center" 
                          disabled={loading || scoreData.isWalkover}
                        />
                        <button 
                          className="p-1 rounded-full hover:bg-gray-100" 
                          onClick={() => updateGames(setIndex, 'team1', (set.team1Games || 0) + 1)}
                          disabled={loading || scoreData.isWalkover}
                        >
                          <PlusCircle size={20} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-right">{team2Name}</div>
                      <div className="flex items-center justify-end">
                        <button 
                          className="p-1 rounded-full hover:bg-gray-100" 
                          onClick={() => updateGames(setIndex, 'team2', (set.team2Games || 0) - 1)}
                          disabled={loading || scoreData.isWalkover}
                        >
                          <MinusCircle size={20} />
                        </button>
                        <input 
                          type="number" 
                          min="0" 
                          max={matchFormat === MatchFormat.GROUP_STAGE ? "7" : "4"}
                          value={set.team2Games || 0}
                          onChange={(e) => updateGames(setIndex, 'team2', parseInt(e.target.value) || 0)}
                          className="w-12 mx-2 p-2 border rounded text-center" 
                          disabled={loading || scoreData.isWalkover}
                        />
                        <button 
                          className="p-1 rounded-full hover:bg-gray-100" 
                          onClick={() => updateGames(setIndex, 'team2', (set.team2Games || 0) + 1)}
                          disabled={loading || scoreData.isWalkover}
                        >
                          <PlusCircle size={20} />
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tiebreak section - different for match tiebreak in final */}
                  {set.tiebreak && (
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-medium mb-3">
                        {setIndex === 2 && matchFormat === MatchFormat.ELIMINATION_FINAL ? 
                          'Match Tie-break (até 10)' : 'Tie-break (até 7)'}
                      </h5>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600">{team1Name}</div>
                          <div className="flex items-center">
                            <button 
                              className="p-1 rounded-full hover:bg-gray-100" 
                              onClick={() => updateTiebreak(setIndex, 'team1', (set.tiebreak?.team1Points || 0) - 1)}
                              disabled={loading || scoreData.isWalkover}
                            >
                              <MinusCircle size={16} />
                            </button>
                            <input 
                              type="number" 
                              min="0"
                              value={set.tiebreak?.team1Points || 0}
                              onChange={(e) => updateTiebreak(setIndex, 'team1', parseInt(e.target.value) || 0)}
                              className="w-12 mx-2 p-1.5 border rounded text-center text-sm" 
                              disabled={loading || scoreData.isWalkover}
                            />
                            <button 
                              className="p-1 rounded-full hover:bg-gray-100" 
                              onClick={() => updateTiebreak(setIndex, 'team1', (set.tiebreak?.team1Points || 0) + 1)}
                              disabled={loading || scoreData.isWalkover}
                            >
                              <PlusCircle size={16} />
                            </button>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <div className="text-xs text-gray-600 text-right">{team2Name}</div>
                          <div className="flex items-center justify-end">
                            <button 
                              className="p-1 rounded-full hover:bg-gray-100" 
                              onClick={() => updateTiebreak(setIndex, 'team2', (set.tiebreak?.team2Points || 0) - 1)}
                              disabled={loading || scoreData.isWalkover}
                            >
                              <MinusCircle size={16} />
                            </button>
                            <input 
                              type="number" 
                              min="0"
                              value={set.tiebreak?.team2Points || 0}
                              onChange={(e) => updateTiebreak(setIndex, 'team2', parseInt(e.target.value) || 0)}
                              className="w-12 mx-2 p-1.5 border rounded text-center text-sm" 
                              disabled={loading || scoreData.isWalkover}
                            />
                            <button 
                              className="p-1 rounded-full hover:bg-gray-100" 
                              onClick={() => updateTiebreak(setIndex, 'team2', (set.tiebreak?.team2Points || 0) + 1)}
                              disabled={loading || scoreData.isWalkover}
                            >
                              <PlusCircle size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        {/* Match winner info */}
        {calculateWinner() && (
          <div className="flex items-center justify-center p-3 bg-green-50 border border-green-200 rounded-md">
            <Award size={20} className="text-green-600 mr-2" />
            <span className="font-medium">
              Vencedor: {calculateWinner() === 'team1' ? team1Name : team2Name}
            </span>
          </div>
        )}
        
        {/* Incident report section */}
        <div className="mt-4">
          <label className="flex items-start mb-2">
            <AlertCircle size={16} className="mr-2 text-orange-500 mt-1" />
            <span className="text-sm font-medium text-gray-700">Registro de incidentes (opcional)</span>
          </label>
          <textarea
            value={scoreData.incidentReport || ''}
            onChange={handleIncidentReportChange}
            placeholder="Descreva qualquer incidente ocorrido durante a partida (opcional)."
            rows={3}
            className="w-full border rounded-md p-2 text-sm"
            disabled={loading}
          />
        </div>
        
        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            <X size={18} className="mr-1" /> Cancelar
          </Button>
          <Button 
            onClick={handleSaveMatch} 
            loading={loading} 
            disabled={!canCompleteMatch() || loading}
          >
            <Save size={18} className="mr-1" /> Salvar Resultado
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ModalRegistroGames;
