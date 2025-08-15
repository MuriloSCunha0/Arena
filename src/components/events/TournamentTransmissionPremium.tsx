import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Monitor, Trophy, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Match, Event, Participant } from '../../types';
import './TournamentTransmission.css';

interface GroupData {
  id: string;
  name: string;
  matches: Match[];
}

interface TeamStats {
  name: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  points: number;
}

const TournamentTransmission: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);

  const groupsArray = groups || [];

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

  const getTeamDisplayName = (team: string[] | string | null): string => {
    if (!team) return 'Desconhecido';
    
    try {
      // Se já é um array
      if (Array.isArray(team)) {
        const teamNames = team.map((id: string) => {
          const participant = participants.find(p => p.id === id);
          return participant?.name || 'Desconhecido';
        });
        return teamNames.join(' & ') || 'Dupla Desconhecida';
      }
      
      // Se é uma string JSON
      if (typeof team === 'string' && team.startsWith('[') && team.endsWith(']')) {
        const teamIds = JSON.parse(team);
        const teamNames = teamIds.map((id: string) => {
          const participant = participants.find(p => p.id === id);
          return participant?.name || 'Desconhecido';
        });
        return teamNames.join(' & ') || 'Dupla Desconhecida';
      }
      
      // Se é uma string simples
      return team;
    } catch {
      return Array.isArray(team) ? 'Dupla Desconhecida' : team;
    }
  };

  const fetchEventData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      // Buscar evento
      const { data: eventData, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();

      if (eventError) throw eventError;
      setEvent(eventData);

      // Buscar participantes
      const participantsData = await fetchParticipants(id);
      setParticipants(participantsData);

      // Buscar grupos e matches
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select(`
          id,
          name,
          matches (*)
        `)
        .eq('event_id', id)
        .order('created_at');

      if (groupError) throw groupError;

      const groupsWithMatches = (groupData || []).map(group => ({
        id: group.id,
        name: group.name,
        matches: group.matches || []
      }));

      setGroups(groupsWithMatches);

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEventData();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const matchesSubscription = supabase
      .channel('matches_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'matches',
        filter: `event_id=eq.${id}`
      }, () => {
        fetchEventData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(matchesSubscription);
    };
  }, [id]);

  if (loading) {
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="empty-state">
            <div className="empty-state-icon">
              <div className="loading-spinner"></div>
            </div>
            <h2>Carregando transmissão...</h2>
            <p className="loading-text">Preparando a experiência premium</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="tournament-transmission">
        <div className="tournament-transmission-container">
          <div className="empty-state">
            <div className="empty-state-icon">
              <Trophy size={96} />
            </div>
            <h2>Evento não encontrado</h2>
            <p>Verifique se o evento está ativo ou se o link está correto</p>
          </div>
        </div>
      </div>
    );
  }

  const isGroupPhase = true; // Assumindo fase de grupos por enquanto

  return (
    <div className="tournament-transmission">
      <div className="tournament-transmission-container">
        {event.status === 'IN_PROGRESS' ? (
          isGroupPhase ? (
            <>
              {/* Header do Evento */}
              <div className="tournament-header">
                <h1 className="tournament-title">
                  {event.title}
                </h1>
                <div className="tournament-subtitle">
                  Ranking Geral • Fase de Grupos
                </div>
              </div>

              {groupsArray.length > 0 ? (
                <div className="ranking-container">
                  <div className="ranking-wrapper">
                    <div className="ranking-list">
                      {(() => {
                        // Agregar todos os participantes de todos os grupos
                        const allParticipants = new Map<string, TeamStats>();
                        
                        groupsArray.forEach(group => {
                          group.matches.forEach((match: Match) => {
                            if (!match.completed) return;
                            
                            const team1Name = getTeamDisplayName(match.team1);
                            const team2Name = getTeamDisplayName(match.team2);
                            
                            // Inicializar estatísticas se não existirem
                            if (!allParticipants.has(team1Name)) {
                              allParticipants.set(team1Name, { 
                                name: team1Name, 
                                wins: 0, 
                                losses: 0, 
                                setsWon: 0, 
                                setsLost: 0,
                                points: 0
                              });
                            }
                            if (!allParticipants.has(team2Name)) {
                              allParticipants.set(team2Name, { 
                                name: team2Name, 
                                wins: 0, 
                                losses: 0, 
                                setsWon: 0, 
                                setsLost: 0,
                                points: 0
                              });
                            }
                            
                            const team1Stats = allParticipants.get(team1Name)!;
                            const team2Stats = allParticipants.get(team2Name)!;
                            
                            const score1 = match.score1 || 0;
                            const score2 = match.score2 || 0;
                            
                            team1Stats.setsWon += score1;
                            team1Stats.setsLost += score2;
                            team2Stats.setsWon += score2;
                            team2Stats.setsLost += score1;
                            
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
                        });

                        // Converter para array e ordenar por pontos, vitórias e saldo de sets
                        const sortedParticipants = Array.from(allParticipants.values()).sort((a, b) => {
                          if (a.points !== b.points) return b.points - a.points;
                          if (a.wins !== b.wins) return b.wins - a.wins;
                          const aSaldo = a.setsWon - a.setsLost;
                          const bSaldo = b.setsWon - b.setsLost;
                          return bSaldo - aSaldo;
                        });

                        return sortedParticipants.length > 0 ? (
                          sortedParticipants.slice(0, 16).map((team, index) => (
                            <div
                              key={`${team.name}-${index}`}
                              className={`ranking-item ${
                                index === 0 ? 'first-place' :
                                index === 1 ? 'second-place' :
                                index === 2 ? 'third-place' : 'regular'
                              }`}
                            >
                              {/* Posição */}
                              <div className={`position-indicator ${
                                index === 0 ? 'position-gold' : 
                                index === 1 ? 'position-silver' : 
                                index === 2 ? 'position-bronze' : 
                                'position-regular'
                              }`}>
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}°`}
                              </div>

                              {/* Nome da Dupla */}
                              <div className="team-name">
                                <h3 className={index < 3 ? 'team-name-podium' : 'team-name-regular'}>
                                  {team.name}
                                </h3>
                              </div>

                              {/* Estatísticas */}
                              <div className="team-stats">
                                {/* Pontos */}
                                <div className="stat-item">
                                  <div className="stat-value stat-points">{team.points}</div>
                                  <div className="stat-label stat-label-color">PONTOS</div>
                                </div>

                                {/* Vitórias */}
                                <div className="stat-item">
                                  <div className="stat-value stat-wins">{team.wins}V</div>
                                  <div className="stat-label stat-label-color">VITÓRIAS</div>
                                </div>

                                {/* Derrotas */}
                                <div className="stat-item">
                                  <div className="stat-value stat-losses">{team.losses}D</div>
                                  <div className="stat-label stat-label-color">DERROTAS</div>
                                </div>

                                {/* Saldo de Sets */}
                                <div className="stat-item">
                                  <div className={`stat-value ${
                                    (team.setsWon - team.setsLost) > 0 ? 'stat-balance-positive' : 
                                    (team.setsWon - team.setsLost) < 0 ? 'stat-balance-negative' : 'stat-balance-neutral'
                                  }`}>
                                    {(team.setsWon - team.setsLost) > 0 ? '+' : ''}{team.setsWon - team.setsLost}
                                  </div>
                                  <div className="stat-label stat-label-color">SALDO</div>
                                </div>

                                {/* Sets Won/Lost */}
                                <div className="stat-item">
                                  <div className="stat-value stat-sets">{team.setsWon}/{team.setsLost}</div>
                                  <div className="stat-label stat-label-color">SETS</div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="empty-state">
                            <div className="empty-state-icon">
                              <Users size={64} />
                            </div>
                            <h2>Aguardando resultados...</h2>
                            <p>Os rankings aparecerão conforme os jogos forem finalizados</p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Trophy size={96} />
                  </div>
                  <h2>Aguardando Grupos</h2>
                  <p>Nenhum grupo encontrado para este evento</p>
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Monitor size={96} />
              </div>
              <h2>Fase Eliminatória</h2>
              <p>Funcionalidade em desenvolvimento</p>
            </div>
          )
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Monitor size={96} />
            </div>
            <h2>Aguardando Início do Torneio</h2>
            <p>A transmissão começará quando o torneio for iniciado</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TournamentTransmission;
