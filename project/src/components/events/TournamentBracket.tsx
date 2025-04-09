import React, { useEffect, useState } from 'react';
import { Button } from '../ui/Button';
import { 
  PlayCircle, 
  RefreshCw, 
  Loader2, 
  Award,
  Edit,
  AlertCircle
} from 'lucide-react';
import { useTournamentStore, useParticipantsStore } from '../../store';
import { useNotificationStore } from '../ui/Notification';
import { Match, Participant } from '../../types';
import { Modal } from '../ui/Modal';

interface TournamentBracketProps {
  eventId: string;
}

interface MatchProps {
  teamA?: string | null;
  teamB?: string | null;
  scoreA?: number;
  scoreB?: number;
  winner?: string;
  onClick?: () => void;
  highlighted?: boolean;
  byeMatch?: boolean;
}

const MatchCard: React.FC<MatchProps> = ({ 
  teamA = '', 
  teamB = '', 
  scoreA, 
  scoreB, 
  winner, 
  onClick,
  highlighted = false,
  byeMatch = false
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

export const TournamentBracket: React.FC<TournamentBracketProps> = ({ eventId }) => {
  const {
    tournament,
    selectedMatch,
    loading,
    error,
    fetchTournament,
    generateTournament,
    updateMatchResults,
    startTournament,
    selectMatch,
  } = useTournamentStore();
  
  const { eventParticipants, loading: loadingParticipants, fetchParticipantsByEvent } = useParticipantsStore();
  const addNotification = useNotificationStore((state) => state.addNotification);
  const [showMatchEditor, setShowMatchEditor] = useState(false);
  const [generatingBracket, setGeneratingBracket] = useState(false);
  
  // Criar um mapa de IDs para nomes de participantes
  const participantMap = new Map<string, string>();
  eventParticipants.forEach((participant: Participant) => {
    participantMap.set(participant.id, participant.name);
  });
  
  // Fetch tournament data
  useEffect(() => {
    if (eventId) {
      fetchTournament(eventId).catch((err) => {
        console.log("Torneio pode não existir ainda:", err);
      });
      
      fetchParticipantsByEvent(eventId).catch(() => {
        addNotification({
          type: 'error',
          message: 'Falha ao carregar participantes'
        });
      });
    }
  }, [eventId, fetchTournament, fetchParticipantsByEvent, addNotification]);
  
  // Show errors
  useEffect(() => {
    if (error) {
      addNotification({
        type: 'error',
        message: error
      });
    }
  }, [error, addNotification]);
  
  const handleGenerateBracket = async () => {
    if (!eventId || eventParticipants.length < 2) {
      addNotification({
        type: 'warning',
        message: 'É necessário pelo menos 2 participantes para gerar o chaveamento'
      });
      return;
    }
    
    try {
      setGeneratingBracket(true);
      // Get participant IDs
      const participantIds = eventParticipants.map(p => p.id);
      
      await generateTournament(eventId, participantIds);
      
      addNotification({
        type: 'success',
        message: 'Chaveamento do torneio gerado com sucesso!'
      });
    } catch (err) {
      console.error('Error generating bracket:', err);
      addNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Erro ao gerar chaveamento do torneio'
      });
    } finally {
      setGeneratingBracket(false);
    }
  };
  
  const handleStartTournament = async () => {
    if (!tournament) return;
    
    try {
      await startTournament(tournament.id);
      
      addNotification({
        type: 'success',
        message: 'Torneio iniciado com sucesso!'
      });
    } catch (err) {
      addNotification({
        type: 'error',
        message: 'Erro ao iniciar torneio'
      });
    }
  };
  
  const handleMatchClick = (match: Match) => {
    // Só permite editar partidas com ambos os times definidos e que não estejam completas
    if (match.team1 && match.team2 && !match.completed) {
      selectMatch(match);
      setShowMatchEditor(true);
    } else if (match.completed) {
      addNotification({
        type: 'info',
        message: 'Esta partida já foi concluída'
      });
    } else {
      addNotification({
        type: 'info',
        message: 'Esta partida ainda não possui os dois times definidos'
      });
    }
  };
  
  const handleSaveMatchResults = async (matchId: string, score1: number, score2: number) => {
    try {
      await updateMatchResults(matchId, score1, score2);
      
      addNotification({
        type: 'success',
        message: 'Resultado atualizado com sucesso!'
      });
      
      // Atualiza o torneio para mostrar as mudanças
      await fetchTournament(eventId);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar resultado da partida';
      addNotification({
        type: 'error',
        message: errorMessage
      });
      throw err;
    }
  };
  
  if (loading || loadingParticipants) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 size={32} className="animate-spin text-brand-green" />
      </div>
    );
  }
  
  // If tournament doesn't exist yet, show the generation UI
  if (!tournament) {
    return (
      <div className="bg-white p-8 text-center rounded-lg shadow border border-brand-gray">
        <PlayCircle className="mx-auto h-12 w-12 text-gray-300" />
        <h3 className="mt-2 text-sm font-semibold text-gray-900">Chaveamento não gerado</h3>
        <p className="mt-1 text-sm text-gray-500">
          Gere o chaveamento do torneio quando todos os participantes estiverem inscritos.
        </p>
        <div className="mt-6">
          <Button 
            onClick={handleGenerateBracket} 
            disabled={eventParticipants.length < 2 || generatingBracket}
            loading={generatingBracket}
          >
            <RefreshCw size={18} className="mr-1" />
            Gerar Chaveamento
          </Button>
        </div>
        {eventParticipants.length < 2 && (
          <p className="mt-4 text-sm text-brand-orange">
            É necessário ter pelo menos 2 participantes para gerar o chaveamento.
          </p>
        )}
      </div>
    );
  }
  
  // Group matches by round
  const rounds = tournament.matches.reduce((acc, match) => {
    if (!acc[match.round]) {
      acc[match.round] = [];
    }
    acc[match.round].push(match);
    return acc;
  }, {} as Record<number, typeof tournament.matches>);
  
  const roundsArray = Object.entries(rounds).map(([round, matches]) => ({
    round: parseInt(round),
    matches: matches.sort((a, b) => a.position - b.position),
  })).sort((a, b) => a.round - b.round);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-brand-blue">Chaveamento do Torneio</h3>
          <p className="text-sm text-gray-500">
            Clique em uma partida para atualizar os resultados
          </p>
        </div>
        
        {tournament.status === 'CREATED' && (
          <Button onClick={handleStartTournament}>
            <PlayCircle size={18} className="mr-1" />
            Iniciar Torneio
          </Button>
        )}
        
        {tournament.status === 'STARTED' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-green/20 text-brand-green text-sm">
            <PlayCircle size={16} className="mr-1" />
            Torneio em andamento
          </span>
        )}
        
        {tournament.status === 'FINISHED' && (
          <span className="inline-flex items-center px-3 py-1 rounded-full bg-brand-purple/20 text-brand-purple text-sm">
            <Award size={16} className="mr-1" />
            Torneio finalizado
          </span>
        )}
      </div>
      
      <div className="overflow-x-auto">
        <div className="inline-flex space-x-8 p-4 min-w-full">
          {roundsArray.map(({ round, matches }) => (
            <div key={round} className="space-y-4">
              <h4 className="font-medium text-center text-brand-blue">
                {round === roundsArray.length ? 'Final' : `Rodada ${round}`}
              </h4>
              <div className="flex flex-col space-y-6">
                {matches.map((match) => {
                  // Obter os nomes reais dos participantes a partir dos IDs
                  let teamA: string | null = null;
                  let teamB: string | null = null;
                  
                  if (match.team1 && match.team1.length > 0) {
                    teamA = participantMap.get(match.team1[0]) || 'Participante desconhecido';
                  }
                  
                  if (match.team2 && match.team2.length > 0) {
                    teamB = participantMap.get(match.team2[0]) || 'Participante desconhecido';
                  }
                  
                  // Verificar se é uma partida de "bye" (passagem automática)
                  const isByeMatch = match.completed && !match.score1 && !match.score2;
                  
                  return (
                    <div key={match.id} className="flex items-center justify-center">
                      <MatchCard
                        teamA={teamA}
                        teamB={teamB}
                        scoreA={match.score1}
                        scoreB={match.score2}
                        winner={match.winnerId || undefined}
                        onClick={() => handleMatchClick(match)}
                        highlighted={selectedMatch?.id === match.id}
                        byeMatch={isByeMatch}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Match editor modal */}
      {selectedMatch && (
        <Modal
          isOpen={showMatchEditor}
          onClose={() => setShowMatchEditor(false)}
          title="Editar Resultado"
        >
          <MatchEditor
            match={selectedMatch}
            onSave={handleSaveMatchResults}
            onClose={() => setShowMatchEditor(false)}
            participantMap={participantMap}
          />
        </Modal>
      )}
    </div>
  );
};
