import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import {
  PlayCircle,
  RefreshCw,
  Loader2,
  Award,
  Edit,
  Edit3,
  AlertCircle,
  MapPin,
  Calendar,
  XCircle,
  List,
  HelpCircle,
  MinusCircle,
  PlusCircle,
  CheckCircle,
  Maximize2, // Add this icon for full-screen toggle
  Minimize2 // Add this icon for exiting full-screen
} from 'lucide-react';
import { useTournamentStore, useParticipantsStore, useCourtsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Match, Participant, Court, TeamFormationType, EventType, Tournament } from '../../types';
import { Modal } from '../ui/Modal';
import { formatDateTime } from '../../utils/formatters';
import { TournamentRandomizer } from './TournamentRandomizer';
import { 
  calculateGroupRankings, 
  GroupRanking, 
  calculateOverallGroupStageRankings, 
  OverallRanking,
  calculateRankingsForPlacement, // Import the new function
  getRankedQualifiers // Import the new utility for qualifiers
} from '../../utils/rankingUtils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/Tooltip';

interface TournamentBracketProps {
  eventId: string;
}

interface MatchCardProps {
  teamA?: string | null;
  teamB?: string | null;
  scoreA?: number;
  scoreB?: number;
  winner?: string;
  onClick?: () => void;
  highlighted?: boolean;
  byeMatch?: boolean;
  court?: string;
  scheduledTime?: string;
  completed?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({ 
  teamA = '', 
  teamB = '', 
  scoreA, 
  scoreB, 
  winner, 
  onClick,
  highlighted = false,
  byeMatch = false,
  court,
  scheduledTime,
  completed = false
}) => {
  const hasTeams = teamA && teamB;
  const isCompleted = scoreA !== undefined && scoreB !== undefined;
  
  return (
    <div 
      className={`
        border rounded-md p-2 min-w-[200px] cursor-pointer transition-all
        ${highlighted ? 'border-brand-green bg-brand-green/10' : 'border-gray-200'}
        ${!hasTeams ? 'opacity-70' : ''}
        ${byeMatch ? 'border-gray-300 bg-gray-50' : ''}
        hover:shadow-md hover:border-brand-gray
      `}
      onClick={onClick}
    >
      <div className={`flex justify-between items-center py-1 px-2 ${winner === 'team1' ? 'bg-brand-green/20' : ''}`}>
        <span className="font-medium break-words pr-2" style={{maxWidth: 'calc(100% - 30px)'}}>
          {teamA || 'TBD'}
        </span>
        <span className="font-bold flex-shrink-0">{isCompleted ? scoreA : '-'}</span>
      </div>
      <div className={`flex justify-between items-center py-1 px-2 mt-1 ${winner === 'team2' ? 'bg-brand-green/20' : ''}`}>
        <span className="font-medium break-words pr-2" style={{maxWidth: 'calc(100% - 30px)'}}>
          {teamB || 'TBD'}
        </span>
        <span className="font-bold flex-shrink-0">{isCompleted ? scoreB : '-'}</span>
      </div>
      
      {(court || scheduledTime) && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
          {court && (
            <div className="flex items-center">
              <MapPin size={12} className="mr-1" />
              <span className="truncate">{court}</span>
            </div>
          )}
          {scheduledTime && (
            <div className="flex items-center mt-1">
              <Calendar size={12} className="mr-1" />
              <span>{scheduledTime}</span>
            </div>
          )}
        </div>
      )}

      {/* BYE indicator with improved styling */}
      {byeMatch && (
        <div className="mt-2 bg-blue-50 border border-blue-100 rounded-md p-2 text-center">
          <span className="text-blue-600 font-medium flex items-center justify-center">
            <XCircle size={14} className="mr-1" />
            BYE (Avanço Automático)
          </span>
        </div>
      )}
    </div>
  );
};

interface MatchEditorProps {
  match: Match;
  onSave: (matchId: string, score1: number, score2: number) => Promise<void>;
  onClose: () => void;
  participantMap: Map<string, string>;
}

const MatchEditor: React.FC<MatchEditorProps> = ({ match, onSave, onClose, participantMap }) => {
  const [score1, setScore1] = useState<number>(match.score1 || 0);
  const [score2, setScore2] = useState<number>(match.score2 || 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const handleSave = async () => {
    if (score1 === score2) {
      setError('Não é permitido empate. Um time deve ter pontuação maior.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      await onSave(match.id, score1, score2);
      onClose();
    } catch (error) {
      console.error('Error saving match results:', error);
      setError((error as Error).message || 'Erro ao salvar o resultado');
    } finally {
      setSaving(false);
    }
  };
  
  // Modificado para mostrar nomes completos da dupla
  const team1Name = match.team1 && match.team1.length > 0 
    ? match.team1.map(id => participantMap.get(id) || 'Desconhecido').join(' & ')
    : 'Time 1';
    
  const team2Name = match.team2 && match.team2.length > 0 
    ? match.team2.map(id => participantMap.get(id) || 'Desconhecido').join(' & ')
    : 'Time 2';
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-brand-blue">Atualizar Resultado</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <div className="font-medium pr-4 break-words max-w-[75%]">{team1Name}</div>
          <input
            type="number"
            min={0}
            value={score1}
            onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded-lg text-center flex-shrink-0"
          />
        </div>
        
        <div className="flex justify-between items-center border-b pb-2">
          <div className="font-medium pr-4 break-words max-w-[75%]">{team2Name}</div>
          <input
            type="number"
            min={0}
            value={score2}
            onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded-lg text-center flex-shrink-0"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Salvar Resultado
        </Button>
      </div>
    </div>
  );
};

interface ScheduleMatchProps {
  match: Match;
  courts: Court[];
  onSave: (matchId: string, courtId: string, scheduledTime: string) => Promise<void>;
  onClose: () => void;
}

const ScheduleMatch: React.FC<ScheduleMatchProps> = ({ match, courts, onSave, onClose }) => {
  const [selectedCourtId, setSelectedCourtId] = useState(match.courtId || '');
  const [scheduledDate, setScheduledDate] = useState('');
  const [scheduledTime, setScheduledTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (match.scheduledTime) {
      const dateTime = new Date(match.scheduledTime);
      setScheduledDate(dateTime.toISOString().split('T')[0]);
      setScheduledTime(dateTime.toTimeString().substring(0, 5));
    } else {
      const now = new Date();
      setScheduledDate(now.toISOString().split('T')[0]);
      setScheduledTime('10:00');
    }
  }, [match]);
  
  const handleSave = async () => {
    if (!selectedCourtId) {
      setError('Por favor, selecione uma quadra');
      return;
    }
    
    if (!scheduledDate || !scheduledTime) {
      setError('Por favor, defina a data e hora');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const isoDateTime = `${scheduledDate}T${scheduledTime}:00`;
      await onSave(match.id, selectedCourtId, isoDateTime);
      onClose();
    } catch (error) {
      console.error('Error scheduling match:', error);
      setError((error as Error).message || 'Erro ao agendar partida');
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium text-brand-blue">Agendar Partida</h3>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start">
          <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quadra
          </label>
          <select
            value={selectedCourtId}
            onChange={(e) => setSelectedCourtId(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
          >
            <option value="">Selecione uma quadra</option>
            {courts.map(court => (
              <option key={court.id} value={court.id}>
                {court.name} ({court.location})
              </option>
            ))}
          </select>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data
            </label>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora
            </label>
            <input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg shadow-sm border-brand-gray focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onClose} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={handleSave} loading={saving}>
          Salvar Agendamento
        </Button>
      </div>
    </div>
  );
};

interface FetchedEventData {
  id: string;
  title: string;
  team_formation: TeamFormationType;
  max_participants: number;
  type: EventType;
}

// Função auxiliar para obter detalhes da equipe
const getTeamDetails = (teamIds: string[] | null, eventParticipants: Participant[]) => {
  if (!teamIds || !teamIds.length) return null;
  
  const players = teamIds.map(id => {
    const participant = eventParticipants.find(p => p.id === id);
    return {
      name: participant?.name || 'Desconhecido',
      ranking: participant?.ranking || 0
    };
  });
  
  return {
    players,
    averageRanking: players.reduce((sum, p) => sum + p.ranking, 0) / players.length
  };
};

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ eventId }) => {
  const {
    tournament,
    selectedMatch,
    loading: loadingTournament,
    error: tournamentError,
    fetchTournament,
    generateFormedBracket: generateFormedStructure,
    generateRandomBracketAndGroups: generateRandomStructure,
    generateEliminationBracket,
    updateMatchResults,
    startTournament,
    selectMatch,
    updateMatchSchedule,
  } = useTournamentStore();

  const { eventParticipants, loading: loadingParticipants, fetchParticipantsByEvent } = useParticipantsStore();
  const { courts, loading: loadingCourts, fetchCourts } = useCourtsStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [showMatchEditor, setShowMatchEditor] = useState(false);
  const [generatingStructure, setGeneratingStructure] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [skipTeamIds, setSkipTeamIds] = useState<string[]>([]);
  const [showSkipTeamModal, setShowSkipTeamModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<FetchedEventData | null>(null);
  const [loadingEventDetails, setLoadingEventDetails] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'by-court'>('all');
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);
  const [showGroupRankingsModal, setShowGroupRankingsModal] = useState(false);
  const [calculatedRankings, setCalculatedRankings] = useState<Record<number, GroupRanking[]>>({});
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resetInProgress, setResetInProgress] = useState(false);
  const [overallGroupRankings, setOverallGroupRankings] = useState<OverallRanking[]>([]);
  const [showOverallRankingsModal, setShowOverallRankingsModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false); // Add state for full-screen mode

  // Adicione essas variáveis ao componente para acesso global
  const matchWidth = 280;       // Largura de cada cartão de partida
  const matchHeight = 120;      // Altura de cada cartão de partida
  const horizontalGap = 100;    // Espaço horizontal entre as rodadas

  // Add toggleFullScreen function implementation
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      // Enter full-screen mode
      if (bracketContainerRef.current?.parentElement?.requestFullscreen) {
        bracketContainerRef.current.parentElement.requestFullscreen()
          .then(() => {
            setIsFullScreen(true);
          })
          .catch(err => {
            console.error(`Error attempting to enable full-screen mode: ${err.message}`);
            addNotification({ type: 'error', message: 'Não foi possível ativar o modo tela cheia' });
          });
      }
    } else {
      // Exit full-screen mode
      if (document.exitFullscreen) {
        document.exitFullscreen()
          .then(() => {
            setIsFullScreen(false);
          })
          .catch(err => {
            console.error(`Error attempting to exit full-screen mode: ${err.message}`);
          });
      }
    }
  };

  // Add event listener for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // State for placement-specific rankings modal
  const [placementRankingModalTitle, setPlacementRankingModalTitle] = useState<string>('');
  const [placementRankingModalData, setPlacementRankingModalData] = useState<OverallRanking[]>([]);
  const [showPlacementRankingModal, setShowPlacementRankingModal] = useState<boolean>(false);
  const [overallRankingTab, setOverallRankingTab] = useState<'overall' | 'first' | 'second' | 'third'>('overall');
  // Add states for the different rankings
  const [firstPlaceRankings, setFirstPlaceRankings] = useState<OverallRanking[]>([]);
  const [secondPlaceRankings, setSecondPlaceRankings] = useState<OverallRanking[]>([]);
  const [thirdPlaceRankings, setThirdPlaceRankings] = useState<OverallRanking[]>([]);

  const participantMap = useMemo(() => {
      const map = new Map<string, string>();
      eventParticipants.forEach((participant: Participant) => {
          map.set(participant.id, participant.name);
      });
      return map;
  }, [eventParticipants]);

  const bracketContainerRef = useRef<HTMLDivElement>(null);
  const matchCardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (eventId) {
      setLoadingEventDetails(true);
      supabase
        .from('events')
        .select('id, title, team_formation, max_participants, type')
        .eq('id', eventId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching event details:", error);
            addNotification({ type: 'error', message: 'Erro ao buscar detalhes do evento.' });
          } else if (data) {
            setCurrentEvent(data as FetchedEventData);
          } else {
             addNotification({ type: 'error', message: 'Evento não encontrado.' });
          }
          setLoadingEventDetails(false);
        });

      fetchTournament(eventId).catch((err) => {
        console.log("Tournament might not exist yet:", err.message);
        if (err.message && !err.message.includes('JSON object requested') && !err.message.includes('Not Found')) {
          addNotification({ type: 'warning', message: 'Não foi possível buscar dados do torneio existente.' });
        }
      });
      fetchParticipantsByEvent(eventId).catch(() => {
        addNotification({ type: 'error', message: 'Falha ao carregar participantes' });
      });
      fetchCourts().catch(() => {
        addNotification({ type: 'error', message: 'Falha ao carregar quadras' });
      });
    }
  }, [eventId, fetchTournament, fetchParticipantsByEvent, fetchCourts, addNotification]);

  useEffect(() => {
    if (tournamentError) {
      addNotification({ type: 'error', message: tournamentError });
    }
  }, [tournamentError, addNotification]);

  const handleGenerateFormedStructure = async () => {
    if (!eventId || eventParticipants.length < 2) {
      addNotification({ type: 'warning', message: 'É necessário pelo menos 2 participantes/duplas para gerar a estrutura' });
      return;
    }
    if (!currentEvent) return;

    const forceReset = !!tournament;
    if (forceReset && !window.confirm('Já existe um torneio. Deseja recriar a estrutura? Isso apagará todas as partidas existentes.')) {
        return;
    }

    try {
      setGeneratingStructure(true);
      const teams: string[][] = [];
      const processedIds = new Set<string>();
      eventParticipants.forEach(p => {
          if (!processedIds.has(p.id)) {
              if (p.partnerId && eventParticipants.find(partner => partner.id === p.partnerId)) {
                  teams.push([p.id, p.partnerId]);
                  processedIds.add(p.id);
                  processedIds.add(p.partnerId);
              } else {
                  teams.push([p.id]);
                  processedIds.add(p.id);
              }
          }
      });

      await generateFormedStructure(eventId, teams, { forceReset });

      addNotification({ type: 'success', message: 'Estrutura do torneio gerada com sucesso!' });
      setSkipTeamIds([]);
    } catch (err) {
      console.error('Error generating formed structure:', err);
      addNotification({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao gerar estrutura' });
    } finally {
      setGeneratingStructure(false);
    }
  };

  // Implementation of beach tennis seeding rules for elimination bracket
  const handleGenerateElimination = async () => {
    if (!tournament) return;
    try {
      setGeneratingStructure(true);

      // Before generating, make sure we have up-to-date rankings
      const groupRankings: Record<number, GroupRanking[]> = {};
      for (const groupNum in matchesByStage.GROUP) {
        const groupMatches = matchesByStage.GROUP[groupNum];
        const completedMatches = groupMatches.filter(match => match.completed);
        if (completedMatches.length === groupMatches.length) {
          groupRankings[groupNum] = calculateGroupRankings(completedMatches);
        }
      }
      
      // Calculate sorted rankings for different placements
      const sortedFirst = calculateRankingsForPlacement(groupRankings, 1);
      const sortedSecond = calculateRankingsForPlacement(groupRankings, 2);
      
      // Store these rankings for displaying in the UI later
      setFirstPlaceRankings(sortedFirst);
      setSecondPlaceRankings(sortedSecond);
      setThirdPlaceRankings(calculateRankingsForPlacement(groupRankings, 3));
      
      // Prepare seeding data following beach tennis rules
      const seedingData = {
        firstPlaceTeams: sortedFirst,
        secondPlaceTeams: sortedSecond,
        groupRankings: groupRankings
      };

      // Fix the function call to match the expected signature
      // Fix the function call to match the expected signature
        await generateEliminationBracket(tournament.id);
      addNotification({ type: 'success', message: 'Fase eliminatória gerada com sucesso!' });
    } catch (err) {
      console.error('Error generating elimination bracket:', err);
      addNotification({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao gerar fase eliminatória' });
    } finally {
      setGeneratingStructure(false);
    }
  };

  const handleStartTournament = async () => {
    if (!tournament) return;
    try {
      await startTournament(tournament.id);
      addNotification({ type: 'success', message: 'Torneio iniciado com sucesso!' });
    } catch (err) {
      addNotification({ type: 'error', message: 'Erro ao iniciar torneio' });
    }
  };

  const handleResetTournament = () => {
    setShowResetConfirmModal(true);
  };

  const confirmResetTournament = async () => {
    try {
      setResetInProgress(true);
      
      // Chamar API para resetar o torneio - removendo o campo matches que não existe
      const { data: tournament, error } = await supabase
        .from('tournaments')
        .update({
          status: 'CREATED',
          updated_at: new Date().toISOString()
        })
        .eq('event_id', eventId)
        .select()
        .single();
        
      if (error) throw error;
      
      // Deletar todas as partidas associadas ao torneio
      const { error: deleteError } = await supabase
        .from('tournament_matches')
        .delete()
        .eq('tournament_id', tournament.id);
        
      if (deleteError) throw deleteError;
      
      addNotification({
        type: 'success',
        message: 'Torneio reiniciado com sucesso! Você pode gerar novamente a estrutura.'
      });
      
      // Recarregar o torneio
      await fetchTournament(eventId);
    } catch (error) {
      console.error('Erro ao reiniciar torneio:', error);
      addNotification({
        type: 'error',
        message: 'Erro ao reiniciar o torneio. Tente novamente.'
      });
    } finally {
      setResetInProgress(false);
      setShowResetConfirmModal(false);
    }
  };
  const handleMatchClick = (match: Match) => {
    if (match.team1 && match.team2) {
      // Permitir edição se a partida não foi completada ou se ela é editável
      if (!match.completed || match.editable) {
        selectMatch(match);
        setShowMatchEditor(true);
      } else {
        // Perguntar se o usuário quer editar o resultado, mesmo concluído
        if (confirm("Esta partida já foi concluída. Deseja editar o resultado?")) {
          match.editable = true; // Marca como editável para esta sessão
          selectMatch(match);
          setShowMatchEditor(true);
        }
      }
    } else if (!match.completed) {
      selectMatch(match);
      setShowScheduleModal(true);
    } else {
      addNotification({ type: 'info', message: 'Esta partida já foi concluída.' });
    }
  };

  // Fix in the handleSaveMatchResults function where bracket line highlight is determined
  const handleSaveMatchResults = async (matchId: string, score1: number, score2: number) => {
    try {
      await updateMatchResults(matchId, score1, score2);
      
      // Trigger animation for winner
      setTimeout(() => {
        const winnerId = score1 > score2 ? 'team1' : 'team2';
        const match = tournament?.matches.find(m => m.id === matchId);
        
        if (match && match.round < eliminationRoundsArray.length) {
          const nextRound = match.round + 1;
          const nextPosition = Math.ceil(match.position / 2);
          
          const nextMatchId = eliminationMatches.find(
            m => m.round === nextRound && m.position === nextPosition
          )?.id;
          
          if (nextMatchId && matchCardRefs.current[nextMatchId]) {
            // Adicionar classe temporariamente para acionar a animação
            matchCardRefs.current[nextMatchId].classList.add('winner-animation');
            setTimeout(() => {
              if (matchCardRefs.current[nextMatchId]) {
                matchCardRefs.current[nextMatchId].classList.remove('winner-animation');
              }
            }, 2000);
          }
        }
      }, 300);
      
      addNotification({ type: 'success', message: 'Resultado atualizado!' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar resultado.';
      addNotification({ type: 'error', message: errorMessage });
      throw err;
    }
  };

   const handleScheduleMatch = async (matchId: string, courtId: string, scheduledTime: string) => {
    try {
      await updateMatchSchedule(matchId, courtId, scheduledTime);
      addNotification({ type: 'success', message: 'Partida agendada!' });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao agendar partida.';
      addNotification({ type: 'error', message: errorMessage });
      throw err;
    }
  };

  const toggleSkipTeam = (participantId: string) => {
    setSkipTeamIds(prev => {
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      } else {
        return [...prev, participantId];
      }
    });
  };

  const filterMatchesByCourt = (matches: Match[]) => {
    if (!selectedCourtId || viewMode === 'all') return matches;
    return matches.filter(match => match.courtId === selectedCourtId);
  };

  const handleAutoAssignCourts = async () => {
    if (!tournament || !courts.length) return;

    try {
      const firstRoundMatches = tournament.matches.filter(m => m.round === 1 && m.team1 && m.team2);

      const updates = firstRoundMatches.map((match, index) => {
        const courtIndex = index % courts.length;
        return {
          matchId: match.id,
          courtId: courts[courtIndex].id,
          scheduledTime: new Date().toISOString()
        };
      });

      for (const update of updates) {
        await updateMatchSchedule(update.matchId, update.courtId, update.scheduledTime);
      }

      addNotification({
        type: 'success',
        message: 'Quadras alocadas automaticamente!'
      });

    } catch (err) {
      console.error("Erro ao alocar quadras:", err);
      addNotification({
        type: 'error',
        message: 'Erro ao alocar quadras automaticamente.'
      });
    }
  };

  const handleShowRankings = () => {
    if (!tournament || !matchesByStage.GROUP) {
      addNotification({ type: 'warning', message: 'Dados do torneio ou partidas de grupo não disponíveis.' });
      return;
    }

    const rankings: Record<number, GroupRanking[]> = {};
    // let allMatchesCompleted = true; // This variable was declared but not used effectively for overall logic
    for (const groupNum in matchesByStage.GROUP) {
      const groupMatches = matchesByStage.GROUP[groupNum];
      const completedMatches = groupMatches.filter(match => match.completed);
      // if (completedMatches.length !== groupMatches.length) { // Check for individual group completion
      //   allMatchesCompleted = false;
      // }
      rankings[groupNum] = calculateGroupRankings(completedMatches);
    }

    setCalculatedRankings(rankings);
    setShowGroupRankingsModal(true);
  };

  const handleShowOverallRankings = () => {
    if (!tournament || !matchesByStage.GROUP || !isGroupStageComplete) {
      addNotification({ type: 'warning', message: 'Todas as partidas da fase de grupos devem estar concluídas.' });
      return;
    }

    let allCompletedGroupMatches: Match[] = [];
    for (const groupNum in matchesByStage.GROUP) {
      allCompletedGroupMatches = allCompletedGroupMatches.concat(
        matchesByStage.GROUP[groupNum].filter(match => match.completed)
      );
    }

    if (allCompletedGroupMatches.length === 0) {
        addNotification({ type: 'info', message: 'Nenhuma partida de grupo concluída para calcular o ranking geral.' });
        return;
    }
    
    const overallRankingsData = calculateOverallGroupStageRankings(allCompletedGroupMatches);
    setOverallGroupRankings(overallRankingsData);
    
    // Also calculate rankings by placement
    const rankings: Record<number, GroupRanking[]> = {};
    for (const groupNum in matchesByStage.GROUP) {
      const groupMatches = matchesByStage.GROUP[groupNum];
      const completedMatches = groupMatches.filter(match => match.completed);
      if (completedMatches.length === groupMatches.length) {
        rankings[groupNum] = calculateGroupRankings(completedMatches);
      }
    }
    
    setCalculatedRankings(rankings);
    setFirstPlaceRankings(calculateRankingsForPlacement(rankings, 1));
    setSecondPlaceRankings(calculateRankingsForPlacement(rankings, 2));
    setThirdPlaceRankings(calculateRankingsForPlacement(rankings, 3));
    
    setShowOverallRankingsModal(true);
  };

  const handleShowPlacementRankings = (placement: number, title: string) => {
    if (!tournament || !matchesByStage.GROUP || !isGroupStageComplete) {
      addNotification({ type: 'warning', message: 'Todas as partidas da fase de grupos devem estar concluídas.' });
      return;
    }
    if (Object.keys(calculatedRankings).length === 0) {
      addNotification({ type: 'info', message: 'Rankings de grupo ainda não calculados. Clique em "Ver Ranking Grupos" primeiro.' });
      // Optionally, calculate them here if not already done
      // handleShowRankings(); // This might cause a double modal flash if not careful
      // For now, let's assume user clicks "Ver Ranking Grupos" first or it's auto-calculated.
      // A more robust solution would be to ensure calculatedRankings is populated.
      // Let's try to calcular it if needed.
      let currentCalculatedRankings = calculatedRankings;
      if (Object.keys(currentCalculatedRankings).length === 0 && isGroupStageComplete) {
        const rankings: Record<number, GroupRanking[]> = {};
        for (const groupNum in matchesByStage.GROUP) {
          const groupMatches = matchesByStage.GROUP[groupNum];
          // Ensure all matches in the group are completed for this specific calculation context
          const completedMatches = groupMatches.filter(match => match.completed);
          if (completedMatches.length === groupMatches.length) { // Only consider fully completed groups for this
             rankings[groupNum] = calculateGroupRankings(completedMatches);
          }
        }
        currentCalculatedRankings = rankings;
        // setCalculatedRankings(rankings); // Avoid direct state update if it triggers re-renders elsewhere unexpectedly
      }
      
      if (Object.keys(currentCalculatedRankings).length === 0) {
        addNotification({ type: 'info', message: 'Não foi possível calcular os rankings dos grupos. Verifique se todas as partidas estão completas.' });
        return;
      }
    }

    const placementRankingsData = calculateRankingsForPlacement(calculatedRankings, placement);
    if (placementRankingsData.length === 0) {
        addNotification({ type: 'info', message: `Nenhuma equipe encontrada na ${placement}ª colocação dos grupos.` });
        return;
    }
    setPlacementRankingModalData(placementRankingsData);
    setPlacementRankingModalTitle(title);
    setShowPlacementRankingModal(true);
  };

  const isDataLoading = loadingTournament || loadingParticipants || loadingCourts || loadingEventDetails;

  const matchesByStage = useMemo(() => {
    if (!tournament?.matches) return { GROUP: {}, ELIMINATION: [] };
    return tournament.matches.reduce((acc, match) => {
      if (match.stage === 'GROUP') {
        const groupNum = match.groupNumber ?? 0;
        if (!acc.GROUP[groupNum]) acc.GROUP[groupNum] = [];
        acc.GROUP[groupNum].push(match);
      } else {
        acc.ELIMINATION.push(match);
      }
      return acc;
    }, { GROUP: {} as Record<number, Match[]>, ELIMINATION: [] as Match[] });
  }, [tournament?.matches]);

  const groupNumbers = Object.keys(matchesByStage.GROUP).map(Number).sort((a, b) => a - b);
  const eliminationMatches = matchesByStage.ELIMINATION;

  const currentStage = useMemo<'NONE' | 'GROUP' | 'ELIMINATION'>(() => {
    if (!tournament || tournament.matches.length === 0) return 'NONE';
    const hasGroup = tournament.matches.some(m => m.stage === 'GROUP');
    const hasElim = tournament.matches.some(m => m.stage === 'ELIMINATION');
    if (hasElim) return 'ELIMINATION';
    if (hasGroup) return 'GROUP';
    return 'NONE';
  }, [tournament]);

  const isGroupStageComplete = useMemo(() => {
      // If there are no groups defined, the group stage is considered vacuously complete.
      // This is relevant for scenarios like direct elimination or before groups are generated.
      if (groupNumbers.length === 0) {
          return true; 
      }
      // If groups exist, all matches in every group must be completed.
      return groupNumbers.every(num =>
          matchesByStage.GROUP[num] && matchesByStage.GROUP[num].every(match => match.completed)
      );
  }, [groupNumbers, matchesByStage.GROUP]);

  // Substitua o trecho que calcula as posições dos matches
  const { eliminationRoundsArray, bracketLines, matchPositionMap } = useMemo(() => {
    const rounds: Record<number, Match[]> = {};
    eliminationMatches.forEach(match => {
      if (match?.round !== undefined && match.round !== null) {
        if (!rounds[match.round]) rounds[match.round] = [];
        rounds[match.round].push(match);
      }
    });

    const roundsArray = Object.entries(rounds)
      .map(([round, matches]) => ({
        round: parseInt(round),
        matches: matches.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)),
      }))
      .sort((a, b) => a.round - b.round);
      
    // Dimensões para layout centralizado
    // Número total de rodadas
    const totalRounds = roundsArray.length;
    
    // Calcular mapa de posições para alinhamento perfeito
    const matchPositionMap = new Map<string, { x: number, y: number, width: number, height: number }>();
    
    // Primeiro, calcular o tamanho total do bracket para centralização
    let totalBracketHeight = 0;
    const firstRoundMatches = roundsArray[0]?.matches.length || 0;
    
    if (firstRoundMatches > 0) {
      // Calcular a altura do bracket com base na primeira rodada
      const verticalGap = 40;
      totalBracketHeight = firstRoundMatches * matchHeight + (firstRoundMatches - 1) * verticalGap;
    }
    
    // Para cada rodada, calcular posições
    roundsArray.forEach((roundData, roundIndex) => {
      const matchesInRound = roundData.matches.length;
      const roundX = roundIndex * (matchWidth + horizontalGap);
      
      // Encontrar a partida final (última rodada, única partida)
      const isFinalRound = roundIndex === roundsArray.length - 1 && matchesInRound === 1;
      
      // Para a partida final, colocamos exatamente no centro vertical
      if (isFinalRound) {
        const finalMatch = roundData.matches[0];
        const centerY = totalBracketHeight / 2 - matchHeight / 2;
        
        matchPositionMap.set(finalMatch.id, {
          x: roundX,
          y: centerY,
          width: matchWidth,
          height: matchHeight
        });
      } 
      // Para a primeira rodada, distribuímos uniformemente
      else if (roundIndex === 0) {
        const verticalGap = 40;
        const totalHeight = matchesInRound * matchHeight + (matchesInRound - 1) * verticalGap;
        const startY = (totalBracketHeight - totalHeight) / 2;
        
        roundData.matches.forEach((match, matchIndex) => {
          const y = startY + matchIndex * (matchHeight + verticalGap);
          
          matchPositionMap.set(match.id, {
            x: roundX,
            y: y,
            width: matchWidth,
            height: matchHeight
          });
        });
      }
      // Para rodadas intermediárias, posicionamos com base nas origens
      else {
        roundData.matches.forEach((match) => {
          if (!match.position) return;
          
          // Encontrar as duas partidas da rodada anterior que alimentam esta
          const prevRound = roundsArray[roundIndex - 1];
          if (!prevRound) return;
          
          const sourceMatch1 = prevRound.matches.find(m => m.position === match.position * 2 - 1);
          const sourceMatch2 = prevRound.matches.find(m => m.position === match.position * 2);
          
          if (!sourceMatch1 || !sourceMatch2) return;
          
          const pos1 = matchPositionMap.get(sourceMatch1.id);
          const pos2 = matchPositionMap.get(sourceMatch2.id);
          
          if (pos1 && pos2) {
            // Colocamos a partida centralizada entre as duas fontes
            const centerY = (pos1.y + pos1.height/2 + pos2.y + pos2.height/2) / 2 - matchHeight/2;
            
            matchPositionMap.set(match.id, {
              x: roundX,
              y: centerY,
              width: matchWidth,
              height: matchHeight
            });
          }
        });
      }
    });
    
    // Gerar linhas de conexão entre as rodadas
    const lines: Array<{ key: string; path: string; fromMatch: string; toMatch: string; highlight: boolean }> = [];
    
    // Processar conexões entre rodadas
    if (roundsArray.length > 1) {
      for (let roundIndex = 0; roundIndex < roundsArray.length - 1; roundIndex++) {
        const currentRound = roundsArray[roundIndex];
        const nextRound = roundsArray[roundIndex + 1];
        
        currentRound.matches.forEach((match) => {
          if (!match) return;
          
          // Encontrar a próxima partida para a qual esta alimenta
          const nextMatchPosition = Math.ceil((match.position || 0) / 2);
          const nextMatch = nextRound.matches.find(m => m.position === nextMatchPosition);
          
          if (!nextMatch) return;
          
          const fromPos = matchPositionMap.get(match.id);
          const toPos = matchPositionMap.get(nextMatch.id);
          
          if (!fromPos || !toPos) return;
          
          // Calcular coordenadas para as linhas
          const startX = fromPos.x + fromPos.width;
          const startY = fromPos.y + (fromPos.height / 2);
          const endX = toPos.x;
          const endY = toPos.y + (toPos.height / 2);
          const midX = startX + (endX - startX) / 2;
          
          // Criar caminho com linhas retas
          const path = `
            M ${startX} ${startY}
            L ${midX} ${startY}
            L ${midX} ${endY}
            L ${endX} ${endY}
          `;
          
          // Adicionar destaque para caminhos de vencedores
          const highlight = match.completed && nextMatch.team1 && match.team2 && 
            ((match.winnerId === 'team1' && match.team1 && nextMatch.team1.includes(match.team1[0])) || 
            (match.winnerId === 'team2' && match.team2[0] && nextMatch.team1.includes(match.team2[0])));
          
          lines.push({ 
            key: `${match.id}-to-${nextMatch.id}`, 
            path,
            fromMatch: match.id,
            toMatch: nextMatch.id,
            highlight: !!highlight
          });
        });
      }
    }
    
    return { 
      eliminationRoundsArray: roundsArray, 
      bracketLines: lines,
      matchPositionMap
    };
  }, [eliminationMatches]);

  // Modified getRoundName function for proper tournament naming
  const getRoundName = (roundIndex: number, totalRounds: number) => {
    if (roundIndex === totalRounds - 1) return 'Final';
    if (roundIndex === totalRounds - 2) return 'Semifinal';
    if (roundIndex === totalRounds - 3) return 'Quartas de Final';
    if (roundIndex === totalRounds - 4) return 'Oitavas de Final';
    return `${Math.pow(2, totalRounds - roundIndex)}ª de Final`;
  };

  // Add this function before the return statement in your component
  const getBracketDimensions = () => {
    if (eliminationRoundsArray.length === 0) return { width: '100%', height: '100%' };
    
    // Calculate total width and height based on match positions
    let maxX = 0;
    let maxY = 0;
    
    matchPositionMap.forEach((position) => {
      const rightEdge = position.x + position.width;
      const bottomEdge = position.y + position.height;
      
      if (rightEdge > maxX) maxX = rightEdge;
      if (bottomEdge > maxY) maxY = bottomEdge;
    });
    
    // Add some padding
    return {
      width: `${maxX + 100}px`,
      height: `${maxY + 100}px`,
    };
  };

  // Adicione esta função para calcular a largura total do container de cabeçalhos
  const getHeaderContainerWidth = () => {
    const totalRounds = eliminationRoundsArray.length;
    if (totalRounds === 0) return '100%';
    
    return `${totalRounds * (matchWidth + horizontalGap)}px`;
  };

  // Adicione este evento para sincronizar o scroll dos cabeçalhos com o bracket
  useEffect(() => {
    const bracketContainer = bracketContainerRef.current;
    const headerContainer = document.getElementById('bracket-headers-container');
    
    if (!bracketContainer || !headerContainer) return;
    
    const handleScroll = () => {
      headerContainer.scrollLeft = bracketContainer.scrollLeft;
    };
    
    bracketContainer.addEventListener('scroll', handleScroll);
    return () => {
      bracketContainer.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (isDataLoading) {
     return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
        <span className="ml-2 text-gray-500">Carregando dados do chaveamento...</span>
      </div>
    );
  }

  if (tournament && tournament.matches.length > 0) {
    return (
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold text-brand-blue">
                  {currentStage === 'GROUP' ? 'Fase de Grupos' :
                   currentStage === 'ELIMINATION' ? 'Fase Eliminatória' :
                   'Chaveamento do Torneio'}
              </h3>
              <p className="text-sm text-gray-500">
                {currentStage === 'GROUP' ? 'Resultados e classificação dos grupos.' :
                 currentStage === 'ELIMINATION' ? 'Clique em uma partida para agendar ou atualizar.' :
                 'Gerencie o chaveamento do torneio.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {tournament.status === 'CREATED' && currentStage !== 'NONE' && (
                <Button onClick={handleStartTournament}>
                  <PlayCircle size={18} className="mr-1" /> Iniciar Torneio
                </Button>
              )}
              {currentStage === 'GROUP' && (
                   <Button variant="outline" onClick={handleShowRankings}>
                      <List size={18} className="mr-1" /> Ver Ranking Grupos
                   </Button>
              )}
              {isGroupStageComplete && groupNumbers.length > 0 && (
                <>
                  <Button variant="outline" onClick={handleShowOverallRankings}>
                      <Award size={18} className="mr-1" /> Ver Ranking Geral (Grupos)
                  </Button>
                  <Button variant="outline" onClick={() => handleShowPlacementRankings(1, "Ranking Geral - 1ºs Colocados dos Grupos")}>
                    1ºs Colocados
                  </Button>
                  <Button variant="outline" onClick={() => handleShowPlacementRankings(2, "Ranking Geral - 2ºs Colocados dos Grupos")}>
                    2ºs Colocados
                  </Button>
                  {/* Optionally add for 3rd place if needed */}
                  {/* <Button variant="outline" onClick={() => handleShowPlacementRankings(3, "Ranking Geral - 3ºs Colocados dos Grupos")}>
                    3ºs Colocados
                  </Button> */}
                </>
              )}
              {currentStage === 'GROUP' && isGroupStageComplete && tournament.status === 'STARTED' && (
                   <Button
                      onClick={handleGenerateElimination}
                      disabled={generatingStructure}
                      loading={generatingStructure}
                   >
                      <RefreshCw size={18} className="mr-1" /> Gerar Fase Eliminatória
                   </Button>
              )}
              <Button
                variant="outline"
                onClick={handleResetTournament}
                disabled={generatingStructure}
              >
                <RefreshCw size={18} className="mr-1" /> Reiniciar Torneio
              </Button>
            </div>
          </div>

          {currentStage === 'GROUP' && (
            <div className="space-y-6">
              <h4 className="text-md font-semibold text-brand-blue">Partidas dos Grupos</h4>
              {groupNumbers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {groupNumbers.map(groupNum => (
                    <div key={groupNum} className="bg-white border border-gray-200 rounded-lg p-4">
                      <h5 className="font-medium text-brand-purple mb-3">Grupo {groupNum}</h5>
                      <div className="space-y-3">
                        {matchesByStage.GROUP[groupNum]
                          .sort((a, b) => (a.id > b.id ? 1 : -1))
                          .map(match => {
                            // Obter nomes completos das duplas
                            const teamA = match.team1 && match.team1.length > 0 
                              ? match.team1.map(id => participantMap.get(id) || 'Desconhecido').join(' & ')
                              : 'TBD';
                            const teamB = match.team2 && match.team2.length > 0 
                              ? match.team2.map(id => participantMap.get(id) || 'Desconhecido').join(' & ')
                              : 'TBD';
                            const court = match.courtId ? courts.find(c => c.id === match.courtId)?.name : undefined;
                            const scheduledTime = match.scheduledTime ? formatDateTime(match.scheduledTime).split(' ')[1] : undefined;

                            return (
                              <div key={match.id} className="border-b pb-3 last:border-b-0">                                 <MatchCard
                                    teamA={teamA}
                                    teamB={teamB}
                                    scoreA={match.score1 ?? undefined}
                                    scoreB={match.score2 ?? undefined}
                                    winner={match.winnerId || undefined}
                                    onClick={() => handleMatchClick(match)}
                                    highlighted={selectedMatch?.id === match.id}
                                    court={court}
                                    scheduledTime={scheduledTime}
                                    completed={match.completed}
                                 />
                              </div>
                            );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Nenhum grupo encontrado.</p>
              )}
            </div>
          )}

          {currentStage === 'ELIMINATION' && (
            <>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-xl font-bold text-brand-blue">Fase Eliminatória</h3>
                  <span className="text-sm text-gray-500">
                    {eliminationMatches.filter(m => m.completed).length} de {eliminationMatches.length} partidas concluídas
                  </span>
                </div>
              </div>

              <div className={`overflow-hidden bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg border border-gray-200 shadow-lg ${isFullScreen ? 'flex-grow flex flex-col' : ''}`}>
                {/* Cabeçalho da chave */}
                <div className="bg-white border-b border-gray-200 p-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
                    {/* Container que sincroniza com o scroll do bracket */}
                    <div 
                      id="bracket-headers-container"
                      className="overflow-x-hidden mb-3 md:mb-0 relative" 
                      style={{ width: '100%', maxWidth: 'calc(100% - 150px)' }}
                    >
                      {/* Container de largura fixa para os cabeçalhos */}
                      <div 
                        className="flex"
                        style={{ width: getHeaderContainerWidth() }}
                      >
                        {eliminationRoundsArray.map((round, index) => {
                          // Calculo da largura para cada cabeçalho (deve corresponder a largura do match + gap)
                          const width = matchWidth;
                          const leftPosition = index * (matchWidth + horizontalGap);
                          
                          return (
                            <div 
                              key={index} 
                              className="text-center flex flex-col items-center absolute"
                              style={{ 
                                left: `${leftPosition}px`,
                                width: `${width}px`
                              }}
                            >
                              <div className="font-semibold text-sm text-brand-blue whitespace-nowrap">
                                {getRoundName(index, eliminationRoundsArray.length)}
                              </div>
                              <div className="text-xs text-gray-500 mt-1">
                                {round.matches.filter(m => m.completed).length}/{round.matches.length} jogos
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <button 
                        onClick={() => setZoomLevel(Math.max(30, zoomLevel - 10))}
                        className="p-1 rounded-full hover:bg-gray-100"
                        disabled={zoomLevel <= 30}
                      >
                        <MinusCircle size={18} className={zoomLevel <= 30 ? "text-gray-300" : "text-gray-600"} />
                      </button>
                      <span className="text-sm font-medium w-12 text-center">{zoomLevel}%</span>
                      <button 
                        onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
                        className="p-1 rounded-full hover:bg-gray-100"
                        disabled={zoomLevel >= 150}
                      >
                        <PlusCircle size={18} className={zoomLevel >= 150 ? "text-gray-300" : "text-gray-600"} />
                      </button>
                      <button 
                        onClick={() => setZoomLevel(100)}
                        className="text-xs text-blue-600 hover:underline px-2"
                      >
                        Redefinir
                      </button>
                      <div className="w-px h-6 bg-gray-200 mx-1"></div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            onClick={toggleFullScreen}
                            className="p-2 rounded-full hover:bg-gray-100 text-brand-blue"
                          >
                            {isFullScreen ? 
                              <Minimize2 size={18} /> : 
                              <Maximize2 size={18} />
                            }
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isFullScreen ? 'Sair da tela cheia (ESC)' : 'Modo tela cheia'}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                </div>

                {/* Container with horizontal scrolling */}
                <div 
                  ref={bracketContainerRef} 
                  className={`overflow-x-auto overflow-y-auto p-4 md:p-6 relative ${isFullScreen ? 'flex-grow' : ''}`}
                  style={{ 
                    minHeight: isFullScreen ? 'calc(100vh - 180px)' : '600px',
                    maxHeight: isFullScreen ? 'none' : '80vh',
                    scrollBehavior: 'smooth'
                  }}
                >
                  {/* Tournament bracket with zoom */}
                  <div 
                    className="mx-auto transition-all duration-300 transform-gpu relative"
                    style={{ 
                      transform: `scale(${zoomLevel / 100})`,
                      transformOrigin: 'center top',
                      ...getBracketDimensions()
                    }}
                  >
                    {/* SVG layer for bracket connecting lines */}
                    {bracketLines.length > 0 && (
                      <svg
                        className="absolute top-0 left-0 w-full h-full pointer-events-none z-10"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <defs>
                          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(99, 102, 241, 0.8)" />
                            <stop offset="100%" stopColor="rgba(79, 70, 229, 1)" />
                          </linearGradient>
                          <linearGradient id="winnerGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgba(34, 197, 94, 0.8)" />
                            <stop offset="100%" stopColor="rgba(16, 185, 129, 1)" />
                          </linearGradient>
                          <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                            <feGaussianBlur stdDeviation="2" result="blur" />
                            <feComposite in="SourceGraphic" in2="blur" operator="over" />
                          </filter>
                          <marker id="arrowhead" markerWidth="8" markerHeight="6" 
                                  refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="rgba(203, 213, 225, 0.8)" />
                          </marker>
                          <marker id="winner-arrowhead" markerWidth="8" markerHeight="6" 
                                  refX="8" refY="3" orient="auto">
                            <polygon points="0 0, 8 3, 0 6" fill="rgba(16, 185, 129, 0.8)" />
                          </marker>
                        </defs>
                        
                        {/* Base shadow lines */}
                        {bracketLines.map(line => (
                          <path
                            key={`${line.key}-shadow`}
                            d={line.path}
                            stroke="rgba(0, 0, 0, 0.1)"
                            strokeWidth="4"
                            fill="none"
                            strokeLinecap="butt"
                            strokeLinejoin="miter"
                            className="transition-all duration-300 ease-in-out"
                          />
                        ))}
                        
                        {/* Match connecting lines */}
                        {bracketLines.map(line => {
                          const isActiveLine = selectedMatch && 
                            (line.fromMatch === selectedMatch.id || line.toMatch === selectedMatch.id);
                          
                          return (
                            <path
                              key={line.key}
                              d={line.path}
                              stroke={line.highlight ? "url(#winnerGradient)" : isActiveLine ? "url(#lineGradient)" : "rgba(203, 213, 225, 0.8)"}
                              strokeWidth={isActiveLine || line.highlight ? "3" : "2"}
                              fill="none"
                              strokeLinecap="butt"
                              strokeLinejoin="miter"
                              markerEnd={line.highlight ? "url(#winner-arrowhead)" : "url(#arrowhead)"}
                              filter={isActiveLine || line.highlight ? "url(#glowFilter)" : ""}
                              className="transition-all duration-300 ease-in-out"
                            />
                          );
                        })}
                      </svg>
                    )}
                    
                    {/* Match cards positioned using the position map */}
                    {eliminationMatches.map((match, index) => {
                      // Match data preparation
                      const teamAName = match.team1 && match.team1.length > 0 
                        ? match.team1.map((id: string) => participantMap.get(id) || 'N/A').join(' & ') 
                        : null;
                      const teamBName = match.team2 && match.team2.length > 0 
                        ? match.team2.map((id: string) => participantMap.get(id) || 'N/A').join(' & ') 
                        : null;
                      const isByeMatch = !!(match.completed && (match.team1 === null || match.team2 === null));
                      const court = match.courtId ? courts.find(c => c.id === match.courtId)?.name : undefined;
                      const scheduledTime = match.scheduledTime ? formatDateTime(match.scheduledTime).split(' ')[1] : undefined;
                      
                      // Get match position from the position map for perfect alignment
                      const matchPosition = matchPositionMap.get(match.id);
                      
                      if (!matchPosition) return null; // Skip if position not found
                      
                      // Apply styling based on match status
                      let statusClass = '';
                      let statusBorder = '';
                      
                      if (match.completed) {
                        statusClass = 'bg-green-50';
                        statusBorder = 'border-green-200';
                      } else if (match.team1 && match.team2) {
                        statusClass = 'bg-blue-50'; 
                        statusBorder = 'border-blue-200';
                      } else {
                        statusClass = 'bg-gray-50';
                        statusBorder = 'border-gray-200';
                      }

                      return (
                        <div 
                          key={match.id}
                          ref={el => matchCardRefs.current[match.id] = el}
                          className={`
                            absolute border-2 rounded-lg overflow-hidden shadow-md transition-all duration-300
                            ${selectedMatch?.id === match.id ? 'shadow-xl ring-2 ring-brand-blue ring-opacity-70' : ''}
                            ${statusClass}
                            ${statusBorder}
                            ${isByeMatch ? 'opacity-80' : ''}
                            ${(match.team1 || match.team2) ? 'hover:-translate-y-1 hover:shadow-lg' : 'opacity-80'}
                          `}
                          style={{
                            left: `${matchPosition.x}px`,
                            top: `${matchPosition.y}px`,
                            width: `${matchPosition.width}px`,
                            height: `${matchPosition.height}px`,
                            cursor: (match.team1 || match.team2) ? 'pointer' : 'default'
                          }}
                          onClick={() => (match.team1 || match.team2) && handleMatchClick(match)}
                        >
                          {/* Match Header */}
                          <div className="px-3 py-1.5 text-xs font-medium border-b flex justify-between items-center bg-white bg-opacity-90">
                            <div className="flex items-center">                              {match.completed ? (
                                <div className="flex items-center">
                                  <CheckCircle size={14} className="mr-1 text-green-500" />
                                  {match.editable && (
                                    <Edit3 size={14} className="mr-1 text-orange-500" />
                                  )}
                                </div>
                              ) : (
                                <div className={`h-2 w-2 rounded-full mr-1 ${match.team1 && match.team2 ? 'bg-blue-500' : 'bg-gray-400'}`} />
                              )}
                              <span>Partida {match.round}-{match.position}</span>
                            </div>
                            
                            {match.courtId && (
                              <span className="flex items-center text-brand-green">
                                <MapPin size={12} className="mr-0.5" />
                                {courts.find(c => c.id === match.courtId)?.name}
                              </span>
                            )}
                          </div>
                          
                          {/* Match Content */}
                          <div className="flex flex-col justify-between h-[calc(100%-26px)]">
                            {/* Team A */}
                            <div className={`
                              flex justify-between items-center p-2 border-b
                              ${match.winnerId === 'team1' ? 'bg-gradient-to-r from-green-100 to-green-50 border-green-200' : ''}
                              ${!match.team1 ? 'opacity-60' : ''}
                            `}>
                              <div className="flex items-center space-x-2 w-full">
                                <div className={`h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold
                                            ${match.winnerId === 'team1' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  1
                                </div>
                                <div className="font-medium text-sm truncate max-w-[180px]" title={teamAName || 'A definir'}>
                                  {teamAName || 'A definir'}
                                </div>
                              </div>
                              <div className={`font-bold ml-2 min-w-[24px] h-6 flex items-center justify-center rounded-md flex-shrink-0
                                            ${match.completed ? (match.winnerId === 'team1' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700') : 'bg-gray-50 text-gray-700'}`}>
                              {match.completed ? match.score1 : '-'}
                              </div>
                            </div>
                            
                            {/* Team B */}
                            <div className={`
                              flex justify-between items-center p-2
                              ${match.winnerId === 'team2' ? 'bg-gradient-to-r from-green-100 to-green-50 border-green-200' : ''}
                              ${!match.team2 ? 'opacity-60' : ''}
                            `}>
                              <div className="flex items-center space-x-2 w-full">
                                <div className={`h-6 w-6 flex-shrink-0 rounded-full flex items-center justify-center text-xs font-bold
                                            ${match.winnerId === 'team2' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                  2
                                </div>
                                <div className="font-medium text-sm truncate max-w-[180px]" title={teamBName || 'A definir'}>
                                  {teamBName || 'A definir'}
                                </div>
                              </div>
                              <div className={`font-bold ml-2 min-w-[24px] h-6 flex items-center justify-center rounded-md flex-shrink-0
                                            ${match.completed ? (match.winnerId === 'team2' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700') : 'bg-gray-50 text-gray-700'}`}>
                              {match.completed ? match.score2 : '-'}
                              </div>
                            </div>
                            
                            {/* Match Status Footer */}
                            {(scheduledTime || isByeMatch || match.completed) && (
                              <div className="px-3 py-1 border-t text-xs flex items-center justify-between bg-white bg-opacity-75">
                                {scheduledTime && (
                                  <div className="flex items-center text-gray-600">
                                    <Calendar size={12} className="mr-1" />
                                    <span>{scheduledTime}</span>
                                  </div>
                                )}
                                
                                {isByeMatch && (
                                  <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-600 font-medium ml-auto">
                                    BYE
                                  </span>
                                )}
                                
                                {match.completed && !isByeMatch && (
                                  <span className="px-2 py-0.5 rounded bg-green-50 text-green-600 font-medium ml-auto">
                                    Concluído
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Legend */}                    <div className="absolute bottom-4 left-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center space-x-4">
                      <div className="text-sm font-medium text-gray-700">Legenda:</div>
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-green-100 border border-green-200 rounded-sm mr-1 shadow-sm"></div>
                        <span className="text-xs text-gray-600">Concluída</span>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center">
                          <CheckCircle size={12} className="mr-1 text-green-500" />
                          <Edit3 size={12} className="text-orange-500" />
                        </div>
                        <span className="text-xs text-gray-600 ml-1">Resultado editado</span>
                      </div>
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-blue-100 border border-blue-200 rounded-sm mr-1 shadow-sm"></div>
                        <span className="text-xs text-gray-600">Agendada</span>
                      </div>
                      <div className="flex items-center">
                        <div className="h-3 w-3 bg-gray-100 border border-gray-200 rounded-sm mr-1 shadow-sm"></div>
                        <span className="text-xs text-gray-600">Pendente</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {currentStage === 'NONE' && (
              <div className="text-center py-10 text-gray-500">
                  A estrutura do torneio ainda não foi gerada.
              </div>
          )}

          {selectedMatch && (
            <Modal isOpen={showMatchEditor} onClose={() => setShowMatchEditor(false)} title="Editar Resultado">
              <MatchEditor match={selectedMatch} onSave={handleSaveMatchResults} onClose={() => setShowMatchEditor(false)} participantMap={participantMap} />
            </Modal>
          )}
          {selectedMatch && (
            <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Agendar Partida">
              <ScheduleMatch match={selectedMatch} courts={courts} onSave={handleScheduleMatch} onClose={() => setShowScheduleModal(false)} />
            </Modal>
          )}
          <Modal
            isOpen={showGroupRankingsModal}
            onClose={() => setShowGroupRankingsModal(false)}
            title="Ranking da Fase de Grupos"
            size="large"
          >
            <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-100 text-sm">
              <h5 className="font-medium mb-2 text-blue-700">Legenda:</h5>
              <ul className="space-y-1 text-blue-800">
                <li><span className="font-medium">V</span> - Vitórias: Total de partidas vencidas pela dupla</li>
                <li><span className="font-medium">SG</span> - Saldo de Games: Diferença entre games ganhos e perdidos</li>
                <li><span className="font-medium">PG</span> - Games Ganhos: Total de games conquistados pela dupla</li>
              </ul>
            </div>
            
            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
              {Object.entries(calculatedRankings).length > 0 ? (
                Object.entries(calculatedRankings)
                  .sort(([numA], [numB]) => parseInt(numA) - parseInt(numB))
                  .map(([groupNum, rankings]) => (
                    <div key={groupNum} className="border border-gray-200 rounded-lg p-4">
                      <h4 className="font-semibold text-brand-purple mb-3">Grupo {groupNum}</h4>
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">#</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Dupla</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">V</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">SG</th>
                            <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">PG</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {rankings.map((entry, index) => {
                            const teamName = entry.teamId.map((id: string) => participantMap.get(id) || 'N/A').join(' & ');
                            const isQualifier = entry.rank <= 2;
                            return (
                              <tr key={entry.teamId.join('-')} className={`hover:bg-gray-50 ${isQualifier ? 'bg-green-50' : ''}`}>
                                <td className={`px-3 py-2 whitespace-nowrap font-medium ${isQualifier ? 'text-green-700' : ''}`}>
                                  {entry.rank}
                                  {isQualifier && <Award size={12} className="inline ml-1 text-yellow-500" />}
                                </td>
                                <td className="px-3 py-2 whitespace-nowrap">{teamName}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.wins}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gameDifference > 0 ? `+${entry.stats.gameDifference}` : entry.stats.gameDifference}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gamesWon}</td>
                                <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.matchesPlayed}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))
                ) : (
                <p className="text-gray-500 text-center">Nenhum ranking disponível para esta colocação.</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setShowGroupRankingsModal(false)}>Fechar</Button>
            </div>
          </Modal>
          <Modal
            isOpen={showPlacementRankingModal}
            onClose={() => setShowPlacementRankingModal(false)}
            title={placementRankingModalTitle}
            size="large"
          >
            <div className="bg-blue-50 p-3 mb-4 rounded-lg border border-blue-100 text-sm">
              <h5 className="font-medium mb-2 text-blue-700">Legenda:</h5>
              <ul className="space-y-1 text-blue-800">
                <li><span className="font-medium">V</span> - Vitórias: Total de partidas vencidas pela dupla</li>
                <li><span className="font-medium">SG</span> - Saldo de Games: Diferença entre games ganhos e perdidos</li>
                <li><span className="font-medium">PG</span> - Games Ganhos: Total de games conquistados pela dupla</li>
                <li><span className="font-medium">JP</span> - Jogos Disputados: Total de partidas em que a dupla participou</li>
              </ul>
            </div>

            <div className="space-y-6 max-h-[70vh] overflow-y-auto p-1">
              {placementRankingModalData.length > 0 ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">#</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Dupla</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">V</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">SG</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">PG</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">JP</th>
                      </tr>
                    </thead>
                    <tbody>
                      {placementRankingModalData.map((entry) => {
                        const teamName = entry.teamId.map((id: string) => participantMap.get(id) || 'N/A').join(' & ');
                        return (
                          <tr key={entry.teamId.join('-')} className={`hover:bg-gray-50`}>
                            <td className={`px-3 py-2 whitespace-nowrap font-medium`}>
                              {entry.rank}
                            </td>
                            <td className="px-3 py-2 whitespace-nowrap">{teamName}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.wins}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gameDifference > 0 ? `+${entry.stats.gameDifference}` : entry.stats.gameDifference}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.gamesWon}</td>
                            <td className="px-3 py-2 whitespace-nowrap text-center">{entry.stats.matchesPlayed}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center">Nenhum ranking disponível para esta colocação.</p>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setShowPlacementRankingModal(false)}>Fechar</Button>
            </div>
          </Modal>
          <Modal
            isOpen={showResetConfirmModal}
            onClose={() => setShowResetConfirmModal(false)}
            title="Reiniciar Torneio"
          >
            <div className="p-1">
              <div className="flex items-center mb-4 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                <AlertCircle size={24} className="mr-3 flex-shrink-0" />
                <div>
                  <h4 className="font-medium">Atenção: Esta ação não pode ser desfeita</h4>
                  <p className="text-sm">
                    Reiniciar o torneio apagará todos os dados de partidas, grupos e chaveamento.
                    {currentEvent?.team_formation === TeamFormationType.RANDOM 
                      ? ' O torneio voltará para a etapa de formação de duplas.' 
                      : ' O torneio voltará para a etapa de geração de grupos.'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowResetConfirmModal(false)}
                  disabled={resetInProgress}
                >
                  Cancelar
                </Button>
                <Button
                  variant="danger"
                  onClick={confirmResetTournament}
                  loading={resetInProgress}
                >
                  Sim, Reiniciar Torneio
                </Button>
                           </div>
            </div>
          </Modal>
        </div>
      </TooltipProvider>
    );
  } else if (tournament && tournament.matches.length === 0) {
       // Torneio existe mas foi reinicializado (sem partidas)
    if (!currentEvent) {
      return <div className="text-center text-gray-500 py-8">Carregando detalhes do evento...</div>;
    }
    
    if (currentEvent.team_formation === TeamFormationType.RANDOM) {
      if (eventParticipants.length < 4) {
        return (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow">
            <p className="text-yellow-700">
              É necessário pelo menos 4 participantes confirmados para iniciar o sorteio de duplas.
            </p>
          </div>
        );
      }
      if (courts.length === 0) {
        return (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow">
            <p className="text-yellow-700">
              Nenhuma quadra disponível para o sorteio. Verifique as configurações do evento.
            </p>
          </div>
        );
      }
      
      return (
        <div className="bg-white p-6 md:p-8 rounded-lg shadow border border-brand-gray">
          <h3 className="text-lg font-medium text-brand-blue mb-4">
            Gerar Grupos e Chaveamento Aleatório
          </h3>
          <p className="text-gray-600 mb-6">
            Use a roleta para sortear as duplas, formar os grupos e atribuir as quadras iniciais.
                   </p>
          <TournamentRandomizer
            eventId={eventId}
            participants={eventParticipants}
            courts={courts}
            onComplete={(
              teams: Array<[string, string]>,
              courtAssignments: Record<string, string[]>
            ) => {
              console.log("Randomization complete, calling generateRandomStructure action.");
              generateRandomStructure(eventId, teams, { forceReset: true })
                .then(() => addNotification({ type: 'success', message: 'Grupos e partidas aleatórias gerados e salvos!' }))
                .catch((err: any) => addNotification({ type: 'error', message: `Erro ao salvar estrutura: ${err.message}` }));
            }}
          />
        </div>
      );
    } else {
      return (
        <div className="bg-white p-8 text-center rounded-lg shadow border border-brand-gray">
          <PlayCircle className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-2 text-sm font-semibold text-gray-900">Estrutura não gerada</h3>
          <p className="mt-1 text-sm text-gray-500">
            Gere os grupos e a fase inicial do torneio quando todos os participantes estiverem inscritos.
          </p>
          <div className="mt-6 flex flex-col md:flex-row justify-center gap-3">
            <Button
              onClick={handleGenerateFormedStructure}
              disabled={eventParticipants.length < 2 || generatingStructure}
              loading={generatingStructure}
            >
              <RefreshCw size={18} className="mr-1" />
              Gerar Grupos e Partidas
            </Button>
          </div>
          {eventParticipants.length < 2 && (
            <p className="mt-4 text-sm text-brand-orange">
              Mínimo de 2 participantes/duplas para gerar estrutura.
            </p>
          )}
        </div>
      );
    }
  } else {
    if (!currentEvent) {
       return <div className="text-center text-gray-500 py-8">Carregando detalhes do evento...</div>;
    }

    if (currentEvent.type === EventType.TOURNAMENT) {
        if (currentEvent.team_formation === TeamFormationType.RANDOM) {
            if (eventParticipants.length < 4) {
                return (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow">
                    <p className="text-yellow-700">
                    É necessário pelo menos  4 participantes confirmados para iniciar o sorteio de duplas.
                    </p>
                </div>
                );
            }
            if (courts.length === 0) {
                return (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow">
                    <p className="text-yellow-700">
                    Nenhuma quadra disponível para o sorteio. Verifique as configurações do evento.
                    </p>
                </div>
                );
            }
            return (
                <div className="bg-white p-6 md:p-8 rounded-lg shadow border border-brand-gray">
                <h3 className="text-lg font-medium text-brand-blue mb-4">
                    Gerar Grupos e Chaveamento Aleatório
                </h3>
                <p className="text-gray-600 mb-6">
                    Use a roleta para sortear as duplas, formar os grupos e atribuir as quadras iniciais.
                </p>
                <TournamentRandomizer
                    eventId={eventId}
                    participants={eventParticipants}
                    courts={courts}
                    onComplete={(
                        teams: Array<[string, string]>,
                        courtAssignments: Record<string, string[]>
                    ) => {
                        console.log("Randomization complete, calling generateRandomStructure action.");
                        generateRandomStructure(eventId, teams, { forceReset: true })
                          .then(() => addNotification({ type: 'success', message: 'Grupos e partidas aleatórias gerados e salvos!' }))
                          .catch((err: any) => addNotification({ type: 'error', message: `Erro ao salvar estrutura: ${err.message}` }));
                    }}
                />
                </div>
            );
        } else {
            return (
                <div className="bg-white p-8 text-center rounded-lg shadow border border-brand-gray">
                <PlayCircle className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Estrutura não gerada</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Gere os grupos e a fase inicial do torneio quando todos os participantes estiverem inscritos.
                </p>
                <div className="mt-6 flex flex-col md:flex-row justify-center gap-3">
                    <Button
                        onClick={handleGenerateFormedStructure}
                        disabled={eventParticipants.length < 2 || generatingStructure}
                        loading={generatingStructure}
                    >
                        <RefreshCw size={18} className="mr-1" />
                        Gerar Grupos e Partidas
                    </Button>
                </div>
                 {eventParticipants.length < 2 && (
                    <p className="mt-4 text-sm text-brand-orange">
                    Mínimo de 2 participantes/duplas para gerar estrutura.
                    </p>
                )}
                </div>
            );
        }
    } else {
         return <div className="text-center text-gray-500 py-8">Gerenciamento para tipo de evento '{currentEvent.type}' não implementado aqui.</div>;
  }
}
  }
