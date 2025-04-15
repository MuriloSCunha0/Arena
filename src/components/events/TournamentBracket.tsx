import React, { useEffect, useState, useMemo } from 'react';
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
  List
} from 'lucide-react';
import { useTournamentStore, useParticipantsStore, useCourtsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Match, Participant, Court, TeamFormationType, EventType } from '../../types'; // Import Event type and enums
import { Modal } from '../ui/Modal';
import { formatDateTime } from '../../utils/formatters';
import { TournamentRandomizer } from './TournamentRandomizer';

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
  court?: string; // Nome da quadra
  scheduledTime?: string; // Horário agendado
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
  scheduledTime
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
      
      {/* Informações da quadra e horário */}
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
  
  // Obter nomes reais dos times
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

// Adicionar novo componente para agendar partida
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
      // Padrão para hoje
      const now = new Date();
      setScheduledDate(now.toISOString().split('T')[0]);
      setScheduledTime('10:00'); // Hora padrão
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

// Update the type for the fetched event data
interface FetchedEventData {
  id: string;
  title: string;
  team_formation: TeamFormationType; // Use the enum
  max_participants: number;
  type: EventType; // Add type
  // Other fields from DB if needed
}


export const TournamentBracket: React.FC<TournamentBracketProps> = ({ eventId }) => {
  const {
    tournament,
    selectedMatch,
    loading: loadingTournament, // Rename for clarity
    error: tournamentError, // Rename for clarity
    fetchTournament,
    createTournament,
    updateMatchResults,
    startTournament,
    selectMatch,
    updateMatchSchedule,
    generateBracket, // Action called by TournamentRandomizer
  } = useTournamentStore();

  const { eventParticipants, loading: loadingParticipants, fetchParticipantsByEvent } = useParticipantsStore();
  const { courts, loading: loadingCourts, fetchCourts } = useCourtsStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [showMatchEditor, setShowMatchEditor] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false); // For 'FORMED' type
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [skipTeamIds, setSkipTeamIds] = useState<string[]>([]);
  const [showSkipTeamModal, setShowSkipTeamModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<FetchedEventData | null>(null); // Use updated type
  const [loadingEventDetails, setLoadingEventDetails] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'by-court'>('all');
  const [selectedCourtId, setSelectedCourtId] = useState<string | null>(null);

  const participantMap = useMemo(() => { // Memoize participant map
      const map = new Map<string, string>();
      eventParticipants.forEach((participant: Participant) => {
          map.set(participant.id, participant.name);
      });
      return map;
  }, [eventParticipants]);

  // Fetch necessary data
  useEffect(() => {
    if (eventId) {
      // Fetch event details first
      setLoadingEventDetails(true);
      supabase
        .from('events')
        .select('id, title, team_formation, max_participants, type') // Fetch needed fields including type
        .eq('id', eventId)
        .single()
        .then(({ data, error }) => {
          if (error) {
            console.error("Error fetching event details:", error);
            addNotification({ type: 'error', message: 'Erro ao buscar detalhes do evento.' });
          } else if (data) {
            // Store as FetchedEventData
            setCurrentEvent(data as FetchedEventData);
          } else {
             addNotification({ type: 'error', message: 'Evento não encontrado.' });
          }
          setLoadingEventDetails(false);
        });

      // Fetch other data concurrently
      fetchTournament(eventId).catch((err) => {
        console.log("Tournament might not exist yet:", err.message);
        // Avoid showing error if it's just not found initially
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


  // Show errors from tournament store
  useEffect(() => {
    if (tournamentError) {
      addNotification({ type: 'error', message: tournamentError });
      // Consider clearing the error in the store after displaying
    }
  }, [tournamentError, addNotification]);

  // Handler for generating bracket for FORMED teams
  const handleGenerateFormedBracket = async () => {
    if (!eventId || eventParticipants.length < 2) {
      addNotification({ type: 'warning', message: 'É necessário pelo menos 2 participantes para gerar o chaveamento' });
      return;
    }

    // Always use forceReset if tournament exists (confirmation dialog has already been shown)
    const forceReset = !!tournament;

    try {
      setGeneratingBracket(true);
      const participantIds = eventParticipants.map(p => p.id);
      
      // Pass forceReset option to createTournament
      await createTournament(eventId, participantIds, skipTeamIds, courts, { forceReset });
      
      addNotification({ type: 'success', message: 'Chaveamento gerado com sucesso!' });
      setSkipTeamIds([]); // Reset byes
    } catch (err) {
      console.error('Error generating formed bracket:', err);
      addNotification({ type: 'error', message: err instanceof Error ? err.message : 'Erro ao gerar chaveamento' });
    } finally {
      setGeneratingBracket(false);
    }
  };

  // ... (handleStartTournament, handleMatchClick, handleSaveMatchResults, handleScheduleMatch, toggleSkipTeam, filterMatchesByCourt, handleAutoAssignCourts remain the same) ...
   const handleStartTournament = async () => {
    if (!tournament) return;
    try {
      await startTournament(tournament.id);
      addNotification({ type: 'success', message: 'Torneio iniciado com sucesso!' });
    } catch (err) {
      addNotification({ type: 'error', message: 'Erro ao iniciar torneio' });
    }
  };

  const handleMatchClick = (match: Match) => {
    // Allow scheduling even if teams are not defined yet
    if (match.team1 && match.team2 && !match.completed) {
      selectMatch(match);
      setShowMatchEditor(true); // Show score editor
    } else if (!match.completed) {
       selectMatch(match);
       setShowScheduleModal(true); // Show schedule editor if not completed
    } else {
      addNotification({ type: 'info', message: 'Esta partida já foi concluída.' });
    }
  };

  const handleSaveMatchResults = async (matchId: string, score1: number, score2: number) => {
    try {
      await updateMatchResults(matchId, score1, score2);
      addNotification({ type: 'success', message: 'Resultado atualizado!' });
      // fetchTournament(eventId); // Store should update automatically
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar resultado.';
      addNotification({ type: 'error', message: errorMessage });
      throw err; // Re-throw to keep modal open on error
    }
  };

   const handleScheduleMatch = async (matchId: string, courtId: string, scheduledTime: string) => {
    try {
      await updateMatchSchedule(matchId, courtId, scheduledTime);
      addNotification({ type: 'success', message: 'Partida agendada!' });
      // fetchTournament(eventId); // Store should update automatically
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao agendar partida.';
      addNotification({ type: 'error', message: errorMessage });
      throw err; // Re-throw to keep modal open on error
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

  // Função para filtrar partidas por quadra
  const filterMatchesByCourt = (matches: Match[]) => {
    if (!selectedCourtId || viewMode === 'all') return matches;
    return matches.filter(match => match.courtId === selectedCourtId);
  };

  // Função para alocação automática de quadras
  const handleAutoAssignCourts = async () => {
    if (!tournament || !courts.length) return;

    try {
      // Primeiro round apenas
      const firstRoundMatches = tournament.matches.filter(m => m.round === 1 && m.team1 && m.team2);

      // Distribuir as partidas entre as quadras disponíveis
      const updates = firstRoundMatches.map((match, index) => {
        const courtIndex = index % courts.length;
        return {
          matchId: match.id,
          courtId: courts[courtIndex].id,
          // Horário padrão (poderia ser calculado mais inteligentemente)
          scheduledTime: new Date().toISOString()
        };
      });

      // Atualizar cada partida
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


  // Combined loading state
  const isDataLoading = loadingTournament || loadingParticipants || loadingCourts || loadingEventDetails;

  if (isDataLoading) {
    // ... (loading indicator remains the same) ...
     return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
        <span className="ml-2 text-gray-500">Carregando dados do chaveamento...</span>
      </div>
    );
  }

  // --- RENDER LOGIC ---

  // If tournament structure exists, render the bracket
  if (tournament) {
    // ... (Bracket rendering logic remains largely the same, using participantMap) ...
     // Group matches by round - VERSÃO CORRIGIDA
    const rounds = tournament.matches.reduce((acc, match) => {
      // Ignorar partidas nulas ou com erro de dados
      if (!match || match.round === undefined || match.round === null) return acc;

      if (!acc[match.round]) acc[match.round] = [];
      acc[match.round].push(match);
      return acc;
    }, {} as Record<number, Match[]>);

    const roundsArray = Object.entries(rounds)
      .map(([round, matches]) => ({
        round: parseInt(round),
        matches: matches.sort((a, b) => (a.position ?? 0) - (b.position ?? 0)), // Adicionando fallback para posições nulas
      }))
      .sort((a, b) => a.round - b.round);

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h3 className="text-lg font-semibold text-brand-blue">Chaveamento do Torneio</h3>
            <p className="text-sm text-gray-500">
              Clique em uma partida para agendar ou atualizar os resultados.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {/* Status indicators and control buttons */}
            {tournament.status === 'CREATED' && (
              <Button onClick={handleStartTournament}>
                <PlayCircle size={18} className="mr-1" /> Iniciar Torneio
              </Button>
            )}

            {tournament.status === 'STARTED' && courts.length > 0 && (
              <Button
                onClick={handleAutoAssignCourts}
                variant="outline"
              >
                <MapPin size={18} className="mr-1" /> Alocar Quadras
              </Button>
            )}

            {tournament.status === 'STARTED' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-green/20 text-brand-green text-sm">
                <PlayCircle size={16} className="mr-1" /> Em andamento
              </span>
            )}
             {tournament.status === 'FINISHED' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-purple/20 text-brand-purple text-sm">
                <Award size={16} className="mr-1" /> Finalizado
              </span>
            )}
             {tournament.status === 'CANCELLED' && (
              <span className="inline-flex items-center px-3 py-1 rounded-full bg-red-100 text-red-700 text-sm">
                <XCircle size={16} className="mr-1" /> Cancelado
              </span>
            )}

            {/* Add button to regenerate bracket */}
             {(tournament.status === 'CREATED' || tournament.status === 'CANCELLED') && currentEvent?.team_formation === TeamFormationType.FORMED && (
                 <Button
                    onClick={handleGenerateFormedBracket}
                    variant="outline"
                    disabled={generatingBracket}
                    loading={generatingBracket}
                 >
                    <RefreshCw size={18} className="mr-1" /> Regenerar
                 </Button>
             )}
             {/* Consider adding regenerate for RANDOM type if needed */}

          </div>
        </div>

        {/* Adicionar controle de visualização */}
        {courts.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pb-4 border-b border-brand-gray">
            <span className="text-sm font-medium text-brand-blue">Visualização:</span>

            <div className="flex bg-gray-100 rounded-md overflow-hidden">
              <button
                className={`px-3 py-1.5 text-sm ${viewMode === 'all' ? 'bg-brand-blue text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setViewMode('all')}
              >
                Geral
              </button>
              <button
                className={`px-3 py-1.5 text-sm ${viewMode === 'by-court' ? 'bg-brand-blue text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                onClick={() => setViewMode('by-court')}
              >
                Por Quadra
              </button>
            </div>

            {viewMode === 'by-court' && (
              <select
                className="bg-white border border-brand-gray rounded-md px-3 py-1.5 text-sm"
                value={selectedCourtId || ''}
                onChange={(e) => setSelectedCourtId(e.target.value || null)}
              >
                <option value="">Todas as quadras</option>
                {courts.map(court => (
                  <option key={court.id} value={court.id}>
                    {court.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Visualização do chaveamento */}
        {viewMode === 'all' ? (
          // Visualização padrão de chaveamento
          <div className="overflow-x-auto bg-gray-50 p-4 rounded-lg">
            <div className="inline-flex space-x-8 p-4 min-w-full">
              {roundsArray.map(({ round, matches }) => (
                <div key={round} className="space-y-4 flex-shrink-0">
                  <h4 className="font-medium text-center text-brand-blue">
                    {round === roundsArray.length ? 'Final' : `Rodada ${round}`}
                  </h4>
                  <div className="flex flex-col space-y-6">
                    {matches.filter(match => match !== null).map((match) => {
                      let teamA = match.team1 && match.team1.length > 0 ? participantMap.get(match.team1[0]) : null;
                      let teamB = match.team2 && match.team2.length > 0 ? participantMap.get(match.team2[0]) : null;
                      const isByeMatch = !!(match.completed && match.team2 === null && match.team1);
                      const court = match.courtId ? courts.find(c => c.id === match.courtId)?.name : undefined;
                      const scheduledTime = match.scheduledTime ? formatDateTime(match.scheduledTime).split(' ')[1] : undefined;

                      return (
                        <div key={match.id} className="flex items-center justify-center">
                          <MatchCard
                            teamA={teamA || (match.team1 ? 'Time não encontrado' : null)}
                            teamB={teamB || (match.team2 ? 'Time não encontrado' : null)}
                            scoreA={match.score1 ?? undefined} // Convert null to undefined
                            scoreB={match.score2 ?? undefined} // Convert null to undefined
                            winner={match.winnerId || undefined}
                            onClick={() => handleMatchClick(match)}
                            highlighted={selectedMatch?.id === match.id}
                            byeMatch={isByeMatch}
                            court={court}
                            scheduledTime={scheduledTime}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Visualização por quadra
          <div className="space-y-6">
            {selectedCourtId ? (
              // Visualização de uma quadra específica
              <div className="bg-white rounded-lg border border-brand-gray p-4">
                <h4 className="font-medium text-lg text-center text-brand-blue mb-4">
                  {courts.find(c => c.id === selectedCourtId)?.name || 'Quadra'}
                </h4>

                {filterMatchesByCourt(tournament.matches).length > 0 ? (
                  <div className="space-y-4">
                    {filterMatchesByCourt(tournament.matches).map((match) => {
                      let teamA = match.team1 && match.team1.length > 0 ? participantMap.get(match.team1[0]) : null;
                      let teamB = match.team2 && match.team2.length > 0 ? participantMap.get(match.team2[0]) : null;
                      const isByeMatch = !!(match.completed && !match.score1 && !match.score2 && (match.team1 || match.team2));
                      const court = match.courtId ? courts.find(c => c.id === match.courtId)?.name : undefined;
                      const scheduledTime = match.scheduledTime ? formatDateTime(match.scheduledTime).split(' ')[1] : undefined;

                      return (
                        <div key={match.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <span className="text-xs font-medium text-brand-purple">Rodada {match.round} • Posição {match.position}</span>
                            </div>
                            {scheduledTime && (
                              <span className="text-xs bg-brand-blue/10 text-brand-blue px-2 py-0.5 rounded">
                                {scheduledTime}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col space-y-2">
                            <div className={`flex justify-between items-center p-2 rounded ${match.winnerId === 'team1' ? 'bg-brand-green/10' : ''}`}>
                              <span className="font-medium">{teamA || 'TBD'}</span>
                              <span className="font-bold">{match.score1 ?? '-'}</span> {/* Use nullish coalescing for display */}
                            </div>
                            <div className={`flex justify-between items-center p-2 rounded ${match.winnerId === 'team2' ? 'bg-brand-green/10' : ''}`}>
                              <span className="font-medium">{teamB || 'TBD'}</span>
                              <span className="font-bold">{match.score2 ?? '-'}</span> {/* Use nullish coalescing for display */}
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleMatchClick(match)}
                              disabled={isByeMatch}
                            >
                              {match.completed ? 'Ver Detalhes' : 'Atualizar'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <MapPin className="mx-auto h-10 w-10 text-gray-300" />
                    <p className="mt-2 text-sm text-gray-500">Nenhuma partida agendada para esta quadra</p>
                  </div>
                )}
              </div>
            ) : (
              // Visualização de todas as quadras
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courts.map(court => {
                  const courtMatches = tournament.matches.filter(m => m.courtId === court.id);

                  return (
                    <div key={court.id} className="bg-white rounded-lg border border-brand-gray p-4">
                      <h4 className="font-medium text-brand-blue mb-2 flex items-center">
                        <MapPin size={16} className="mr-1" />
                        {court.name}
                      </h4>

                      {courtMatches.length > 0 ? (
                        <div className="space-y-2">
                          {courtMatches.slice(0, 3).map((match) => {
                            let teamA = match.team1 && match.team1.length > 0 ? participantMap.get(match.team1[0]) : null;
                            let teamB = match.team2 && match.team2.length > 0 ? participantMap.get(match.team2[0]) : null;
                            const scheduledTime = match.scheduledTime ? formatDateTime(match.scheduledTime).split(' ')[1] : undefined;

                            return (
                              <div key={match.id} className="border-b border-gray-100 pb-2 last:border-b-0">
                                <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                                  <span>Rodada {match.round}</span>
                                  {scheduledTime && <span>{scheduledTime}</span>}
                                </div>
                                <p className="text-sm">
                                  <span className="font-medium">{teamA || 'TBD'}</span>
                                  <span className="mx-1 text-gray-400">vs</span>
                                  <span className="font-medium">{teamB || 'TBD'}</span>
                                </p>
                              </div>
                            );
                          })}

                          {courtMatches.length > 3 && (
                            <div className="text-center pt-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCourtId(court.id);
                                }}
                              >
                                Ver todas ({courtMatches.length})
                              </Button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 py-4 text-center">
                          Nenhuma partida agendada
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modals */}
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
      </div>
    );
  }

  // If tournament structure DOES NOT exist, show generation UI
  else {
    // Ensure event details are loaded before deciding which UI to show
    if (!currentEvent) {
       return <div className="text-center text-gray-500 py-8">Carregando detalhes do evento...</div>;
    }

    // Check event type and team formation
    if (currentEvent.type === EventType.TOURNAMENT) {
        if (currentEvent.team_formation === TeamFormationType.RANDOM) {
            // UI for RANDOM team formation (Animation Wheel)
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
                    Gerar Chaveamento Aleatório
                </h3>
                <p className="text-gray-600 mb-6">
                    Use a roleta abaixo para sortear as duplas e atribuir as quadras iniciais.
                </p>
                <TournamentRandomizer
                    eventId={eventId}
                    participants={eventParticipants}
                    courts={courts}
                    // Add explicit types to the callback parameters
                    onComplete={(
                        matches: Array<[string, string]>,
                        courtAssignments: Record<string, string[]>
                    ) => {
                        console.log("Randomization complete, calling generateBracket action.");
                        // Call the store action to save the generated bracket
                        generateBracket(eventId, matches, courtAssignments, { forceReset: true })
                            .then(() => addNotification({ type: 'success', message: 'Chaveamento aleatório gerado e salvo!' }))
                            .catch(err => addNotification({ type: 'error', message: `Erro ao salvar chaveamento: ${err.message}` }));
                    }}
                />
                </div>
            );
        } else {
            // UI for FORMED teams
            return (
                <div className="bg-white p-8 text-center rounded-lg shadow border border-brand-gray">
                <PlayCircle className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Chaveamento não gerado</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Gere o chaveamento do torneio quando todos os participantes estiverem inscritos.
                </p>
                <div className="mt-6 flex flex-col md:flex-row justify-center gap-3">
                    <Button
                    onClick={() => setShowSkipTeamModal(true)}
                    variant="outline"
                    disabled={eventParticipants.length < 3}
                    >
                    Configurar "Byes"
                    </Button>
                    <Button
                    onClick={handleGenerateFormedBracket} // Use specific handler
                    disabled={eventParticipants.length < 2 || generatingBracket}
                    loading={generatingBracket}
                    >
                    <RefreshCw size={18} className="mr-1" />
                    Gerar Chaveamento
                    </Button>
                </div>
                {skipTeamIds.length > 0 && (
                    <div className="mt-4 p-2 bg-brand-green/10 rounded-lg inline-block">
                    <p className="text-sm font-medium text-brand-green">
                        {skipTeamIds.length} equipe(s) receberão "bye"
                    </p>
                    </div>
                )}
                {eventParticipants.length < 2 && (
                    <p className="mt-4 text-sm text-brand-orange">
                    Mínimo de 2 participantes para gerar chaveamento.
                    </p>
                )}
                {/* Bye selection Modal */}
                <Modal isOpen={showSkipTeamModal} onClose={() => setShowSkipTeamModal(false)} title="Configurar Passes Automáticos (Byes)">
                    <div className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Selecione as equipes que avançarão automaticamente na primeira rodada:
                    </p>
                    <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
                        {eventParticipants.map(participant => (
                        <div
                            key={participant.id}
                            className={`p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 ${skipTeamIds.includes(participant.id) ? 'bg-brand-green/10' : ''}`}
                            onClick={() => toggleSkipTeam(participant.id)}
                        >
                            <span className="font-medium">{participant.name}</span>
                            <input type="checkbox" checked={skipTeamIds.includes(participant.id)} readOnly className="h-4 w-4 text-brand-green rounded border-gray-300 focus:ring-brand-green" />
                        </div>
                        ))}
                    </div>
                    <div className="flex justify-end space-x-3 pt-4">
                        <Button variant="outline" onClick={() => setShowSkipTeamModal(false)}>Cancelar</Button>
                        <Button onClick={() => setShowSkipTeamModal(false)}>Confirmar</Button>
                    </div>
                    </div>
                </Modal>
                </div>
            );
        }
    } else if (currentEvent.type === EventType.POOL) {
        // UI for POOL type events (Bolão)
        return (
            <div className="bg-white p-8 text-center rounded-lg shadow border border-brand-gray">
                <List className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-semibold text-gray-900">Gerenciamento de Bolão</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Funcionalidades específicas para bolões ainda não implementadas.
                </p>
                {/* Add Pool specific management options here later */}
            </div>
        );
    } else {
         return <div className="text-center text-gray-500 py-8">Tipo de evento desconhecido.</div>;
    }
  }
};
