import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Match, Event, Participant } from '../../types';
import './TournamentTransmission.css';

interface TournamentData {
  id: string;
  title: string;
  status: string;
  matches: Match[];
}

interface TeamRanking {
  teamId: string;
  teamName: string;
  players: string[];
  position: number;
  points: number;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDiff: number;
  winRate: number;
  groupNumber?: number;
}

interface TournamentTransmissionProps {
  eventId?: string;
}

const TournamentTransmission: React.FC<TournamentTransmissionProps> = ({ eventId: propEventId }) => {
  const { id: paramId } = useParams<{ id: string }>();
  const eventId = propEventId || paramId;
  
  const [event, setEvent] = useState<Event | null>(null);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar participantes
  const fetchParticipants = async (eventId: string) => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventId);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar participantes:', error);
      return [];
    }
  };

  // Função para buscar dados do torneio
  const fetchTournamentData = async () => {
    if (!eventId) {
      setError('ID do evento não fornecido');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Buscar evento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (eventError) {
        throw new Error(`Erro ao buscar evento: ${eventError.message}`);
      }

      setEvent(eventData);

      // Buscar torneio
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select('*')
        .eq('event_id', eventId)
        .single();

      if (tournamentError && tournamentError.code !== 'PGRST116') {
        throw new Error(`Erro ao buscar torneio: ${tournamentError.message}`);
      }

      // Buscar participantes
      const participantsData = await fetchParticipants(eventId);
      setParticipants(participantsData);

      // Buscar matches se o torneio existir
      let matches: Match[] = [];
      if (tournamentData) {
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select('*')
          .eq('event_id', eventId)
          .order('round', { ascending: true });

        if (matchesError) {
          console.error('Erro ao buscar matches:', matchesError);
        } else {
          matches = matchesData || [];
        }

        setTournament({
          ...tournamentData,
          matches
        });
      }

    } catch (error) {
      console.error('Erro ao carregar dados do torneio:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  // Função para obter nome da dupla
  const getTeamDisplayName = (teamIds: string[] | null | undefined): string => {
    if (!teamIds || teamIds.length === 0) return 'Equipe Desconhecida';
    
    const names = teamIds.map(id => {
      const participant = participants.find(p => p.id === id);
      return participant?.name || 'Desconhecido';
    });
    
    return names.join(' & ');
  };

  // Calcular rankings baseado nas partidas
  const rankings = useMemo(() => {
    if (!tournament?.matches || participants.length === 0) return [];

    const teamStats = new Map<string, TeamRanking>();
    const completedMatches = tournament.matches.filter(match => match.completed);

    // Processar cada partida finalizada
    completedMatches.forEach(match => {
      if (!match.team1 || !match.team2) return;

      const team1Key = match.team1.join('|');
      const team2Key = match.team2.join('|');
      const team1Name = getTeamDisplayName(match.team1);
      const team2Name = getTeamDisplayName(match.team2);

      // Inicializar estatísticas se não existirem
      if (!teamStats.has(team1Key)) {
        teamStats.set(team1Key, {
          teamId: team1Key,
          teamName: team1Name,
          players: match.team1,
          position: 0,
          points: 0,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          setsDiff: 0,
          winRate: 0,
          groupNumber: match.groupNumber || 0
        });
      }

      if (!teamStats.has(team2Key)) {
        teamStats.set(team2Key, {
          teamId: team2Key,
          teamName: team2Name,
          players: match.team2,
          position: 0,
          points: 0,
          wins: 0,
          losses: 0,
          setsWon: 0,
          setsLost: 0,
          setsDiff: 0,
          winRate: 0,
          groupNumber: match.groupNumber || 0
        });
      }

      const team1Stats = teamStats.get(team1Key)!;
      const team2Stats = teamStats.get(team2Key)!;

      // Calcular sets
      const score1 = match.score1 || 0;
      const score2 = match.score2 || 0;

      team1Stats.setsWon += score1;
      team1Stats.setsLost += score2;
      team2Stats.setsWon += score2;
      team2Stats.setsLost += score1;

      // Determinar vencedor e atribuir pontos
      if (match.winnerId === 'team1') {
        team1Stats.wins++;
        team1Stats.points += 3;
        team2Stats.losses++;
      } else if (match.winnerId === 'team2') {
        team2Stats.wins++;
        team2Stats.points += 3;
        team1Stats.losses++;
      }
    });

    // Calcular estatísticas finais e ordenar
    const rankingArray = Array.from(teamStats.values()).map(team => ({
      ...team,
      setsDiff: team.setsWon - team.setsLost,
      winRate: team.wins + team.losses > 0 ? (team.wins / (team.wins + team.losses)) * 100 : 0
    }));

    // Ordenar por: pontos, vitórias, saldo de sets, sets ganhos
    rankingArray.sort((a, b) => {
      if (a.points !== b.points) return b.points - a.points;
      if (a.wins !== b.wins) return b.wins - a.wins;
      if (a.setsDiff !== b.setsDiff) return b.setsDiff - a.setsDiff;
      return b.setsWon - a.setsWon;
    });

    // Atribuir posições
    rankingArray.forEach((team, index) => {
      team.position = index + 1;
    });

    return rankingArray;
  }, [tournament, participants]);

  useEffect(() => {
    fetchTournamentData();
  }, [eventId]);

  useEffect(() => {
    if (!eventId) return;

    // Subscription para atualizações em tempo real
    const matchesSubscription = supabase
      .channel('tournament_matches')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'matches',
        filter: `event_id=eq.${eventId}`
      }, () => {
        fetchTournamentData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchesSubscription);
    };
  }, [eventId]);

  // Loading state
  if (loading) {
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <h2>Carregando Transmissão</h2>
            <p>Preparando dados do torneio...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="error-state">
            <Trophy size={96} className="error-icon" />
            <h2>Erro na Transmissão</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // No event found
  if (!event) {
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="empty-state">
            <Trophy size={96} className="empty-icon" />
            <h2>Evento Não Encontrado</h2>
            <p>Verifique se o evento existe e está ativo</p>
          </div>
        </div>
      </div>
    );
  }

  // No tournament data or no rankings
  if (!tournament || rankings.length === 0) {
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="tournament-header">
            <h1 className="tournament-title">{event.title}</h1>
            <div className="tournament-subtitle">Transmissão Ao Vivo</div>
          </div>
          
          <div className="waiting-state">
            <Trophy size={96} className="waiting-icon" />
            <h2>Aguardando Resultados</h2>
            <p>O torneio ainda não possui partidas finalizadas</p>
            <div className="tournament-info">
              <div className="info-item">
                <span className="info-label">Participantes:</span>
                <span className="info-value">{participants.length}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Status:</span>
                <span className="info-value">{event.status}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main transmission display
  return (
    <div className="tournament-transmission">
      <div className="tournament-transmission-container">
        {/* Header */}
        <div className="tournament-header">
          <h1 className="tournament-title">{event.title}</h1>
          <div className="tournament-subtitle">Ranking Geral • Transmissão Ao Vivo</div>
        </div>

        {/* Rankings List */}
        <div className="rankings-container">
          <div className="ranking-table">
            <div className="ranking-header">
              <div className="header-position">#</div>
              <div className="header-team">DUPLA</div>
              <div className="header-stat">V</div>
              <div className="header-stat">SG</div>
              <div className="header-stat">PG</div>
              <div className="header-stat">JP</div>
            </div>
            
            {rankings.slice(0, 9).map((team, index) => {
              const isQualified = index < 2; // Top 2 classificados para eliminatórias
              const medalPosition = index < 3 ? index + 1 : null;
              
              return (
                <div
                  key={team.teamId}
                  className={`ranking-row ${isQualified ? 'qualified' : ''}`}
                >
                  <div className="row-position">
                    {medalPosition ? (
                      <div className={`medal medal-${medalPosition}`}>
                        {medalPosition}
                      </div>
                    ) : (
                      <span className="position-number">{index + 1}</span>
                    )}
                  </div>
                  
                  <div className="row-team">
                    <div className="team-name">{team.teamName}</div>
                    {isQualified && (
                      <div className="qualification-badge">
                        Classificado para eliminatórias (Beach Tennis)
                      </div>
                    )}
                  </div>
                  
                  <div className="row-stat wins">{team.wins}</div>
                  <div className={`row-stat saldo ${team.setsDiff >= 0 ? 'positive' : 'negative'}`}>
                    {team.setsDiff >= 0 ? '+' : ''}{team.setsDiff}
                  </div>
                  <div className="row-stat points">{team.setsWon}</div>
                  <div className="row-stat matches">{team.wins + team.losses}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tournament Info Footer */}
        <div className="tournament-footer">
          <div className="footer-stats">
            <div className="footer-stat">
              <span className="footer-label">Total de Duplas:</span>
              <span className="footer-value">{rankings.length}</span>
            </div>
            <div className="footer-stat">
              <span className="footer-label">Partidas Concluídas:</span>
              <span className="footer-value">{tournament.matches.filter(m => m.completed).length}</span>
            </div>
            <div className="footer-stat">
              <span className="footer-label">Status:</span>
              <span className="footer-value">{event.status}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentTransmission;
