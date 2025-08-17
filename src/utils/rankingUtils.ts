/**
 * Gera todas as partidas do formato Super 8 (todos jogam com e contra todos, duplas variando)
 * @param participantIds Array de IDs dos participantes
 * @returns Array de partidas (Match[])
 */
export function generateSuper8Matches(participantIds: string[]): Match[] {
  // Rodízio de duplas: cada jogador joga com todos os outros exatamente uma vez como parceiro
  // e nunca repete a mesma dupla. Cada rodada: todos jogam, ninguém fica de fora.
  const n = participantIds.length;
  if (n < 4 || n % 2 !== 0) {
    throw new Error('O Super 8 exige número par de participantes (mínimo 4)');
  }

  // Algoritmo de rodízio: round robin de duplas variáveis sem repetição
  // Fonte: https://en.wikipedia.org/wiki/Round-robin_tournament#Scheduling_algorithm
  // Cada rodada: n participantes, n/2 duplas, n/4 partidas
  // Garante que cada dupla só joga junta uma vez

  // Gera todas as duplas possíveis (cada dupla só aparece uma vez)
  const allDuplas: [string, string][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      allDuplas.push([participantIds[i], participantIds[j]]);
    }
  }

  // Marca duplas já usadas
  const duplaUsada = new Set<string>();
  // Marca jogadores já escalados na rodada
  let matchId = 1;
  const matches: Match[] = [];
  let rodada = 1;
  // Número máximo de rodadas: (n-1) para garantir todos com todos
  // Em cada rodada, todos jogam, ninguém repete dupla
  // O algoritmo abaixo tenta formar o máximo de partidas por rodada sem repetir dupla
  // e sem repetir jogador na mesma rodada
  const maxRodadas = n - 1;
  const duplasPorRodada = n / 2;
  const partidasPorRodada = n / 4;

  // Copia das duplas para manipulação
  let duplasRestantes = [...allDuplas];

  while (duplasRestantes.length > 0) {
    const rodadaDuplas: [string, string][] = [];
    const jogadoresUsados = new Set<string>();

    // Formar duplas para a rodada sem repetir jogadores
    for (let i = 0; i < duplasRestantes.length; i++) {
      const [a, b] = duplasRestantes[i];
      if (!jogadoresUsados.has(a) && !jogadoresUsados.has(b)) {
        rodadaDuplas.push([a, b]);
        jogadoresUsados.add(a);
        jogadoresUsados.add(b);
        // Marca dupla como usada
        duplaUsada.add(`${a}|${b}`);
        if (rodadaDuplas.length === duplasPorRodada) break;
      }
    }

    // Remove duplas usadas nesta rodada da lista de duplas restantes
    duplasRestantes = duplasRestantes.filter(([a, b]) => !duplaUsada.has(`${a}|${b}`));

    // Agora, formar partidas entre as duplas da rodada, sem repetir jogadores
    const partidasRodada: [number, number][] = [];
    const duplasUsadasNaPartida = new Set<number>();
    for (let i = 0; i < rodadaDuplas.length; i++) {
      for (let j = i + 1; j < rodadaDuplas.length; j++) {
        const dupla1 = rodadaDuplas[i];
        const dupla2 = rodadaDuplas[j];
        // Verifica se as duplas não compartilham nenhum jogador
        if (
          dupla1[0] !== dupla2[0] &&
          dupla1[0] !== dupla2[1] &&
          dupla1[1] !== dupla2[0] &&
          dupla1[1] !== dupla2[1]
        ) {
          // Garante que cada dupla só jogue uma vez por rodada
          if (!duplasUsadasNaPartida.has(i) && !duplasUsadasNaPartida.has(j)) {
            partidasRodada.push([i, j]);
            duplasUsadasNaPartida.add(i);
            duplasUsadasNaPartida.add(j);
            if (partidasRodada.length === partidasPorRodada) break;
          }
        }
      }
      if (partidasRodada.length === partidasPorRodada) break;
    }

    // Adiciona partidas da rodada
    for (const [i, j] of partidasRodada) {
      const dupla1 = rodadaDuplas[i];
      const dupla2 = rodadaDuplas[j];
      matches.push({
        id: `super8-${matchId++}`,
        team1: dupla1,
        team2: dupla2,
        score1: null,
        score2: null,
        completed: false,
        round: rodada,
        position: matches.length + 1,
        stage: 'GROUP',
        groupNumber: 1,
        eventId: '',
        tournamentId: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        winnerId: null,
        scheduledTime: null,
      });
    }

    rodada++;
    if (rodada > maxRodadas * 2) break; // Segurança para evitar loop infinito
  }

  return matches;
}

/**
 * Calcula o ranking individual do Super 8 a partir das partidas (standings_data)
 * @param matches Array de partidas (Match[])
 * @returns Array de objetos de ranking individual
 */
export function calculateSuper8IndividualRanking(matches: Match[]) {
  // Mapa de estatísticas por jogador
  const stats: Record<string, {
    wins: number;
    losses: number;
    gamesWon: number;
    gamesLost: number;
    matchesPlayed: number;
    gameDifference: number;
  }> = {};
  matches.forEach(match => {
    if (!match.completed || !match.team1 || !match.team2) return;
    const t1 = match.team1;
    const t2 = match.team2;
    const s1 = match.score1 ?? 0;
    const s2 = match.score2 ?? 0;
    // Inicializa stats
    [...t1, ...t2].forEach(pid => {
      if (!stats[pid]) stats[pid] = { wins: 0, losses: 0, gamesWon: 0, gamesLost: 0, matchesPlayed: 0, gameDifference: 0 };
    });
    // Atualiza stats
    t1.forEach(pid => {
      stats[pid].gamesWon += s1;
      stats[pid].gamesLost += s2;
      stats[pid].matchesPlayed++;
      if (s1 > s2) stats[pid].wins++;
      else stats[pid].losses++;
    });
    t2.forEach(pid => {
      stats[pid].gamesWon += s2;
      stats[pid].gamesLost += s1;
      stats[pid].matchesPlayed++;
      if (s2 > s1) stats[pid].wins++;
      else stats[pid].losses++;
    });
  });
  // Calcula saldo
  Object.values(stats).forEach(s => { s.gameDifference = s.gamesWon - s.gamesLost; });
  // Gera array ordenado
  return Object.entries(stats)
    .map(([playerId, s]) => ({ playerId, ...s }))
    .sort((a, b) =>
      b.wins - a.wins ||
      b.gameDifference - a.gameDifference ||
      b.gamesWon - a.gamesWon
    );
}
/**
 * Verifica se uma partida está finalizada segundo os critérios oficiais do ranking
 */
export function isMatchCompleted(match: Match): boolean {
  return !!(
    match.team1 && match.team2 &&
    match.score1 !== null && match.score2 !== null
  );
}
import { Match, GroupTeamStats, GroupRanking, OverallRanking } from '../types';
import { 
  calculateBeachTennisGroupRankings, 
  generateBeachTennisEliminationStructure,
  applyBeachTennisTiebreakerCriteria 
} from './beachTennisRules';

// Export the interfaces that are being imported by other files using 'export type'
export type { GroupRanking, OverallRanking } from '../types';

// Helper function to generate UUID (you might want to use a proper UUID library)
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Interface para estatísticas de um time em um grupo
 * Using the imported type from types/index.ts
 */
export interface TeamStatistics extends GroupTeamStats {
  played: number;
  headToHead?: Map<string, { wins: number; gamesWon: number; gamesLost: number }>; // Make properties required
}

/**
 * Interface estendida para estatísticas de equipe incluindo confronto direto
 * Usada internamente para cálculos de ranking geral
 */
interface TeamStatisticsExtended extends TeamStatistics {
  groupNumber: number;
}

// Helper to initialize team stats
const initializeTeamStats = (teamId: string[]): GroupTeamStats => ({
  teamId: [...teamId],
  wins: 0,
  losses: 0,
  gamesWon: 0,
  gamesLost: 0,
  gameDifference: 0,
  matchesPlayed: 0,
  setsWon: 0,
  setsLost: 0,
  setDifference: 0,
  points: 0,
  draws: 0, // Add the missing draws property
  headToHeadWins: {},
});

/**
 * Calculates the ranking within a single group based on completed matches.
 * Implements complete ITF criteria for Beach Tennis tournaments.
 */
export const calculateGroupRankings = (
  matches: Match[], 
  useBeachTennisRules: boolean = true
): GroupRanking[] => {
  if (useBeachTennisRules) {
    return calculateBeachTennisGroupRankings(matches);
  }
  
  // Manter implementação original como fallback
  const teamStats = new Map<string, TeamStatistics>();

  // Process each completed match
  matches.forEach((match) => {
    if (!match.completed || !match.team1 || !match.team2 || 
        match.score1 === null || match.score2 === null) {
      return;
    }

    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');

    // Initialize team statistics if not already present
    if (!teamStats.has(team1Key)) {
      teamStats.set(team1Key, {
        ...initializeTeamStats(match.team1),
        played: 0,
        headToHead: new Map()
      });
    }
    if (!teamStats.has(team2Key)) {
      teamStats.set(team2Key, {
        ...initializeTeamStats(match.team2),
        played: 0,
        headToHead: new Map()
      });
    }

    const team1Stats = teamStats.get(team1Key)!;
    const team2Stats = teamStats.get(team2Key)!;

    // Update basic statistics
    team1Stats.gamesWon += match.score1;
    team1Stats.gamesLost += match.score2;
    team1Stats.matchesPlayed += 1;
    team1Stats.played += 1;

    team2Stats.gamesWon += match.score2;
    team2Stats.gamesLost += match.score1;
    team2Stats.matchesPlayed += 1;
    team2Stats.played += 1;

    // Determine winner and update win/loss records
    if (match.score1 > match.score2) {
      team1Stats.wins += 1;
      team2Stats.losses += 1;
      
      // Record head-to-head with required properties
      if (!team1Stats.headToHeadWins[team2Key]) {
        team1Stats.headToHeadWins[team2Key] = true;
      }
      
      if (team1Stats.headToHead) {
        team1Stats.headToHead.set(team2Key, { 
          wins: (team1Stats.headToHead.get(team2Key)?.wins || 0) + 1, 
          gamesWon: match.score1,  // Always provide gamesWon
          gamesLost: match.score2  // Always provide gamesLost
        });
      }
      
      if (team2Stats.headToHead) {
        team2Stats.headToHead.set(team1Key, { 
          wins: team2Stats.headToHead.get(team1Key)?.wins || 0, 
          gamesWon: match.score2,  // Always provide gamesWon
          gamesLost: match.score1  // Always provide gamesLost
        });
      }
    } else {
      team2Stats.wins += 1;
      team1Stats.losses += 1;
      
      // Record head-to-head with required properties
      if (!team2Stats.headToHeadWins[team1Key]) {
        team2Stats.headToHeadWins[team1Key] = true;
      }
      
      if (team2Stats.headToHead) {
        team2Stats.headToHead.set(team1Key, { 
          wins: (team2Stats.headToHead.get(team1Key)?.wins || 0) + 1, 
          gamesWon: match.score2,  // Always provide gamesWon
          gamesLost: match.score1  // Always provide gamesLost
        });
      }
      
      if (team1Stats.headToHead) {
        team1Stats.headToHead.set(team2Key, { 
          wins: team1Stats.headToHead.get(team2Key)?.wins || 0, 
          gamesWon: match.score1,  // Always provide gamesWon
          gamesLost: match.score2  // Always provide gamesLost
        });
      }
    }

    // Calculate game difference
    team1Stats.gameDifference = team1Stats.gamesWon - team1Stats.gamesLost;
    team2Stats.gameDifference = team2Stats.gamesWon - team2Stats.gamesLost;
  });

  // Convert to array and apply tiebreaker criteria based on Beach Tennis rules
  const rankings: GroupRanking[] = Array.from(teamStats.values()).map(stats => ({
    teamId: stats.teamId,
    team: stats.teamId.join(' & '), // Add the team property
    stats: stats,
    rank: 0,
    position: 0 // Initialize position
  }));

  // Sort teams according to Beach Tennis ranking rules
  rankings.sort((a, b) => {
    // 1. Number of wins (most wins first)
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    // 2. Game difference (best difference first)
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 3. Total games won (most games first)
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 4. Head-to-head result if applicable (only if two teams are tied)
    const aKey = a.teamId.join(',');
    const bKey = b.teamId.join(',');
    
    const aVsBStats = a.stats.headToHead?.get(bKey);
    const bVsAStats = b.stats.headToHead?.get(aKey);
    
    if (aVsBStats && bVsAStats) {
      // Check head-to-head wins
      if (aVsBStats.wins !== bVsAStats.wins) {
        return bVsAStats.wins - aVsBStats.wins;
      }
      
      // If tied on direct wins, compare game difference in head-to-head
      // Use nullish coalescing to handle potential undefined values
      const aDirectGameDiff = (aVsBStats.gamesWon ?? 0) - (aVsBStats.gamesLost ?? 0);
      const bDirectGameDiff = (bVsAStats.gamesWon ?? 0) - (bVsAStats.gamesLost ?? 0);
      
      if (aDirectGameDiff !== bDirectGameDiff) {
        return bDirectGameDiff - aDirectGameDiff;
      }
    }

    // 5. Fewest games lost (fewer losses first)
    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    // 6. Most matches played (more matches first, for irregular groups)
    if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
      return b.stats.matchesPlayed - a.stats.matchesPlayed;
    }

    // 7. As a last resort, alphabetical order by team ID for consistency
    return a.teamId.join(',').localeCompare(b.teamId.join(','));
  });

  // Assign ranks and positions
  rankings.forEach((ranking, index) => {
    ranking.rank = index + 1;
    ranking.position = index + 1; // Set position equal to rank
  });

  return rankings;
};

/**
 * Gera a fase eliminatória seguindo as regras oficiais do Beach Tennis
 * 
 * Regras do Beach Tennis para chaveamento eliminatório:
 * 1. Os 2 melhores de cada grupo se classificam (padrão)
 * 2. Primeiros colocados enfrentam segundos colocados de outros grupos
 * 3. Times do mesmo grupo não podem se enfrentar nas primeiras rodadas
 * 4. Distribuição equilibrada no chaveamento
 * 5. Semifinais e final seguem formato mata-mata
 * 
 * @param groupRankings Rankings calculados por grupo
 * @param qualifiersPerGroup Número de qualificados por grupo (padrão: 2)
 * @param useBeachTennisRules Whether to use Beach Tennis specific rules
 * @returns Estrutura de partidas para a fase eliminatória
 */
export function generateEliminationBracket(
  groupRankings: Record<number, GroupRanking[]>,
  qualifiersPerGroup: number = 2,
  useBeachTennisRules: boolean = true
): Match[] {
  if (useBeachTennisRules) {
    // Obter duplas qualificadas seguindo regras do Beach Tennis
    const qualifiedTeams = getRankedQualifiers(groupRankings, qualifiersPerGroup);
    
    // Convert to Beach Tennis OverallRanking format
    const beachTennisQualified = qualifiedTeams.map(team => ({
      teamId: team.teamId,
      team: team.teamId.join(' & '), // Add the required team property
      rank: team.rank,
      stats: {
        wins: team.stats.wins,
        losses: team.stats.losses,
        matchesPlayed: team.stats.matchesPlayed,
        gamesWon: team.stats.gamesWon,
        gamesLost: team.stats.gamesLost,
        gameDifference: team.stats.gameDifference,
        groupNumber: team.groupNumber || 0,
        headToHead: team.stats.headToHead
      },
      groupNumber: team.groupNumber || 0
    }));
    
    // Aplicar critérios de desempate específicos do Beach Tennis
    const rankedTeams = applyBeachTennisTiebreakerCriteria(beachTennisQualified);
    
    // Gerar estrutura de eliminação seguindo regras do Beach Tennis
    return generateBeachTennisEliminationStructure(rankedTeams);
  }
  
  // Manter implementação original como fallback
  const matches: Match[] = [];
  const qualifiedTeams: string[][] = [];

  // Extract qualified teams from each group
  Object.values(groupRankings).forEach(rankings => {
    for (let i = 0; i < Math.min(qualifiersPerGroup, rankings.length); i++) {
      qualifiedTeams.push(rankings[i].teamId);
    }
  });

  if (qualifiedTeams.length < 2) {
    throw new Error('Pelo menos 2 times qualificados são necessários para a fase eliminatória');
  }

  // Create first round matches
  let currentRound = 1;
  let currentPosition = 1;
  
  for (let i = 0; i < qualifiedTeams.length; i += 2) {
    if (i + 1 < qualifiedTeams.length) {
      matches.push({
        id: generateUUID(),
        tournamentId: '',
        eventId: '',
        round: currentRound,
        position: currentPosition++,
        team1: qualifiedTeams[i],
        team2: qualifiedTeams[i + 1],
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
      });
    }
  }

  // Generate subsequent rounds (empty matches to be filled by winners)
  let teamsInRound = Math.floor(qualifiedTeams.length / 2);
  currentRound++;
  
  while (teamsInRound > 1) {
    currentPosition = 1;
    for (let i = 0; i < Math.floor(teamsInRound / 2); i++) {
      matches.push({
        id: generateUUID(),
        tournamentId: '',
        eventId: '',
        round: currentRound,
        position: currentPosition++,
        team1: null,
        team2: null,
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
      });
    }
    
    teamsInRound = Math.floor(teamsInRound / 2);
    currentRound++;
  }

  return matches;
}

/**
 * Extrai as duplas qualificadas de cada grupo e as ordena por ranking geral
 * Seguindo as regras do Beach Tennis
 */
export function getRankedQualifiers(
  groupRankings: Record<number, GroupRanking[]>,
  qualifiersPerGroup: number = 2
): OverallRanking[] {
  const qualifiedTeams: OverallRanking[] = [];

  // Extract qualified teams from each group
  Object.entries(groupRankings).forEach(([groupNum, rankings]) => {
    const groupNumber = parseInt(groupNum);
    for (let i = 0; i < Math.min(qualifiersPerGroup, rankings.length); i++) {
      const team = rankings[i];
      qualifiedTeams.push({
        teamId: team.teamId,
        team: team.team || team.teamId.join(' & '),
        rank: 0, // Will be recalculated
        stats: {
          wins: team.stats.wins,
          losses: team.stats.losses,
          matchesPlayed: team.stats.matchesPlayed,
          gamesWon: team.stats.gamesWon,
          gamesLost: team.stats.gamesLost,
          gameDifference: team.stats.gameDifference,
          groupNumber: groupNumber,
          headToHead: team.stats.headToHead
        },
        groupNumber: groupNumber,
        groupPosition: i + 1 // Position within the group
      });
    }
  });

  // Sort qualified teams by Beach Tennis criteria for overall ranking
  qualifiedTeams.sort((a, b) => {
    // 1. Group position (1st place teams first, then 2nd place teams)
    if (a.groupPosition !== b.groupPosition) {
      return (a.groupPosition || 0) - (b.groupPosition || 0);
    }

    // 2. Within same group position, sort by Beach Tennis criteria
    // Game difference (most important)
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 3. Total games won
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 4. Fewest games lost
    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    // 5. Most wins
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    return 0;
  });

  // Assign overall ranks
  qualifiedTeams.forEach((team, index) => {
    team.rank = index + 1;
  });

  return qualifiedTeams;
}

/**
 * Calcula o ranking geral baseado em todas as partidas da fase de grupos
 * Seguindo as regras específicas do Beach Tennis
 */
export function calculateOverallGroupStageRankings(allGroupMatches: Match[]): OverallRanking[] {
  const teamStats = new Map<string, TeamStatisticsExtended>();

  // Process all group matches to build comprehensive statistics
  allGroupMatches.forEach((match) => {
    if (!match.completed || !match.team1 || !match.team2 || 
        match.score1 === null || match.score2 === null) {
      return;
    }

    const team1Key = match.team1.join(',');
    const team2Key = match.team2.join(',');

    // Initialize team statistics if not already present
    if (!teamStats.has(team1Key)) {
      teamStats.set(team1Key, {
        ...initializeTeamStats(match.team1),
        played: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }
    if (!teamStats.has(team2Key)) {
      teamStats.set(team2Key, {
        ...initializeTeamStats(match.team2),
        played: 0,
        groupNumber: match.groupNumber || 0,
        headToHead: new Map()
      });
    }

    const team1Stats = teamStats.get(team1Key)!;
    const team2Stats = teamStats.get(team2Key)!;

    // Update match statistics
    team1Stats.gamesWon += match.score1;
    team1Stats.gamesLost += match.score2;
    team1Stats.matchesPlayed += 1;
    team1Stats.played += 1;

    team2Stats.gamesWon += match.score2;
    team2Stats.gamesLost += match.score1;
    team2Stats.matchesPlayed += 1;
    team2Stats.played += 1;

    // Determine winner and update records
    if (match.score1 > match.score2) {
      team1Stats.wins += 1;
      team2Stats.losses += 1;
    } else if (match.score2 > match.score1) {
      team2Stats.wins += 1;
      team1Stats.losses += 1;
    }

    // Calculate game difference (primary Beach Tennis criterion)
    team1Stats.gameDifference = team1Stats.gamesWon - team1Stats.gamesLost;
    team2Stats.gameDifference = team2Stats.gamesWon - team2Stats.gamesLost;
  });

  // Convert to OverallRanking format with proper type casting
  const rankings: OverallRanking[] = Array.from(teamStats.values()).map(stats => ({
    teamId: stats.teamId,
    team: stats.teamId.join(' & '),
    rank: 0, // Will be assigned after sorting
    stats: {
      wins: stats.wins,
      losses: stats.losses,
      matchesPlayed: stats.matchesPlayed,
      gamesWon: stats.gamesWon,
      gamesLost: stats.gamesLost,
      gameDifference: stats.gameDifference,
      groupNumber: stats.groupNumber,
      // Cast the headToHead to the expected type
      headToHead: stats.headToHead as Map<string, { wins: number; gamesWon: number; gamesLost: number }> | undefined
    },
    groupNumber: stats.groupNumber
  }));

  // Sort by Beach Tennis criteria
  rankings.sort((a, b) => {
    // 1. Game difference (primary criterion)
    if (a.stats.gameDifference !== b.stats.gameDifference) {
      return b.stats.gameDifference - a.stats.gameDifference;
    }

    // 2. Total games won
    if (a.stats.gamesWon !== b.stats.gamesWon) {
      return b.stats.gamesWon - a.stats.gamesWon;
    }

    // 3. Fewest games lost
    if (a.stats.gamesLost !== b.stats.gamesLost) {
      return a.stats.gamesLost - b.stats.gamesLost;
    }

    // 4. Most wins
    if (a.stats.wins !== b.stats.wins) {
      return b.stats.wins - a.stats.wins;
    }

    // 5. Most matches played (for consistency in irregular groups)
    if (a.stats.matchesPlayed !== b.stats.matchesPlayed) {
      return b.stats.matchesPlayed - a.stats.matchesPlayed;
    }

    return 0;
  });

  // Assign ranks considering ties
  let currentRank = 1;
  for (let i = 0; i < rankings.length; i++) {
    if (i > 0) { // ✅ CORREÇÃO: Adicionado parênteses em volta da condição
      const current = rankings[i];
      const previous = rankings[i - 1];
      
      // Check if there's a tie in the main criteria
      const tied = (
        current.stats.wins === previous.stats.wins &&
        current.stats.gameDifference === previous.stats.gameDifference &&
        current.stats.gamesWon === previous.stats.gamesWon &&
        current.stats.gamesLost === previous.stats.gamesLost
      );
      
      if (!tied) {
        currentRank = i + 1;
      }
    }
    
    rankings[i].rank = currentRank;
  }

  return rankings;
}

/**
 * Export the function that was missing
 */
export function calculateRankingsForPlacement(
  matches: Match[],
  _placementType: 'first' | 'second' | 'third'
): OverallRanking[] {
  // Filter matches based on placement type
  const relevantMatches = matches.filter(_match => {
    // This would need specific logic based on how placements are determined
    // For now, return all matches
    return true;
  });

  return calculateOverallGroupStageRankings(relevantMatches);
}

/**
 * Atualiza o bracket eliminatório após uma partida ser completada
 * @param matches Array de todas as partidas do torneio
 * @param completedMatchId ID da partida que foi completada
 * @param winnerId ID do vencedor ('team1' ou 'team2')
 * @param winnerTeam Array com os IDs dos participantes vencedores
 * @returns Array atualizado de partidas
 */
export function updateEliminationBracket(
  matches: Match[],
  completedMatchId: string,
  _winnerId: 'team1' | 'team2',
  winnerTeam: string[]
): Match[] {
  try {
    console.log(`🔄 [updateEliminationBracket] Updating bracket after match ${completedMatchId}`);
    console.log(`🔄 [updateEliminationBracket] Winner team:`, winnerTeam);
    console.log(`🔄 [updateEliminationBracket] Total matches:`, matches.length);
    
    // Find the completed match
    const completedMatch = matches.find(m => m.id === completedMatchId);
    if (!completedMatch) {
      console.warn(`⚠️ [updateEliminationBracket] Completed match not found: ${completedMatchId}`);
      return matches;
    }
    
    // Only process elimination matches
    if (completedMatch.stage !== 'ELIMINATION') {
      console.log(`ℹ️ [updateEliminationBracket] Match is not elimination stage, skipping`);
      return matches;
    }
    
    console.log(`📊 [updateEliminationBracket] Processing elimination match - Round: ${completedMatch.round}, Position: ${completedMatch.position}`);
    
    // CORREÇÃO: Lógica específica para Beach Tennis (6 duplas)
    let nextRound: number;
    let nextPosition: number;
    
    if (completedMatch.round === 1) {
      // Quartas de final → Semifinais
      nextRound = 2;
      // QF1 (pos=1) → SF1 (pos=1), QF2 (pos=2) → SF2 (pos=2)
      nextPosition = completedMatch.position;
      console.log(`🎯 [Beach Tennis] QF${completedMatch.position} → SF${nextPosition}`);
    } else {
      // Lógica padrão para outras rodadas
      nextRound = completedMatch.round + 1;
      nextPosition = Math.ceil(completedMatch.position / 2);
      console.log(`🎯 [Standard] R${completedMatch.round}-${completedMatch.position} → R${nextRound}-${nextPosition}`);
    }
    
    console.log(`🎯 [updateEliminationBracket] Looking for next match - Round: ${nextRound}, Position: ${nextPosition}`);
    
    // Find the next match where this winner should advance
    const nextMatchIndex = matches.findIndex(m => 
      m.stage === 'ELIMINATION' && 
      m.round === nextRound && 
      m.position === nextPosition
    );
    
    if (nextMatchIndex === -1) {
      console.log(`🏆 [updateEliminationBracket] No next match found - this might be the final match`);
      console.log(`🔍 [updateEliminationBracket] Available elimination matches:`, 
        matches.filter(m => m.stage === 'ELIMINATION').map(m => ({
          id: m.id,
          round: m.round,
          position: m.position,
          team1: m.team1,
          team2: m.team2
        }))
      );
      return matches; // No next match to update (probably final)
    }
    
    const nextMatch = matches[nextMatchIndex];
    console.log(`📝 [updateEliminationBracket] Found next match: ${nextMatch.id}`);
    console.log(`📝 [updateEliminationBracket] Next match current state:`, {
      team1: nextMatch.team1,
      team2: nextMatch.team2,
      round: nextMatch.round,
      position: nextMatch.position
    });
    
    // Determine which team slot to update in the next match
    let isTeam1Slot: boolean;
    
    if (completedMatch.round === 1 && nextRound === 2) {
      // BEACH TENNIS: Vencedores das quartas sempre vão para team2 das semifinais
      // SF1: team1=1º(BYE), team2=Vencedor QF1
      // SF2: team1=2º(BYE), team2=Vencedor QF2
      isTeam1Slot = false;
      console.log(`🏐 [Beach Tennis] QF${completedMatch.position} winner → SF${nextPosition} team2`);
    } else if (completedMatch.round === 2 && nextRound === 3) {
      // BEACH TENNIS: Semifinais → Final
      // SF1 (pos=1) → Final team1, SF2 (pos=2) → Final team2
      isTeam1Slot = completedMatch.position === 1;
      console.log(`🏐 [Beach Tennis] SF${completedMatch.position} winner → Final ${isTeam1Slot ? 'team1' : 'team2'}`);
    } else {
      // Lógica padrão: posição ímpar vai para team1, par vai para team2
      isTeam1Slot = completedMatch.position % 2 === 1;
      console.log(`📋 [Standard] Position ${completedMatch.position} is ${isTeam1Slot ? 'odd' : 'even'}, will update ${isTeam1Slot ? 'team1' : 'team2'}`);
    }
    
    // Create updated matches array
    const updatedMatches = [...matches];
    const updatedNextMatch = { 
      ...nextMatch,
      updatedAt: new Date().toISOString()
    };
    
    if (isTeam1Slot) {
      updatedNextMatch.team1 = winnerTeam;
      console.log(`✅ [updateEliminationBracket] Updated team1 of match ${nextMatch.id} with winner: ${winnerTeam.join(' & ')}`);
    } else {
      updatedNextMatch.team2 = winnerTeam;
      console.log(`✅ [updateEliminationBracket] Updated team2 of match ${nextMatch.id} with winner: ${winnerTeam.join(' & ')}`);
    }
    
    updatedMatches[nextMatchIndex] = updatedNextMatch;
    
    console.log(`🔄 [updateEliminationBracket] Match ${updatedNextMatch.id} updated successfully`);
    console.log(`🔄 [updateEliminationBracket] New state:`, {
      team1: updatedNextMatch.team1,
      team2: updatedNextMatch.team2
    });
    
    return updatedMatches;
    
  } catch (error) {
    console.error('❌ [updateEliminationBracket] Error:', error);
    return matches; // Return original matches if error
  }
}

/**
 * Gera bracket eliminatório com BYE inteligente
 * VERSÃO CORRIGIDA: Implementa corretamente as regras do Beach Tennis
 */
export function generateEliminationBracketWithSmartBye(
  qualifiedTeams: OverallRanking[]
): { matches: Match[]; metadata: any } {
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const totalTeams = sortedTeams.length;
  
  console.log(`🎾 [BEACH TENNIS BRACKET] Gerando bracket para ${totalTeams} duplas qualificadas`);
  sortedTeams.forEach((team, index) => {
    console.log(`   ${index + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')} (Grupo ${team.groupNumber}, SG: ${team.stats?.gameDifference || 0})`);
  });
  
  const matches: Match[] = [];
  const metadata = {
    totalTeams,
    bracketStrategy: 'Beach Tennis Rules',
    byeTeams: [] as OverallRanking[],
    description: `Bracket eliminatório para ${totalTeams} duplas seguindo regras do Beach Tennis`
  };
  
  // Generate UUIDs for semifinals and final (shared across all scenarios)
  const sf1Id = generateUUID();
  const sf2Id = generateUUID();
  const finalId = generateUUID();

  if (totalTeams === 6) {
    // CASO ESPECÍFICO: 6 duplas classificadas (mais comum no Beach Tennis)
    console.log(`🏆 [BEACH TENNIS] Implementando bracket para 6 duplas:`);
    console.log(`   - 1º e 2º colocados: BYE direto para SEMIFINAL`);
    console.log(`   - 3º ao 6º colocados: QUARTAS DE FINAL`);
    
    const bestTwo = sortedTeams.slice(0, 2);      // 1º e 2º = BYE para semifinal
    const remainingFour = sortedTeams.slice(2, 6); // 3º ao 6º = jogam quartas
    
    metadata.byeTeams = bestTwo;
    
    // QUARTAS DE FINAL (Round 1): 3º vs 6º, 4º vs 5º
    console.log(`⚔️ [QUARTAS] Criando quartas de final:`);
    
    // QF1: 3º vs 6º colocado
    const qf1 = createMatchWithNextMatch(
      remainingFour[0].teamId,  // 3º colocado
      remainingFour[3].teamId,  // 6º colocado  
      1, 1, sf1Id
    );
    matches.push(qf1);
    console.log(`   QF1: ${remainingFour[0].rank}º vs ${remainingFour[3].rank}º → SF1`);
    
    // QF2: 4º vs 5º colocado  
    const qf2 = createMatchWithNextMatch(
      remainingFour[1].teamId,  // 4º colocado
      remainingFour[2].teamId,  // 5º colocado
      1, 2, sf2Id
    );
    matches.push(qf2);
    console.log(`   QF2: ${remainingFour[1].rank}º vs ${remainingFour[2].rank}º → SF2`);
    
    // SEMIFINAIS (Round 2): 1º vs Vencedor QF1, 2º vs Vencedor QF2
    console.log(`🏆 [SEMIFINAIS] Criando semifinais com BYEs pré-alocados:`);
    
    // SF1: 1º colocado (BYE) vs Vencedor QF1
    const sf1 = createMatchWithNextMatch(
      bestTwo[0].teamId,        // 1º colocado (BYE)
      ['WINNER_QF1', 'WINNER_QF1_PARTNER'],           // Vencedor da QF1 (2 elementos)
      2, 1, finalId
    );
    sf1.id = sf1Id;
    matches.push(sf1);
    console.log(`   SF1: ${bestTwo[0].rank}º (BYE) vs Vencedor QF1 → FINAL`);
    
    // SF2: 2º colocado (BYE) vs Vencedor QF2
    const sf2 = createMatchWithNextMatch(
      bestTwo[1].teamId,        // 2º colocado (BYE)
      ['WINNER_QF2', 'WINNER_QF2_PARTNER'],           // Vencedor da QF2 (2 elementos)
      2, 2, finalId
    );
    sf2.id = sf2Id;
    matches.push(sf2);
    console.log(`   SF2: ${bestTwo[1].rank}º (BYE) vs Vencedor QF2 → FINAL`);
    
    // FINAL (Round 3): Vencedor SF1 vs Vencedor SF2
    const final = createMatch(['WINNER_SF1', 'WINNER_SF1_PARTNER'], ['WINNER_SF2', 'WINNER_SF2_PARTNER'], 3, 1);
    final.id = finalId;
    matches.push(final);
    console.log(`🥇 [FINAL] Vencedor SF1 vs Vencedor SF2`);
    
  } else if (totalTeams === 8) {
    // CASO: 8 duplas classificadas (bracket completo)
    console.log(`⚔️ [BEACH TENNIS] Implementando bracket completo para 8 duplas (sem BYEs)`);
    
    // QUARTAS DE FINAL (Round 1): 1º vs 8º, 2º vs 7º, 3º vs 6º, 4º vs 5º
    for (let i = 0; i < 4; i++) {
      const topTeam = sortedTeams[i];
      const bottomTeam = sortedTeams[7 - i];
      
      const qf = createMatchWithNextMatch(
        topTeam.teamId,
        bottomTeam.teamId,
        1, i + 1, `${Math.floor(i / 2) === 0 ? sf1Id : sf2Id}`
      );
      matches.push(qf);
      console.log(`   QF${i + 1}: ${topTeam.rank}º vs ${bottomTeam.rank}º → SF${Math.floor(i / 2) + 1}`);
    }
    
    // SEMIFINAIS (Round 2)
    const sf1 = createMatchWithNextMatch(['WINNER_QF1'], ['WINNER_QF2'], 2, 1, finalId);
    sf1.id = sf1Id;
    matches.push(sf1);
    
    const sf2 = createMatchWithNextMatch(['WINNER_QF3'], ['WINNER_QF4'], 2, 2, finalId);
    sf2.id = sf2Id;
    matches.push(sf2);
    
    // FINAL (Round 3)
    const final = createMatch(['WINNER_SF1'], ['WINNER_SF2'], 3, 1);
    final.id = finalId;
    matches.push(final);
    
  } else {
    // OUTROS CASOS: Implementar lógica genérica mantendo princípios do Beach Tennis
    console.log(`🎾 [BEACH TENNIS] Implementando bracket genérico para ${totalTeams} duplas`);
    
    const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
    const byesNeeded = nextPowerOf2 - totalTeams;
    const teamsWithByes = sortedTeams.slice(0, byesNeeded);
    const teamsWithoutByes = sortedTeams.slice(byesNeeded);
    
    metadata.byeTeams = teamsWithByes;
    
    // Primeira rodada: apenas times sem BYE
    if (teamsWithoutByes.length >= 2) {
      const pairings = generateOptimalPairings(teamsWithoutByes);
      let position = 1;
      
      pairings.forEach((pair) => {
        const match = createMatch(pair[0].teamId, pair[1].teamId, 1, position++);
        matches.push(match);
        console.log(`⚔️ R1-${match.position}: ${pair[0].rank}º vs ${pair[1].rank}º`);
      });
    }
    
    // Gerar rodadas subsequentes com BYEs pré-alocados
    // Gerar as próximas rodadas (Semifinal e Final)
    generateAdvancementRounds(matches, teamsWithByes.length + Math.floor(teamsWithoutByes.length / 2), 2);
    
    // Pré-alocar times com BYE nas semifinais
    populateByeAdvancements(matches.filter(m => m.round === 2), teamsWithByes);
  }
  
  console.log(`🏆 [BEACH TENNIS BRACKET] Finalizado: ${matches.length} partidas total`);
  console.log(`📋 Estrutura: ${matches.filter(m => m.round === 1).length} QF + ${matches.filter(m => m.round === 2).length} SF + ${matches.filter(m => m.round === 3).length} Final`);
  
  return { matches, metadata };
}

/**
 * Cria uma partida com referência para a próxima partida (nextMatchId)
 */
function createMatchWithNextMatch(
  team1: string[], 
  team2: string[], 
  round: number, 
  position: number, 
  nextMatchId: string
): Match {
  return {
    id: generateUUID(),
    team1,
    team2,
    round,
    position,
    score1: null,
    score2: null,
    completed: false,
    winnerId: null,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    eventId: '',
    tournamentId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nextMatchId
  } as Match & { nextMatchId: string };
}

/**
 * Pré-popula times que receberam BYE na segunda rodada
 */
function populateByeAdvancements(matches: Match[], teamsWithByes: OverallRanking[]): void {
  teamsWithByes.forEach((team, index) => {
    if (index < matches.length) {
      const targetMatch = matches[index];
      
      if (targetMatch.team1 && targetMatch.team1.includes('TBD')) {
        targetMatch.team1 = team.teamId;
        console.log(`🎯 [BYE_ADVANCE] ${team.teamId.join(' & ')} pré-alocado na R2-${targetMatch.position} (team1)`);
      } else if (targetMatch.team2 && targetMatch.team2.includes('TBD')) {
        targetMatch.team2 = team.teamId;
        console.log(`🎯 [BYE_ADVANCE] ${team.teamId.join(' & ')} pré-alocado na R2-${targetMatch.position} (team2)`);
      }
    }
  });
}

/**
 * Gera rodadas de avanço com número correto de partidas
 */
function generateAdvancementRounds(matches: Match[], currentRoundTeams: number, startRound: number = 2): void {
  let round = startRound;
  let teamsInRound = currentRoundTeams;
  
  while (teamsInRound > 1) {
    const matchesInRound = Math.floor(teamsInRound / 2);
    
    for (let i = 0; i < matchesInRound; i++) {
      const match = createMatch(['TBD'], ['TBD'], round, i + 1);
      matches.push(match);
    }
    
    teamsInRound = matchesInRound;
    round++;
  }
}

/**
 * Gera confrontos otimizados respeitando ranking e evitando mesmo grupo
 */
function generateOptimalPairings(teams: OverallRanking[]): [OverallRanking, OverallRanking][] {
  const pairs: [OverallRanking, OverallRanking][] = [];
  const used = new Set<number>();
  const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);
  
  for (let i = 0; i < sortedTeams.length && used.size < sortedTeams.length; i++) {
    if (used.has(i)) continue;
    
    const bestTeam = sortedTeams[i];
    let worstTeamIndex = findOptimalOpponent(sortedTeams, i, used);
    
    if (worstTeamIndex !== -1) {
      const worstTeam = sortedTeams[worstTeamIndex];
      pairs.push([bestTeam, worstTeam]);
      used.add(i);
      used.add(worstTeamIndex);
    }
  }
  
  return pairs;
}

/**
 * Encontra o melhor oponente para uma dupla (preferindo grupos diferentes)
 */
function findOptimalOpponent(teams: OverallRanking[], currentIndex: number, used: Set<number>): number {
  const currentTeam = teams[currentIndex];
  
  // Primeiro: tentar encontrar do final da lista (afunilamento) de grupo diferente
  for (let i = teams.length - 1; i > currentIndex; i--) {
    if (!used.has(i) && teams[i].groupNumber !== currentTeam.groupNumber) {
      return i;
    }
  }
  
  // Segundo: qualquer disponível do final (afunilamento)
  for (let i = teams.length - 1; i > currentIndex; i--) {
    if (!used.has(i)) {
      return i;
    }
  }
  
  // Terceiro: próximo disponível
  for (let i = currentIndex + 1; i < teams.length; i++) {
    if (!used.has(i)) {
      return i;
    }
  }
  
  return -1;
}

/**
 * Cria uma partida com estrutura padrão
 */
function createMatch(team1: string[], team2: string[], round: number, position: number): Match {
  return {
    id: generateUUID(),
    team1,
    team2,
    round,
    position,
    score1: null,
    score2: null,
    completed: false,
    winnerId: null,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    eventId: '',
    tournamentId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Detecta empates no ranking geral que podem impactar a classificação
 */
export function detectTieBreaksInRanking(
  rankings: OverallRanking[],
  qualificationCutoff: number
): { 
  hasTieBreaks: boolean; 
  tiedTeams: OverallRanking[]; 
  affectsQualification: boolean 
} {
  const tiedTeams: OverallRanking[] = [];
  
  // Procurar por empates que afetam a linha de classificação
  for (let i = 0; i < rankings.length - 1; i++) {
    const current = rankings[i];
    const next = rankings[i + 1];
    
    // Verificar se estão empatados pelos critérios principais
    const areTied = (
      current.stats.gameDifference === next.stats.gameDifference &&
      current.stats.gamesWon === next.stats.gamesWon &&
      current.stats.gamesLost === next.stats.gamesLost &&
      current.stats.wins === next.stats.wins
    );
    
    if (areTied) {
      // Adicionar ambos os times empatados se ainda não estão na lista
      if (!tiedTeams.some(t => t.teamId.join('|') === current.teamId.join('|'))) {
        tiedTeams.push(current);
      }
      if (!tiedTeams.some(t => t.teamId.join('|') === next.teamId.join('|'))) {
        tiedTeams.push(next);
      }
    }
  }
  
  // Verificar se o empate afeta a classificação
  const affectsQualification = tiedTeams.some((team) => {
    const teamPosition = rankings.findIndex(r => r.teamId.join('|') === team.teamId.join('|')) + 1;
    return teamPosition <= qualificationCutoff + 1 && teamPosition >= qualificationCutoff - 1;
  });
  
  return {
    hasTieBreaks: tiedTeams.length > 0,
    tiedTeams: tiedTeams.sort((a, b) => a.rank - b.rank),
    affectsQualification
  };
}

/**
 * Remove uma dupla do ranking geral e recalcula as posições
 */
export function removeTeamFromRanking(
  rankings: OverallRanking[],
  teamToRemove: OverallRanking
): OverallRanking[] {
  const updatedRankings = rankings.filter(
    team => team.teamId.join('|') !== teamToRemove.teamId.join('|')
  );
  
  // Recalcular ranks
  updatedRankings.forEach((team, index) => {
    team.rank = index + 1;
  });
  
  return updatedRankings;
}

/**
 * Verifica se uma partida é um BYE (um dos times está ausente/null)
 */
export function hasBye(match: Match): boolean {
  return !match.team1 || !match.team2 || 
         match.team1.length === 0 || match.team2.length === 0 ||
         match.team1.includes('BYE') || match.team2.includes('BYE');
}

/**
 * Retorna o time que avança automaticamente em uma partida BYE
 */
export function getByeAdvancingTeam(match: Match): string[] | null {
  if (!hasBye(match)) {
    return null;
  }
  
  // Se team1 está presente e team2 não, team1 avança
  if (match.team1 && match.team1.length > 0 && !match.team1.includes('BYE')) {
    if (!match.team2 || match.team2.length === 0 || match.team2.includes('BYE')) {
      return match.team1;
    }
  }
  
  // Se team2 está presente e team1 não, team2 avança
  if (match.team2 && match.team2.length > 0 && !match.team2.includes('BYE')) {
    if (!match.team1 || match.team1.length === 0 || match.team1.includes('BYE')) {
      return match.team2;
    }
  }
  
  return null;
}

/**
 * Processa automaticamente todas as partidas BYE e avança os times qualificados
 * @param matches Array de partidas do torneio
 * @returns Array atualizado com BYEs processados
 */
export function processAllByes(matches: Match[]): Match[] {
  const updatedMatches = [...matches];
  let hasChanges = true;
  
  // Loop até que não haja mais BYEs para processar
  while (hasChanges) {
    hasChanges = false;
    
    for (let i = 0; i < updatedMatches.length; i++) {
      const match = updatedMatches[i];
      
      // Verificar se é um BYE não processado
      if (hasBye(match) && !match.completed) {
        const advancingTeam = getByeAdvancingTeam(match);
        
        if (advancingTeam) {
          console.log(`🚀 [BYE] Processando BYE - ${advancingTeam.join(' & ')} avança automaticamente`);
          
          // Marcar partida como completada
          updatedMatches[i] = {
            ...match,
            completed: true,
            winnerId: match.team1 && match.team1.length > 0 && !match.team1.includes('BYE') ? 'team1' : 'team2',
            score1: match.team1 && match.team1.length > 0 && !match.team1.includes('BYE') ? 1 : 0,
            score2: match.team2 && match.team2.length > 0 && !match.team2.includes('BYE') ? 1 : 0,
            updatedAt: new Date().toISOString()
          };
          
          // Avançar time para próxima rodada
          const updatedMatchesAfterAdvance = updateEliminationBracket(
            updatedMatches,
            match.id,
            match.team1 && match.team1.length > 0 && !match.team1.includes('BYE') ? 'team1' : 'team2',
            advancingTeam
          );
          
          // Atualizar array se houve mudanças
          if (updatedMatchesAfterAdvance !== updatedMatches) {
            updatedMatches.splice(0, updatedMatches.length, ...updatedMatchesAfterAdvance);
            hasChanges = true;
            break; // Reiniciar loop para verificar novos BYEs
          }
        }
      }
    }
  }
  
  return updatedMatches;
}

/**
 * Cria uma partida BYE explícita com time beneficiado
 * @param benefitedTeam Time que recebe o BYE
 * @param round Rodada da partida
 * @param position Posição na rodada
 * @returns Partida configurada como BYE
 */
export function createByeMatch(
  benefitedTeam: string[],
  round: number,
  position: number
): Match {
  return {
    id: generateUUID(),
    team1: benefitedTeam,
    team2: [], // Array vazio indica BYE
    round,
    position,
    score1: null,
    score2: null,
    completed: false,
    winnerId: null,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    eventId: '',
    tournamentId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Verifica se um bracket tem BYEs pendentes de processamento
 * @param matches Array de partidas
 * @returns True se há BYEs não processados
 */
export function hasPendingByes(matches: Match[]): boolean {
  return matches.some(match => hasBye(match) && !match.completed);
}

/**
 * Obtém estatísticas detalhadas sobre BYEs em um bracket
 * @param matches Array de partidas do torneio
 * @returns Informações detalhadas sobre BYEs
 */
export function getByeStatistics(matches: Match[]): {
  totalByes: number;
  processedByes: number;
  pendingByes: number;
  byeMatches: Match[];
  teamsWithByes: string[][];
} {
  const byeMatches = matches.filter(match => hasBye(match));
  const processedByes = byeMatches.filter(match => match.completed);
  const pendingByes = byeMatches.filter(match => !match.completed);
  
  const teamsWithByes: string[][] = [];
  byeMatches.forEach(match => {
    const advancingTeam = getByeAdvancingTeam(match);
    if (advancingTeam && !teamsWithByes.some(team => 
      team.join('|') === advancingTeam.join('|')
    )) {
      teamsWithByes.push(advancingTeam);
    }
  });
  
  return {
    totalByes: byeMatches.length,
    processedByes: processedByes.length,
    pendingByes: pendingByes.length,
    byeMatches,
    teamsWithByes
  };
}

/**
 * Função utilitária para debug - mostra estrutura do bracket com BYEs
 * @param matches Array de partidas
 */
export function debugBracketStructure(matches: Match[]): void {
  console.log('\n🔍 [DEBUG] Estrutura do Bracket:');
  
  const rounds = new Map<number, Match[]>();
  matches.forEach(match => {
    if (!rounds.has(match.round)) {
      rounds.set(match.round, []);
    }
    rounds.get(match.round)!.push(match);
  });
  
  rounds.forEach((roundMatches, roundNumber) => {
    console.log(`\n📋 Rodada ${roundNumber}:`);
    roundMatches
      .sort((a, b) => a.position - b.position)
      .forEach(match => {
        const team1 = match.team1?.join(' & ') || 'TBD';
        const team2 = match.team2?.join(' & ') || 'TBD';
        const isBye = hasBye(match);
        const status = match.completed ? '✅' : '⏳';
        const byeFlag = isBye ? '🚀 BYE' : '';
        
        console.log(`  ${status} R${roundNumber}-${match.position}: ${team1} vs ${team2} ${byeFlag}`);
      });
  });
  
  const byeStats = getByeStatistics(matches);
  console.log(`\n📊 Estatísticas BYE:`);
  console.log(`  Total: ${byeStats.totalByes}`);
  console.log(`  Processados: ${byeStats.processedByes}`);
  console.log(`  Pendentes: ${byeStats.pendingByes}`);
  console.log(`  Times beneficiados: ${byeStats.teamsWithByes.map(t => t.join(' & ')).join(', ')}`);
}

// ===================================================================
// FUNÇÕES ADICIONAIS PARA LÓGICA ROBUSTA DE TORNEIO
// ===================================================================

// Função para processar automaticamente todos os BYEs
export function processAllByesAdvanced(matches: Match[]): Match[] {
  console.log('🔄 Processando BYEs automaticamente...');
  let updatedMatches = [...matches];
  let processedCount = 0;
  
  // Continuar processando BYEs até que não haja mais para processar
  let foundBye = true;
  while (foundBye) {
    foundBye = false;
    
    for (const match of updatedMatches) {
      if (hasBye(match) && !match.completed) {
        const winnerTeam = match.team1 || match.team2;
        if (winnerTeam) {
          match.completed = true;
          match.winnerId = match.team1 ? 'team1' : 'team2';
          match.score1 = match.team1 ? 1 : 0;
          match.score2 = match.team2 ? 1 : 0;
          
          // Avançar o vencedor para a próxima rodada
          const nextMatch = findNextMatch(updatedMatches, match);
          if (nextMatch) {
            const isOddPosition = match.position % 2 === 1;
            if (isOddPosition) {
              nextMatch.team1 = winnerTeam;
            } else {
              nextMatch.team2 = winnerTeam;
            }
          }
          
          processedCount++;
          foundBye = true;
          console.log(`✅ BYE processado: ${winnerTeam.join(' & ')} avança automaticamente`);
        }
      }
    }
  }
  
  console.log(`✅ ${processedCount} BYEs processados automaticamente`);
  return updatedMatches;
}

// Função para limpar partidas fantasma (TBD vs TBD)
export function cleanPhantomMatchesAdvanced(matches: Match[]): Match[] {
  console.log('🧹 Limpando partidas fantasma...');
  
  const validMatches = matches.filter(match => {
    // Manter partidas que têm pelo menos um time válido
    const hasValidTeam1 = match.team1 && match.team1.length > 0 && !match.team1.some(id => id.includes('TBD'));
    const hasValidTeam2 = match.team2 && match.team2.length > 0 && !match.team2.some(id => id.includes('TBD'));
    
    // Manter se tem pelo menos um time válido OU se já foi completada
    const shouldKeep = hasValidTeam1 || hasValidTeam2 || match.completed;
    
    if (!shouldKeep) {
      console.log(`🗑️ Removendo partida fantasma: ${match.team1} vs ${match.team2}`);
    }
    
    return shouldKeep;
  });
  
  console.log(`✅ ${matches.length - validMatches.length} partidas fantasma removidas`);
  return validMatches;
}

// Função auxiliar para encontrar a próxima partida (removida nextMatchId por ora)
function findNextMatch(matches: Match[], currentMatch: Match): Match | null {
  // Lógica para encontrar próxima partida baseada na posição e rodada
  const nextRound = currentMatch.round + 1;
  const nextPosition = Math.ceil(currentMatch.position / 2);
  
  return matches.find(m => m.round === nextRound && m.position === nextPosition) || null;
}

// Função para determinar o stage de uma partida baseado em suas propriedades
export function determineMatchStage(match: any): 'GROUP' | 'ELIMINATION' {
  // Se tem group_number válido (>0), é fase de grupos
  if (match.groupNumber > 0 || (match.group_number && match.group_number > 0)) {
    return 'GROUP';
  }
  
  // Se tem round > 0 mas não tem group_number, é eliminação
  if ((match.round > 0 || match.round_number > 0) && !match.groupNumber && !match.group_number) {
    return 'ELIMINATION';
  }
  
  // Se já tem stage definido, usar
  if (match.stage === 'ELIMINATION' || match.stage === 'GROUP') {
    return match.stage;
  }
  
  // Padrão: GROUP
  return 'GROUP';
}

// Função para salvar partida na coluna JSONB apropriada
export async function saveMatchByStage(match: Match): Promise<void> {
  const { supabase } = await import('../lib/supabase');
  
  try {
    console.log(`💾 Salvando partida ${match.id} (stage: ${match.stage}) no banco de dados...`);
    
    // Buscar dados atuais do torneio
    const { data: tournament, error: fetchError } = await supabase
      .from('tournaments')
      .select('matches_data, standings_data, elimination_bracket')
      .eq('id', match.tournamentId)
      .single();
    
    if (fetchError) {
      throw new Error(`Erro ao buscar torneio: ${fetchError.message}`);
    }
    
    if (!tournament) {
      throw new Error('Torneio não encontrado');
    }
    
    // Preparar dados atualizados baseado no stage
    let updateData: any = {};
    
    if (match.stage === 'GROUP') {
      // Atualizar standings_data (partidas de grupo)
      const standingsData = Array.isArray(tournament.standings_data) ? tournament.standings_data : [];
      const matchIndex = standingsData.findIndex((m: any) => m.id === match.id);
      
      if (matchIndex >= 0) {
        standingsData[matchIndex] = match;
      } else {
        standingsData.push(match);
      }
      
      updateData.standings_data = standingsData;
      
      // Também atualizar matches_data para compatibilidade
      const matchesData = Array.isArray(tournament.matches_data) ? tournament.matches_data : [];
      const allMatchIndex = matchesData.findIndex((m: any) => m.id === match.id);
      
      if (allMatchIndex >= 0) {
        matchesData[allMatchIndex] = match;
      } else {
        matchesData.push(match);
      }
      
      updateData.matches_data = matchesData;
      
    } else if (match.stage === 'ELIMINATION') {
      // Atualizar elimination_bracket (partidas eliminatórias)
      let eliminationBracket = tournament.elimination_bracket;
      
      // Verificar se é formato com metadata ou array simples
      let eliminationMatches: Match[];
      let metadata: any = null;
      
      if (Array.isArray(eliminationBracket)) {
        eliminationMatches = eliminationBracket;
      } else if (eliminationBracket && typeof eliminationBracket === 'object' && eliminationBracket.matches) {
        eliminationMatches = eliminationBracket.matches;
        metadata = eliminationBracket.metadata;
      } else {
        eliminationMatches = [];
      }
      
      const matchIndex = eliminationMatches.findIndex((m: any) => m.id === match.id);
      
      if (matchIndex >= 0) {
        eliminationMatches[matchIndex] = match;
      } else {
        eliminationMatches.push(match);
      }
      
      // Manter formato original
      if (metadata) {
        updateData.elimination_bracket = {
          matches: eliminationMatches,
          metadata: metadata,
          generatedAt: new Date().toISOString()
        };
      } else {
        updateData.elimination_bracket = eliminationMatches;
      }
      
      // Também atualizar matches_data para compatibilidade
      const matchesData = Array.isArray(tournament.matches_data) ? tournament.matches_data : [];
      const allMatchIndex = matchesData.findIndex((m: any) => m.id === match.id);
      
      if (allMatchIndex >= 0) {
        matchesData[allMatchIndex] = match;
      } else {
        matchesData.push(match);
      }
      
      updateData.matches_data = matchesData;
    }
    
    // Adicionar timestamp de atualização
    updateData.updated_at = new Date().toISOString();
    
    // Executar update no banco
    const { error: updateError } = await supabase
      .from('tournaments')
      .update(updateData)
      .eq('id', match.tournamentId);
    
    if (updateError) {
      throw new Error(`Erro ao salvar partida: ${updateError.message}`);
    }
    
    console.log(`✅ Partida ${match.id} salva com sucesso na coluna ${match.stage === 'GROUP' ? 'standings_data' : 'elimination_bracket'}`);
    
  } catch (error) {
    console.error(`❌ Erro ao salvar partida ${match.id}:`, error);
    throw error;
  }
}