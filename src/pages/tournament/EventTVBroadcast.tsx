import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Match, Participant, Tournament, Event } from '../../types';
import './tvBroadcast.css';

interface EventData {
  event: Event | null;
  tournament: Tournament | null;
  participants: Participant[];
  matches: Match[];
}

const EventTVBroadcast: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [eventData, setEventData] = useState<EventData>({
    event: null,
    tournament: null,
    participants: [],
    matches: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  const eventId = searchParams.get('eventId');

  // Atualizar horário a cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Buscar dados do evento
  useEffect(() => {
    if (!eventId) {
      setError('ID do evento não fornecido na URL');
      setLoading(false);
      return;
    }

    const fetchEventData = async () => {
      try {
        setLoading(true);

        // Buscar dados do evento
        const { data: eventData, error: eventError } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventId)
          .single();

        if (eventError) throw eventError;

        // Buscar torneio relacionado ao evento
        const { data: tournamentData, error: tournamentError } = await supabase
          .from('tournaments')
          .select('*')
          .eq('event_id', eventId)
          .single();

        // Buscar partidas do torneio (se existir)
        let matchesData: Match[] = [];
        if (tournamentData && !tournamentError) {
          const { data: matches, error: matchesError } = await supabase
            .from('tournament_matches')
            .select('*')
            .eq('tournament_id', tournamentData.id)
            .order('stage', { ascending: true })
            .order('group_number', { ascending: true })
            .order('round', { ascending: true })
            .order('position', { ascending: true });

          if (!matchesError && matches) {
            matchesData = matches;
          }
        }

        // Buscar participantes do evento
        const { data: participantsData, error: participantsError } = await supabase
          .from('participants')
          .select('*')
          .eq('event_id', eventId);

        if (participantsError) throw participantsError;

        setEventData({
          event: eventData,
          tournament: tournamentData || null,
          participants: participantsData || [],
          matches: matchesData
        });

        setError(null);
      } catch (err) {
        console.error('Erro ao buscar dados do evento:', err);
        setError('Erro ao carregar os dados do evento');
      } finally {
        setLoading(false);
      }
    };

    fetchEventData();

    // Atualizar dados a cada 15 segundos
    const intervalId = setInterval(fetchEventData, 15000);

    return () => clearInterval(intervalId);
  }, [eventId]);

  // Criar mapa de participantes
  const participantMap = useMemo(() => {
    const map = new Map<string, string>();
    eventData.participants.forEach((participant) => {
      map.set(participant.id, participant.name);
    });
    return map;
  }, [eventData.participants]);

  // Função para obter nome da equipe
  const getTeamDisplayName = (teamIds: string[] | null | undefined): string => {
    if (!teamIds || teamIds.length === 0) return 'A definir';
    
    if (teamIds.length === 1) {
      return participantMap.get(teamIds[0]) || 'Desconhecido';
    }
    
    const names = teamIds.map(id => participantMap.get(id) || 'Desconhecido');
    return names.join(' & ');
  };

  // Organizar partidas por estágio
  const matchesByStage = useMemo(() => {
    const groups: Record<number, Match[]> = {};
    const elimination: Match[] = [];

    eventData.matches.forEach(match => {
      if (match.stage === 'GROUP') {
        const groupNum = match.groupNumber ?? 0;
        if (!groups[groupNum]) groups[groupNum] = [];
        groups[groupNum].push(match);
      } else if (match.stage === 'ELIMINATION') {
        elimination.push(match);
      }
    });

    return { groups, elimination };
  }, [eventData.matches]);

  // Determinar fase atual do torneio
  const getCurrentPhase = (): 'waiting' | 'group' | 'elimination' | 'finished' => {
    if (!eventData.tournament || eventData.matches.length === 0) {
      return 'waiting';
    }

    const hasGroupMatches = Object.keys(matchesByStage.groups).length > 0;
    const hasEliminationMatches = matchesByStage.elimination.length > 0;

    if (hasGroupMatches) {
      // Verificar se todas as partidas de grupo estão completas
      const allGroupMatches = Object.values(matchesByStage.groups).flat();
      const completedGroupMatches = allGroupMatches.filter(m => m.completed);
      
      if (completedGroupMatches.length < allGroupMatches.length) {
        return 'group';
      } else if (hasEliminationMatches) {
        return 'elimination';
      }
    } else if (hasEliminationMatches) {
      return 'elimination';
    }

    return 'finished';
  };

  const currentPhase = getCurrentPhase();

  // Componente para fase de espera
  const WaitingPhase = () => (
    <div className="tv-waiting-phase">
      <div className="waiting-content">
        <div className="waiting-icon">⏳</div>
        <h2>Aguardando Início do Torneio</h2>
        <p>O torneio ainda não foi iniciado ou não possui partidas geradas.</p>
        <div className="event-info">
          <h3>{eventData.event?.title}</h3>
          <p>Participantes inscritos: {eventData.participants.length}</p>
        </div>
      </div>
    </div>
  );

  // Componente para fase de grupos
  const GroupPhase = () => {
    const groupNumbers = Object.keys(matchesByStage.groups).map(Number).sort();

    return (
      <div className="tv-group-phase">
        <div className="phase-header">
          <h2>Fase de Grupos</h2>
          <div className="progress-info">
            {Object.values(matchesByStage.groups).flat().filter(m => m.completed).length} / {Object.values(matchesByStage.groups).flat().length} partidas concluídas
          </div>
        </div>

        <div className="groups-grid">
          {groupNumbers.map(groupNum => {
            const groupMatches = matchesByStage.groups[groupNum] || [];
            const completedMatches = groupMatches.filter(m => m.completed);

            return (
              <div key={groupNum} className="group-container">
                <div className="group-header">
                  <h3>Grupo {groupNum}</h3>
                  <div className="group-progress">
                    {completedMatches.length}/{groupMatches.length}
                  </div>
                </div>

                <div className="group-matches">
                  {groupMatches.map(match => (
                    <div key={match.id} className={`tv-group-match ${match.completed ? 'completed' : 'pending'}`}>
                      <div className="match-teams">
                        <div className={`team ${match.winnerId === 'team1' ? 'winner' : ''}`}>
                          <span className="team-name">{getTeamDisplayName(match.team1)}</span>
                          <span className="team-score">{match.score1 ?? '-'}</span>
                        </div>
                        <div className="vs">VS</div>
                        <div className={`team ${match.winnerId === 'team2' ? 'winner' : ''}`}>
                          <span className="team-name">{getTeamDisplayName(match.team2)}</span>
                          <span className="team-score">{match.score2 ?? '-'}</span>
                        </div>
                      </div>
                      
                      {match.completed && (
                        <div className="match-status completed-indicator">✓</div>
                      )}
                      
                      {match.scheduledTime && (
                        <div className="match-time">
                          {new Date(match.scheduledTime).toLocaleString('pt-BR')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Componente para fase eliminatória  
  const EliminationPhase = () => {
    const eliminationRounds = useMemo(() => {
      const rounds: Record<number, Match[]> = {};
      
      matchesByStage.elimination.forEach(match => {
        if (typeof match.round !== 'number') return;
        
        if (!rounds[match.round]) {
          rounds[match.round] = [];
        }
        rounds[match.round].push(match);
      });
      
      return Object.entries(rounds).map(([round, matches]) => ({
        round: parseInt(round),
        matches: matches.sort((a, b) => (a.position || 0) - (b.position || 0))
      }));
    }, []);

    const getRoundName = (roundIndex: number, totalRounds: number): string => {
      if (roundIndex === totalRounds - 1) return 'Final';
      if (roundIndex === totalRounds - 2) return 'Semifinal';
      if (roundIndex === totalRounds - 3) return 'Quartas de Final';
      if (roundIndex === totalRounds - 4) return 'Oitavas de Final';
      return `${Math.pow(2, totalRounds - roundIndex)}ª de Final`;
    };

    return (
      <div className="tv-elimination-phase">
        <div className="phase-header">
          <h2>Chaveamento Eliminatório</h2>
          <div className="progress-info">
            {matchesByStage.elimination.filter(m => m.completed).length} / {matchesByStage.elimination.length} partidas concluídas
          </div>
        </div>

        <div className="elimination-bracket">
          {eliminationRounds.map((roundData, index) => (
            <div key={roundData.round} className="elimination-round">
              <div className="round-header">
                {getRoundName(index, eliminationRounds.length)}
              </div>
              
              <div className="round-matches">
                {roundData.matches.map(match => (
                  <div key={match.id} className={`tv-elimination-match ${match.completed ? 'completed' : 'pending'}`}>
                    <div className={`team ${match.winnerId === 'team1' ? 'winner' : ''}`}>
                      <span className="team-name">{getTeamDisplayName(match.team1)}</span>
                      <span className="team-score">{match.score1 ?? '-'}</span>
                    </div>
                    
                    <div className={`team ${match.winnerId === 'team2' ? 'winner' : ''}`}>
                      <span className="team-name">{getTeamDisplayName(match.team2)}</span>
                      <span className="team-score">{match.score2 ?? '-'}</span>
                    </div>
                    
                    {match.completed && <div className="match-completed-indicator">✓</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="tv-loading">
        <div className="loading-spinner"></div>
        <p>Carregando transmissão do evento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tv-error">
        <h3>Erro na Transmissão</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="tv-broadcast-container">
      <header className="tv-broadcast-header">
        <div className="event-title">
          <h1>{eventData.event?.title || 'Transmissão do Evento'}</h1>
          <div className="event-meta">
            <span className="live-indicator">🔴 AO VIVO</span>
            <span className="current-time">{currentTime.toLocaleTimeString('pt-BR')}</span>
          </div>
        </div>
        
        <div className="phase-indicator">
          {currentPhase === 'waiting' && 'Aguardando Início'}
          {currentPhase === 'group' && 'Fase de Grupos'}
          {currentPhase === 'elimination' && 'Fase Eliminatória'}
          {currentPhase === 'finished' && 'Evento Finalizado'}
        </div>
      </header>

      <main className="tv-broadcast-content">
        {currentPhase === 'waiting' && <WaitingPhase />}
        {currentPhase === 'group' && <GroupPhase />}
        {currentPhase === 'elimination' && <EliminationPhase />}
        {currentPhase === 'finished' && (
          <div className="tv-finished-phase">
            <h2>🏆 Evento Finalizado</h2>
            <p>Obrigado por acompanhar a transmissão!</p>
          </div>
        )}
      </main>

      <footer className="tv-broadcast-footer">
        <div className="arena-logo">Arena Sports</div>
        <div className="broadcast-info">
          Participantes: {eventData.participants.length} | 
          {eventData.matches.length > 0 && ` Partidas: ${eventData.matches.filter(m => m.completed).length}/${eventData.matches.length}`}
        </div>
      </footer>
    </div>
  );
};

export default EventTVBroadcast;
