import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import {
  PlayCircle,
  RefreshCw,
  Loader2,
  Award,
  Edit,
  AlertCircle,
  MapPin,
  Calendar,
  XCircle,
  List,
  HelpCircle,
  MinusCircle,
  PlusCircle
} from 'lucide-react';
import { useTournamentStore, useParticipantsStore, useCourtsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Match, Participant, Court, TeamFormationType, EventType, Tournament } from '../../types';
import { Modal } from '../ui/Modal';
import { formatDateTime } from '../../utils/formatters';
import { TournamentRandomizer } from './TournamentRandomizer';
import { calculateGroupRankings, GroupRanking } from '../../utils/rankingUtils';
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
        <span className="font-medium truncate max-w-[150px]">{teamA || 'TBD'}</span>
        <span className="font-bold">{isCompleted ? scoreA : '-'}</span>
      </div>
      <div className={`flex justify-between items-center py-1 px-2 mt-1 ${winner === 'team2' ? 'bg-brand-green/20' : ''}`}>
        <span className="font-medium truncate max-w-[150px]">{teamB || 'TBD'}</span>
        <span className="font-bold">{isCompleted ? scoreB : '-'}</span>
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
  
  const team1Name = match.team1 && match.team1.length > 0 
    ? participantMap.get(match.team1[0]) || 'Time 1' 
    : 'Time 1';
    
  const team2Name = match.team2 && match.team2.length > 0 
    ? participantMap.get(match.team2[0]) || 'Time 2' 
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
          <span className="font-medium">{team1Name}</span>
          <input
            type="number"
            min={0}
            value={score1}
            onChange={(e) => setScore1(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded-lg text-center"
          />
        </div>
        
        <div className="flex justify-between items-center border-b pb-2">
          <span className="font-medium">{team2Name}</span>
          <input
            type="number"
            min={0}
            value={score2}
            onChange={(e) => setScore2(parseInt(e.target.value) || 0)}
            className="w-16 px-2 py-1 border rounded-lg text-center"
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

  const handleGenerateElimination = async () => {
      if (!tournament) return;
      try {
          setGeneratingStructure(true);
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
    if (match.team1 && match.team2 && !match.completed) {
      selectMatch(match);
      setShowMatchEditor(true);
    } else if (!match.completed) {
       selectMatch(match);
       setShowScheduleModal(true);
    } else {
      addNotification({ type: 'info', message: 'Esta partida já foi concluída.' });
    }
  };

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
    let allMatchesCompleted = true;
    for (const groupNum in matchesByStage.GROUP) {
      const groupMatches = matchesByStage.GROUP[groupNum];
      const completedMatches = groupMatches.filter(match => match.completed);
      if (completedMatches.length !== groupMatches.length) {
        allMatchesCompleted = false;
      }
      rankings[groupNum] = calculateGroupRankings(completedMatches);
    }

    setCalculatedRankings(rankings);
    setShowGroupRankingsModal(true);
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
      if (currentStage !== 'GROUP') return false;
      return groupNumbers.every(num =>
          matchesByStage.GROUP[num].every(match => match.completed)
      );
  }, [currentStage, groupNumbers, matchesByStage.GROUP]);

  const { eliminationRoundsArray, bracketLines } = useMemo(() => {
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

    const lines: Array<{ key: string; d: string }> = [];
    if (roundsArray.length > 1) {
      const roundWidth = 256;
      const gapWidth = 32;
      const cardHeightEstimate = 80;
      const verticalGap = 24;
      const matchSlotHeight = cardHeightEstimate + verticalGap;

      roundsArray.forEach((roundData, roundIndex) => {
        if (roundIndex < roundsArray.length - 1) {
          roundData.matches.forEach((match, matchIndex) => {
            if (!match) return;

            const startX = roundIndex * (roundWidth + gapWidth) + roundWidth;
            const startY = matchIndex * matchSlotHeight + (matchSlotHeight / 2) - (verticalGap / 2);
            const midX = startX + gapWidth / 2;
            const endX = (roundIndex + 1) * (roundWidth + gapWidth);

            const nextMatchIndex = Math.floor(matchIndex / 2);
            const nextMatchY = nextMatchIndex * (matchSlotHeight * 2) + (matchSlotHeight) - (verticalGap / 2);

            const d = `M ${startX} ${startY} H ${midX} V ${nextMatchY} H ${endX}`;
            lines.push({ key: `${match.id}-line`, d });
          });
        }
      });
    }

    return { eliminationRoundsArray: roundsArray, bracketLines: lines };
  }, [eliminationMatches]);

  const getRoundName = (roundIndex: number, totalRounds: number) => {
    if (roundIndex === totalRounds - 1) return 'Final';
    if (roundIndex === totalRounds - 2) return 'Semi-Final';
    return `Rodada ${roundIndex + 1}`;
  };

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
                            const teamA = match.team1 && match.team1.length > 0 ? participantMap.get(match.team1[0]) : 'TBD';
                            const teamB = match.team2 && match.team2.length > 0 ? participantMap.get(match.team2[0]) : 'TBD';
                            const court = match.courtId ? courts.find(c => c.id === match.courtId)?.name : undefined;
                            const scheduledTime = match.scheduledTime ? formatDateTime(match.scheduledTime).split(' ')[1] : undefined;

                            return (
                              <div key={match.id} className="border-b pb-3 last:border-b-0">
                                 <MatchCard
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
              <div className="flex items-center justify-end mb-2 space-x-2">
                <span className="text-sm text-gray-500">Zoom:</span>
                <button 
                  onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                  className="p-1 rounded-full hover:bg-gray-100"
                  disabled={zoomLevel <= 50}
                >
                  <MinusCircle size={18} className={zoomLevel <= 50 ? "text-gray-300" : "text-gray-600"} />
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
              </div>
              <div 
                ref={bracketContainerRef} 
                className="overflow-x-auto bg-gradient-to-r from-blue-50 to-gray-50 p-6 rounded-lg relative border border-gray-200 shadow-inner"
              >
                <div style={{ 
                  transform: `scale(${zoomLevel / 100})`, 
                  transformOrigin: 'top left',
                  width: zoomLevel > 100 ? `${100 * 100 / zoomLevel}%` : '100%'
                }}>
                  {/* Cabeçalho da fase eliminatória */}
                  <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-brand-blue">Fase Eliminatória</h3>
                    <p className="text-sm text-gray-500">Clique nas partidas para registrar resultados</p>
                  </div>
                  
                  {/* Linhas conectoras das chaves com animação sutil */}
                  {bracketLines.length > 0 && (
                    <svg
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      style={{ minWidth: `${eliminationRoundsArray.length * (256 + 32)}px` }}
                    >
                      {bracketLines.map(line => (
                        <path
                          key={line.key}
                          d={line.d}
                          stroke="rgb(203, 213, 225)"
                          strokeWidth="2"
                          fill="none"
                          className="transition-all duration-300"
                        />
                      ))}
                    </svg>
                  )}
                  
                  {/* Grid de rounds com espaçamento aprimorado */}
                  <div className="relative z-10 flex flex-nowrap items-start gap-8">
                    {eliminationRoundsArray.map((round, roundIndex) => (
                      <div 
                        key={`round-${roundIndex}`} 
                        className="flex-shrink-0 w-64"
                      >
                        <div className="text-center font-semibold text-brand-purple mb-4 rounded-full bg-brand-purple/10 py-1">
                          {getRoundName(roundIndex, eliminationRoundsArray.length)}
                        </div>
                        
                        <div className="flex flex-col gap-y-8">
                          {round.matches.filter(match => match !== null).map((match) => {
                            const teamAName = match.team1?.map(id => participantMap.get(id) || 'N/A').join(' & ') || null;
                            const teamBName = match.team2?.map(id => participantMap.get(id) || 'N/A').join(' & ') || null;
                            const isByeMatch = !!(match.completed && (match.team1 === null || match.team2 === null));
                            const court = match.courtId ? courts.find(c => c.id === match.courtId)?.name : undefined;
                            const scheduledTime = match.scheduledTime ? formatDateTime(match.scheduledTime).split(' ')[1] : undefined;

                            return (
                              <div 
                                key={match.id}
                                ref={el => matchCardRefs.current[match.id] = el}
                                className={`
                                  border rounded-lg overflow-hidden shadow-sm transition-all
                                  ${match.completed ? 'bg-white border-green-200' : 'bg-white border-gray-200 hover:border-brand-blue hover:shadow-md'}
                                  ${isByeMatch ? 'opacity-75' : ''}
                                  ${(match.team1 && match.team2) ? 'cursor-pointer' : 'opacity-75'}
                                `}
                                onClick={() => (match.team1 || match.team2) && handleMatchClick(match)}
                              >
                                <div className="px-3 py-2 text-xs text-gray-500 bg-gray-50 border-b border-gray-100 flex justify-between">
                                  <span>Partida #{match.position}</span>
                                  {match.courtId && courts.find(c => c.id === match.courtId) && (
                                    <span className="font-medium text-brand-green">
                                      {courts.find(c => c.id === match.courtId)?.name}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="p-3">
                                  {/* Time 1 - com estilização melhorada */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={`
                                        flex justify-between items-center mb-2 p-2 rounded-md
                                        ${match.completed && match.winnerId === 'team1' ? 'bg-green-50 border border-green-100' : ''}
                                      `}>
                                        <div className="font-medium truncate max-w-[150px]">
                                          {teamAName || 'TBD'}
                                        </div>
                                        <div className="font-bold ml-2 text-gray-700">
                                          {match.completed ? match.score1 : '-'}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-0 overflow-hidden">
                                      {match.team1 ? (
                                        <div className="w-64">
                                          <div className="bg-gray-50 p-2 font-medium border-b">Detalhes da Dupla</div>
                                          <div className="p-3 space-y-2">
                                            {getTeamDetails(match.team1, eventParticipants)?.players.map((player, idx) => (
                                              <div key={idx} className="flex items-center">
                                                <span>{player.name}</span>
                                                {player.ranking > 0 && (
                                                  <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                    Ranking: {player.ranking}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                            {match.completed && match.winnerId === 'team1' && (
                                              <div className="mt-2 text-green-600 flex items-center">
                                                <Award size={14} className="mr-1" /> Vencedor
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-3">
                                          <span className="text-gray-500">Aguardando definição...</span>
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                  
                                  {/* Time 2 - com estilização melhorada */}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={`
                                        flex justify-between items-center p-2 rounded-md
                                        ${match.completed && match.winnerId === 'team2' ? 'bg-green-50 border border-green-100' : ''}
                                      `}>
                                        <div className="font-medium truncate max-w-[150px]">
                                          {teamBName || 'TBD'}
                                        </div>
                                        <div className="font-bold ml-2 text-gray-700">
                                          {match.completed ? match.score2 : '-'}
                                        </div>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="p-0 overflow-hidden">
                                      {match.team2 ? (
                                        <div className="w-64">
                                          <div className="bg-gray-50 p-2 font-medium border-b">Detalhes da Dupla</div>
                                          <div className="p-3 space-y-2">
                                            {getTeamDetails(match.team2, eventParticipants)?.players.map((player, idx) => (
                                              <div key={idx} className="flex items-center">
                                                <span>{player.name}</span>
                                                {player.ranking > 0 && (
                                                  <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                                                    Ranking: {player.ranking}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                            {match.completed && match.winnerId === 'team2' && (
                                              <div className="mt-2 text-green-600 flex items-center">
                                                <Award size={14} className="mr-1" /> Vencedor
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="p-3">
                                          <span className="text-gray-500">Aguardando definição...</span>
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                                
                                {/* Metadados da partida - com ícones e layout melhorado */}
                                {(scheduledTime || court) && (
                                  <div className="px-3 py-2 border-t border-gray-100 bg-gray-50 text-xs text-gray-500 flex items-center justify-between">
                                    {scheduledTime && (
                                      <div className="flex items-center">
                                        <Calendar size={12} className="mr-1" />
                                        <span>{scheduledTime}</span>
                                      </div>
                                    )}
                                    <div className="flex-grow"></div>
                                    {isByeMatch && <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-500">BYE</span>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
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
            <TooltipProvider>
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
                              <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center justify-center w-full">V <HelpCircle size={12} className="ml-1 opacity-50" /></TooltipTrigger>
                                  <TooltipContent>Vitórias</TooltipContent>
                                </Tooltip>
                              </th>
                              <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center justify-center w-full">SG <HelpCircle size={12} className="ml-1 opacity-50" /></TooltipTrigger>
                                  <TooltipContent>Saldo de Games (Games Ganhos - Games Perdidos)</TooltipContent>
                                </Tooltip>
                              </th>
                              <th className="px-3 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">
                                <Tooltip>
                                  <TooltipTrigger className="flex items-center justify-center w-full">PG <HelpCircle size={12} className="ml-1 opacity-50" /></TooltipTrigger>
                                  <TooltipContent>Total de Games Ganhos</TooltipContent>
                                </Tooltip>
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {rankings.map((entry, index) => {
                              const teamName = entry.teamId.map(id => participantMap.get(id) || 'N/A').join(' & ');
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
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ))
                ) : (
                  <p className="text-gray-500 text-center">Nenhum ranking calculado.</p>
                )}
              </div>
            </TooltipProvider>
            <div className="mt-6 flex justify-end">
              <Button variant="outline" onClick={() => setShowGroupRankingsModal(false)}>Fechar</Button>
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
         return <div className="text-center text-gray-500 py-8">Gerenciamento para tipo de evento '{currentEvent.type}' não implementado aqui.</div>;
    }
  }
};
