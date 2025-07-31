// CORREÇÃO DO SISTEMA DE BRACKET ELIMINATÓRIO
// Este arquivo contém a versão corrigida das funções que estão causando problemas

import type { Match, OverallRanking } from '../types';

/**
 * EXPLICAÇÃO DOS PROBLEMAS IDENTIFICADOS:
 * 
 * 1. TBDs DESNECESSÁRIOS:
 *    - A função `generateEmptyRounds()` cria partidas com arrays vazios []
 *    - Isso faz com que apareçam como "TBD" na interface
 *    - Solução: Usar placeholders específicos e pré-alocar times que receberam BYE
 * 
 * 2. PARTIDAS DUPLICADAS:
 *    - O sistema atual cria BYEs explícitos + partidas normais + rodadas vazias
 *    - Depois processa BYEs, criando inconsistências
 *    - Solução: Separar lógica de bracket completo vs bracket com BYEs
 * 
 * 3. LÓGICA DE AVANÇO INCORRETA:
 *    - processAllByes() executa após criar todas as rodadas
 *    - Isso causa duplicação e estrutura incorreta
 *    - Solução: Pré-alocar times com BYE diretamente na segunda rodada
 */

/**
 * Função utilitária para gerar UUID (versão simples)
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Gera bracket eliminatório com BYE inteligente
 * VERSÃO CORRIGIDA - Sem partidas duplicadas ou TBDs desnecessários
 */
export function generateEliminationBracketWithSmartBye(
  qualifiedTeams: OverallRanking[]
): { matches: Match[]; metadata: any } {
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const totalTeams = sortedTeams.length;
  
  console.log(`🎾 [SMART BYE] Gerando bracket com ${totalTeams} duplas`);
  
  // Determinar estrutura do bracket
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const byesNeeded = nextPowerOf2 - totalTeams;
  
  const metadata = {
    totalTeams,
    bracketSize: nextPowerOf2,
    byesNeeded,
    teamsWithByes: sortedTeams.slice(0, byesNeeded),
    bracketStructure: `${totalTeams} teams → ${nextPowerOf2} bracket (${byesNeeded} BYEs)`,
    byeStrategy: 'Os melhores times recebem BYE automático para a próxima rodada'
  };
  
  console.log(`📊 [SMART BYE] Bracket ${nextPowerOf2} - ${byesNeeded} BYEs para as melhores duplas`);
  
  if (byesNeeded === 0) {
    // Bracket completo sem BYEs - sistema tradicional
    console.log(`✅ [SMART BYE] Bracket completo sem BYEs necessários`);
    return generateCompleteBracket(sortedTeams, metadata);
    
  } else {
    // Bracket com BYEs - sistema otimizado
    console.log(`⭐ [SMART BYE] Implementando ${byesNeeded} BYEs na estrutura`);
    return generateBracketWithByes(sortedTeams, byesNeeded, metadata);
  }
}

/**
 * Gera bracket completo sem BYEs (potência de 2 perfeita)
 */
function generateCompleteBracket(
  sortedTeams: OverallRanking[], 
  metadata: any
): { matches: Match[]; metadata: any } {
  const matches: Match[] = [];
  const pairings = generateOptimalPairings(sortedTeams);
  
  // Criar primeira rodada com confrontos diretos
  pairings.forEach((pair, index) => {
    const match = createMatch(pair[0].teamId, pair[1].teamId, 1, index + 1);
    matches.push(match);
    console.log(`⚔️ [COMPLETE] R1-${match.position}: ${pair[0].rank}º vs ${pair[1].rank}º`);
  });
  
  // Gerar rodadas subsequentes com estrutura correta
  generateAdvancementRounds(matches, pairings.length);
  
  console.log(`🏆 [COMPLETE] Bracket finalizado: ${matches.length} partidas total`);
  return { matches, metadata };
}

/**
 * Gera bracket com BYEs otimizado (evita TBDs desnecessários)
 * CORRIGIDO: Implementa lógica correta de Beach Tennis
 */
function generateBracketWithByes(
  sortedTeams: OverallRanking[], 
  byesNeeded: number, 
  metadata: any
): { matches: Match[]; metadata: any } {
  const matches: Match[] = [];
  
  const teamsWithByes = sortedTeams.slice(0, byesNeeded);
  const teamsWithoutByes = sortedTeams.slice(byesNeeded);
  
  // Log das duplas com BYE
  console.log(`🏆 [BYE] Duplas que recebem BYE direto para semifinal:`);
  teamsWithByes.forEach((team, teamIndex) => {
    console.log(`   ${teamIndex + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')} (Grupo ${team.groupNumber}, SG: ${team.stats?.gameDifference || 0})`);
  });
  
  console.log(`⚔️ [QUARTERFINALS] Duplas que jogam nas quartas de final:`);
  teamsWithoutByes.forEach((team, teamIndex) => {
    console.log(`   ${teamIndex + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')} (Grupo ${team.groupNumber}, SG: ${team.stats?.gameDifference || 0})`);
  });
  
  // BEACH TENNIS LOGIC: Para 6 duplas classificadas
  // - 2 melhores duplas recebem BYE direto para SEMIFINAL
  // - 4 duplas restantes jogam QUARTAS DE FINAL
  // - Vencedores das quartas enfrentam as duplas com BYE nas SEMIFINAIS
  
  let position = 1;
  
  // 1. Criar QUARTAS DE FINAL apenas para duplas sem BYE
  if (teamsWithoutByes.length >= 2) {
    const quarterfinalPairs = generateOptimalPairings(teamsWithoutByes);
    
    console.log(`🎯 [QUARTERFINALS] Criando ${quarterfinalPairs.length} partida(s) das quartas de final:`);
    quarterfinalPairs.forEach((pair, index) => {
      const match = createMatch(pair[0].teamId, pair[1].teamId, 1, position++);
      match.stage = 'ELIMINATION';
      matches.push(match);
      console.log(`   QF${index + 1}: ${pair[0].rank}º (${pair[0].teamId.join(' & ')}) vs ${pair[1].rank}º (${pair[1].teamId.join(' & ')})`);
    });
  }
  
  // 2. Criar SEMIFINAIS com structure correta
  const quarterfinalsCount = Math.floor(teamsWithoutByes.length / 2);
  const semifinalCount = quarterfinalsCount + byesNeeded; // Vencedores das QF + BYEs
  
  console.log(`🏆 [SEMIFINALS] Criando ${Math.floor(semifinalCount / 2)} partida(s) da semifinal:`);
  
  // Semifinal 1: 1º colocado (BYE) vs Vencedor QF1
  if (teamsWithByes.length > 0 && quarterfinalsCount > 0) {
    const semi1 = createMatch(teamsWithByes[0].teamId, ['WINNER_QF1'], 2, 1);
    matches.push(semi1);
    console.log(`   SF1: ${teamsWithByes[0].rank}º (BYE) vs Vencedor QF1`);
  }
  
  // Semifinal 2: 2º colocado (BYE) vs Vencedor QF2  
  if (teamsWithByes.length > 1 && quarterfinalsCount > 1) {
    const semi2 = createMatch(teamsWithByes[1].teamId, ['WINNER_QF2'], 2, 2);
    matches.push(semi2);
    console.log(`   SF2: ${teamsWithByes[1].rank}º (BYE) vs Vencedor QF2`);
  }
  
  // 3. Criar FINAL
  const final = createMatch(['WINNER_SF1'], ['WINNER_SF2'], 3, 1);
  matches.push(final);
  console.log(`🥇 [FINAL] Vencedor SF1 vs Vencedor SF2`);
  
  console.log(`🏆 [WITH_BYES] Bracket finalizado: ${matches.length} partidas total`);
  console.log(`   - ${quarterfinalsCount} Quartas de Final`);
  console.log(`   - ${Math.floor(semifinalCount / 2)} Semifinais`);
  console.log(`   - 1 Final`);
  
  return { matches, metadata };
}

/**
 * Gera rodadas de avanço com número correto de partidas (substitui generateEmptyRounds)
 */
function generateAdvancementRounds(matches: Match[], currentRoundTeams: number, startRound: number = 2): void {
  let round = startRound;
  let teamsInRound = currentRoundTeams;
  
  while (teamsInRound > 1) {
    const matchesInRound = Math.floor(teamsInRound / 2);
    
    for (let i = 0; i < matchesInRound; i++) {
      // CORRIGIDO: Criar partidas com placeholders específicos ao invés de arrays vazios
      const match = createMatch(['TBD'], ['TBD'], round, i + 1);
      matches.push(match);
      console.log(`🔄 [ADVANCE] R${round}-${i + 1}: Aguardando definição de confronto`);
    }
    
    teamsInRound = matchesInRound;
    round++;
  }
}

/**
 * Pré-popula times que receberam BYE na segunda rodada
 */
function populateByeAdvancments(matches: Match[], teamsWithByes: OverallRanking[]): void {
  const secondRoundMatches = matches.filter(m => m.round === 2);
  
  teamsWithByes.forEach((team, index) => {
    if (index < secondRoundMatches.length) {
      const targetMatch = secondRoundMatches[index];
      
      // Preencher primeiro slot disponível, verificando se não é null
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
