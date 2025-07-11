import { Match, GroupRanking, OverallRanking } from '../types';

/**
 * Regras específicas do Beach Tennis para torneios
 * Implementa as regras oficiais do regulamento Beach Tennis Ceará 2025
 */

export interface BeachTennisGroupStats {
  teamId: string[];
  wins: number;
  losses: number;
  matchesPlayed: number;
  gamesWon: number;
  gamesLost: number;
  gameDifference: number; // Saldo de games (pontuação principal)
  pointsScored: number;   // Total de pontos marcados
  pointsConceded: number; // Total de pontos sofridos
  pointDifference: number; // Diferença de pontos
  groupNumber: number;
  headToHead: Map<string, { wins: number; gamesWon: number; gamesLost: number }>;
}

/**
 * Valida se um grupo segue as regras do Beach Tennis
 * - Mínimo 3 duplas, máximo 4 duplas por grupo
 */
export function validateBeachTennisGroupSize(groupSize: number): boolean {
  return groupSize >= 3 && groupSize <= 4;
}

/**
 * Calcula o número ideal de grupos baseado no total de duplas
 * Segue as regras: grupos de 3-4 duplas preferencialmente
 */
export function calculateOptimalGroupCount(totalTeams: number): number {
  if (totalTeams < 3) return 1;
  
  // Priorizar grupos de 3 duplas, permitir alguns grupos de 4 se necessário
  const idealGroupSize = 3;
  let groupCount = Math.ceil(totalTeams / idealGroupSize);
  
  // Verificar se a distribuição funciona sem grupos muito pequenos
  while (groupCount > 1) {
    const teamsPerGroup = Math.floor(totalTeams / groupCount);
    const remainder = totalTeams % groupCount;
    
    // Se todos os grupos terão pelo menos 3 duplas, é válido
    if (teamsPerGroup >= 3 && (remainder === 0 || teamsPerGroup + 1 <= 4)) {
      break;
    }
    
    groupCount--;
  }
  
  return Math.max(1, groupCount);
}

/**
 * Calcula rankings de grupo seguindo as regras específicas do Beach Tennis
 * Critérios de classificação:
 * 1. Diferença de games (saldo de games)
 * 2. Total de games ganhos
 * 3. Confronto direto (se aplicável)
 * 4. Total de jogos disputados
 */
export function calculateBeachTennisGroupRankings(matches: Match[]): GroupRanking[] {
  const teamStats = new Map<string, BeachTennisGroupStats>();

  // Inicializar estatísticas para cada dupla
  matches.forEach(match => {
    [match.team1, match.team2].forEach(team => {
      if (team && team.length > 0) {
        const teamKey = team.join(',');
        if (!teamStats.has(teamKey)) {
          teamStats.set(teamKey, {
            teamId: team,
            wins: 0,
            losses: 0,
            matchesPlayed: 0,
            gamesWon: 0,
            gamesLost: 0,
            gameDifference: 0,
            pointsScored: 0,
            pointsConceded: 0,
            pointDifference: 0,
            groupNumber: match.groupNumber || 0,
            headToHead: new Map()
          });
        }
      }
    });
  });

  // Processar resultados das partidas
  matches.forEach(match => {
    if (!match.completed || !match.team1 || !match.team2) return;

    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');
    const team1Stats = teamStats.get(team1Key);
    const team2Stats = teamStats.get(team2Key);

    if (!team1Stats || !team2Stats) return;

    const score1 = match.score1 || 0;
    const score2 = match.score2 || 0;

    // Atualizar estatísticas básicas
    team1Stats.matchesPlayed++;
    team2Stats.matchesPlayed++;
    team1Stats.gamesWon += score1;
    team1Stats.gamesLost += score2;
    team2Stats.gamesWon += score2;
    team2Stats.gamesLost += score1;

    // Determinar vencedor baseado nos games
    if (score1 > score2) {
      team1Stats.wins++;
      team2Stats.losses++;
      
      // Registrar confronto direto
      team1Stats.headToHead.set(team2Key, { 
        wins: (team1Stats.headToHead.get(team2Key)?.wins || 0) + 1, 
        gamesWon: score1, 
        gamesLost: score2 
      });
      team2Stats.headToHead.set(team1Key, { 
        wins: team2Stats.headToHead.get(team1Key)?.wins || 0, 
        gamesWon: score2, 
        gamesLost: score1 
      });
    } else if (score2 > score1) {
      team2Stats.wins++;
      team1Stats.losses++;
      
      // Registrar confronto direto
      team2Stats.headToHead.set(team1Key, { 
        wins: (team2Stats.headToHead.get(team1Key)?.wins || 0) + 1, 
        gamesWon: score2, 
        gamesLost: score1 
      });
      team1Stats.headToHead.set(team2Key, { 
        wins: team1Stats.headToHead.get(team2Key)?.wins || 0, 
        gamesWon: score1, 
        gamesLost: score2 
      });
    }

    // Calcular diferença de games (pontuação principal do Beach Tennis)
    team1Stats.gameDifference = team1Stats.gamesWon - team1Stats.gamesLost;
    team2Stats.gameDifference = team2Stats.gamesWon - team2Stats.gamesLost;
  });

  // Converter para array e aplicar critérios de classificação do Beach Tennis
  const rankings: GroupRanking[] = Array.from(teamStats.values()).map(stats => ({
    teamId: stats.teamId,
    team: stats.teamId.join(' & '), // Para compatibilidade
    rank: 0, // Será calculado após ordenação
    position: 0, // Add the required position property
    stats: {
      teamId: stats.teamId,
      wins: stats.wins,
      losses: stats.losses,
      matchesPlayed: stats.matchesPlayed,
      gamesWon: stats.gamesWon,
      gamesLost: stats.gamesLost,
      gameDifference: stats.gameDifference,
      setsWon: stats.wins, // Para compatibilidade
      setsLost: stats.losses, // Para compatibilidade
      setDifference: stats.wins - stats.losses, // Para compatibilidade
      points: stats.wins * 2, // Para compatibilidade
      draws: 0, // Para compatibilidade
      headToHeadWins: Object.fromEntries(
        Array.from(stats.headToHead.entries()).map(([opponentKey, h2h]) => [
          opponentKey,
          h2h.wins > 0
        ])
      ), // Converter para formato esperado { [opponentTeamKey: string]: boolean }
      headToHead: stats.headToHead // Add the Map version
    }
  }));

  // Ordenar seguindo as regras oficiais do Beach Tennis
  rankings.sort((a, b) => {
    // 1. Diferença de games (critério principal - maior diferença ganha)
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 2. Total de games ganhos (maior número ganha)
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 3. Confronto direto (calcular baseado no headToHead interno)
    const aKey = a.teamId.join(',');
    const bKey = b.teamId.join(',');
    
    // Como não temos acesso direto ao headToHead, usamos uma aproximação
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    // 4. Número de jogos disputados (mais jogos primeiro, para grupos irregulares)
    if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
      return b.stats.matchesPlayed - a.stats.matchesPlayed;
    }

    // 5. Critério alfabético para consistência
    return a.teamId.join(',').localeCompare(b.teamId.join(','));
  });

  // Atribuir posições finais
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
    ranking.position = index + 1; // Set position equal to rank
  });

  return rankings;
}

/**
 * Gera chave de eliminação seguindo as regras do Beach Tennis
 * - Melhor geral vs pior geral
 * - Duplas do mesmo grupo não se enfrentam na primeira rodada
 * - 1º e 2º melhores em extremidades opostas da chave
 */
export function generateBeachTennisEliminationStructure(
  qualifiedTeams: OverallRanking[]
): Match[] {
  if (qualifiedTeams.length < 2) {
    throw new Error('Pelo menos 2 duplas qualificadas são necessárias para a fase eliminatória');
  }

  const matches: Match[] = [];
  const totalTeams = qualifiedTeams.length;
  
  // Separar por grupos para evitar confrontos do mesmo grupo na primeira rodada
  const teamsByGroup = new Map<number, OverallRanking[]>();
  qualifiedTeams.forEach(team => {
    const groupNum = team.groupNumber || 0;
    if (!teamsByGroup.has(groupNum)) {
      teamsByGroup.set(groupNum, []);
    }
    teamsByGroup.get(groupNum)!.push(team);
  });

  // Organizar confrontos evitando times do mesmo grupo
  const organizedPairs: [OverallRanking, OverallRanking][] = [];
  const usedTeams = new Set<string>();

  // Algoritmo para emparejar melhor vs pior, evitando mesmo grupo
  for (let i = 0; i < Math.floor(totalTeams / 2); i++) {
    let bestTeam: OverallRanking | null = null;
    let worstTeam: OverallRanking | null = null;

    // Encontrar melhor dupla ainda não usada
    for (const team of qualifiedTeams) {
      const teamKey = team.teamId.join(',');
      if (!usedTeams.has(teamKey)) {
        bestTeam = team;
        break;
      }
    }

    if (!bestTeam) break;

    // Encontrar pior dupla de grupo diferente
    for (let j = qualifiedTeams.length - 1; j >= 0; j--) {
      const team = qualifiedTeams[j];
      const teamKey = team.teamId.join(',');
      
      if (!usedTeams.has(teamKey) && 
          team.groupNumber !== bestTeam.groupNumber) {
        worstTeam = team;
        break;
      }
    }

    // Se não encontrou dupla de grupo diferente, pegar a próxima disponível
    if (!worstTeam) {
      for (let j = qualifiedTeams.length - 1; j >= 0; j--) {
        const team = qualifiedTeams[j];
        const teamKey = team.teamId.join(',');
        
        if (!usedTeams.has(teamKey) && team !== bestTeam) {
          worstTeam = team;
          break;
        }
      }
    }

    if (bestTeam && worstTeam) {
      organizedPairs.push([bestTeam, worstTeam]);
      usedTeams.add(bestTeam.teamId.join(','));
      usedTeams.add(worstTeam.teamId.join(','));
    }
  }

  // Criar partidas da primeira rodada
  organizedPairs.forEach((pair, index) => {
    const match: Match = {
      id: `beach_tennis_elimination_${index + 1}`,
      eventId: '', // Será preenchido pelo service
      tournamentId: '', // Será preenchido pelo service
      round: 1,
      position: index + 1,
      team1: pair[0].teamId,
      team2: pair[1].teamId,
      score1: null,
      score2: null,
      winnerId: null,
      completed: false,
      courtId: null,
      scheduledTime: null,
      stage: 'ELIMINATION',
      groupNumber: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    matches.push(match);
  });

  // Gerar próximas rodadas (semifinais, final)
  let currentRound = 1;
  let currentMatches = matches.length;

  while (currentMatches > 1) {
    const nextRound = currentRound + 1;
    const nextMatches = Math.ceil(currentMatches / 2);

    for (let i = 0; i < nextMatches; i++) {
      const match: Match = {
        id: `beach_tennis_elimination_r${nextRound}_${i + 1}`,
        eventId: '',
        tournamentId: '',
        round: nextRound,
        position: i + 1,
        team1: [], // Será preenchido com vencedores
        team2: [], // Será preenchido com vencedores
        score1: null,
        score2: null,
        winnerId: null,
        completed: false,
        courtId: null,
        scheduledTime: null,
        stage: 'ELIMINATION',
        groupNumber: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      matches.push(match);
    }

    currentMatches = nextMatches;
    currentRound++;
  }

  return matches;
}

/**
 * Aplica critérios de desempate específicos do Beach Tennis
 */
export function applyBeachTennisTiebreakerCriteria(
  teams: OverallRanking[]
): OverallRanking[] {
  return teams.sort((a, b) => {
    // 1. Diferença de games (critério principal)
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 2. Total de games ganhos
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 3. Confronto direto (se aplicável)
    const aKey = a.teamId.join(',');
    const bKey = b.teamId.join(',');
    const aVsB = a.stats.headToHead?.get(bKey);
    
    if (aVsB) {
      const directGameDiff = aVsB.gamesWon - aVsB.gamesLost;
      if (directGameDiff !== 0) {
        return directGameDiff > 0 ? -1 : 1;
      }
    }

    // 4. Menos games perdidos
    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    // 5. Mais jogos disputados (consistência)
    if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
      return b.stats.matchesPlayed - a.stats.matchesPlayed;
    }

    return 0; // Empate final
  });
}

/**
 * Valida se as regras do Beach Tennis estão sendo seguidas
 */
export function validateBeachTennisRules(
  groups: string[][][],
  matches: Match[]
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validar tamanho dos grupos
  groups.forEach((group, index) => {
    if (!validateBeachTennisGroupSize(group.length)) {
      errors.push(`Grupo ${index + 1} tem ${group.length} duplas. Deve ter entre 3 e 4 duplas.`);
    }
  });

  // Validar se duplas qualificadas não se enfrentam na primeira rodada (quando aplicável)
  const eliminationMatches = matches.filter(m => m.stage === 'ELIMINATION' && m.round === 1);
  
  eliminationMatches.forEach(match => {
    if (match.team1 && match.team2) {
      // Verificar se são do mesmo grupo (seria necessário ter info de grupo nas duplas)
      // Esta validação seria implementada com dados específicos do torneio
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}