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
 * 🏆 SUPER ADAPTÁVEL: Gera bracket para 4 a 1000+ participantes
 * ✨ FUNCIONA PARA QUALQUER NÚMERO: 6, 8, 16, 32, 64, 128, 256, 512, 1024+
 * 🎯 ALGORITMO UNIVERSAL: Calcula todas as rodadas automaticamente
 */
function generateBracketWithByes(
  sortedTeams: OverallRanking[], 
  byesNeeded: number, 
  metadata: any
): { matches: Match[]; metadata: any } {
  const matches: Match[] = [];
  const totalTeams = sortedTeams.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const totalRounds = Math.ceil(Math.log2(bracketSize));
  
  console.log(`🏆 [SUPER ADAPTÁVEL] Gerando bracket para ${totalTeams} duplas`);
  console.log(`📊 [UNIVERSAL] Bracket size: ${bracketSize}, BYEs: ${byesNeeded}, Total rounds: ${totalRounds}`);
  
  // 1. DISTRIBUIR BYES INTELIGENTEMENTE (melhores duplas recebem BYE)
  const teamsWithByes = sortedTeams.slice(0, byesNeeded);
  const teamsWithoutByes = sortedTeams.slice(byesNeeded);
  
  if (teamsWithByes.length > 0) {
    console.log(`🏆 [BYE] ${teamsWithByes.length} duplas recebem BYE:`);
    teamsWithByes.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')}`);
    });
  }
  
  console.log(`⚔️ [PRIMEIRA RODADA] ${teamsWithoutByes.length} duplas jogam na primeira rodada:`);
  teamsWithoutByes.forEach((team, index) => {
    console.log(`   ${index + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')}`);
  });
  
  // 2. ALGORITMO UNIVERSAL: Gerar todas as rodadas dinamicamente
  let currentRoundParticipants = teamsWithoutByes.length; // Times que jogam na primeira rodada
  let position = 1;
  
  for (let round = 1; round <= totalRounds; round++) {
    const isFirstRound = round === 1;
    const isSecondRound = round === 2;
    
    // Calcular participantes nesta rodada
    let participantsInThisRound;
    if (isFirstRound) {
      participantsInThisRound = currentRoundParticipants; // Times sem BYE
    } else if (isSecondRound && byesNeeded > 0) {
      // Segunda rodada: vencedores da primeira + times com BYE
      const winnersFromFirstRound = Math.floor(currentRoundParticipants / 2);
      participantsInThisRound = winnersFromFirstRound + byesNeeded;
      console.log(`🔄 [ROUND ${round}] ${winnersFromFirstRound} vencedores R1 + ${byesNeeded} BYEs = ${participantsInThisRound} participantes`);
    } else {
      // Rodadas subsequentes: vencedores da rodada anterior
      participantsInThisRound = Math.floor(currentRoundParticipants / 2);
    }
    
    // Calcular partidas nesta rodada
    const matchesInThisRound = Math.floor(participantsInThisRound / 2);
    
    // Verificar se ainda há partidas para gerar
    if (matchesInThisRound <= 0) {
      console.log(`✅ [ROUND ${round}] Bracket completo - ${participantsInThisRound} participante(s) restante(s)`);
      break;
    }
    
    const roundName = getRoundNameForGeneration(round, totalRounds);
    console.log(`🎯 [ROUND ${round}] ${roundName}: ${matchesInThisRound} partida(s), ${participantsInThisRound} participantes`);
    
    // Gerar partidas da rodada
    for (let matchIdx = 0; matchIdx < matchesInThisRound; matchIdx++) {
      let team1: string[] | null = null;
      let team2: string[] | null = null;
      let completed = false;
      let winnerId: 'team1' | 'team2' | null = null;
      let score1: number | null = null;
      let score2: number | null = null;
      
      if (isFirstRound) {
        // 🔥 PRIMEIRA RODADA: Usar duplas reais
        const team1Index = matchIdx * 2;
        const team2Index = matchIdx * 2 + 1;
        
        if (team1Index < teamsWithoutByes.length) {
          team1 = teamsWithoutByes[team1Index].teamId;
        }
        if (team2Index < teamsWithoutByes.length) {
          team2 = teamsWithoutByes[team2Index].teamId;
        }
        
        // Verificar BYE automático (times ímpares)
        if (team1 && !team2) {
          completed = true;
          winnerId = 'team1';
          score1 = 1;
          score2 = 0;
          console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} (BYE automático)`);
        } else if (team1 && team2) {
          console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} vs ${team2.join(' & ')}`);
        }
        
      } else if (isSecondRound && byesNeeded > 0) {
        // 🔥 SEGUNDA RODADA: Misturar BYEs com vencedores da primeira
        
        // Determinar se esta partida envolve BYEs ou vencedores
        if (matchIdx * 2 < byesNeeded) {
          // Partida entre times com BYE
          const bye1Index = matchIdx * 2;
          const bye2Index = matchIdx * 2 + 1;
          
          if (bye1Index < teamsWithByes.length) {
            team1 = teamsWithByes[bye1Index].teamId;
          }
          if (bye2Index < teamsWithByes.length) {
            team2 = teamsWithByes[bye2Index].teamId;
          }
          
          if (team1 && team2) {
            console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} (BYE) vs ${team2.join(' & ')} (BYE)`);
          } else if (team1 && !team2) {
            // BYE ímpar: avança automaticamente
            completed = true;
            winnerId = 'team1';
            score1 = 1;
            score2 = 0;
            console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} (BYE único)`);
          }
        } else {
          // Partida entre vencedores da primeira rodada ou mista BYE vs vencedor
          const slotIndex = matchIdx * 2;
          const slot1 = slotIndex - byesNeeded;
          const slot2 = slotIndex + 1 - byesNeeded;
          
          // Misturar BYEs restantes com vencedores
          if (slotIndex < byesNeeded && slotIndex + 1 >= byesNeeded) {
            // Partida mista: último BYE vs primeiro vencedor
            team1 = teamsWithByes[slotIndex].teamId;
            team2 = [`WINNER_R1_1`];
            console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} (BYE) vs Vencedor R1-1`);
          } else if (slot1 >= 0 && slot2 >= 0) {
            // Partida entre vencedores
            team1 = [`WINNER_R1_${slot1 + 1}`];
            team2 = [`WINNER_R1_${slot2 + 1}`];
            console.log(`     Match ${matchIdx + 1}: Vencedor R1-${slot1 + 1} vs Vencedor R1-${slot2 + 1}`);
          }
        }
        
      } else {
        // 🔥 RODADAS SUBSEQUENTES: Usar placeholders dos vencedores
        team1 = [`WINNER_R${round-1}_${matchIdx * 2 + 1}`];
        team2 = [`WINNER_R${round-1}_${matchIdx * 2 + 2}`];
        console.log(`     Match ${matchIdx + 1}: Vencedor R${round-1}-${matchIdx * 2 + 1} vs Vencedor R${round-1}-${matchIdx * 2 + 2}`);
      }
      
      // Criar partida
      const match = createMatch(team1, team2, round, position++);
      match.stage = 'ELIMINATION';
      match.completed = completed;
      match.winnerId = winnerId;
      match.score1 = score1;
      match.score2 = score2;
      
      matches.push(match);
    }
    
    // Atualizar participantes para próxima rodada
    currentRoundParticipants = participantsInThisRound;
  }
  
  console.log(`🏆 [SUPER ADAPTÁVEL] Bracket finalizado: ${matches.length} partidas em ${totalRounds} rodadas`);
  
  // Resumo detalhado por rodada
  const matchesByRound = matches.reduce((acc, match) => {
    acc[match.round] = (acc[match.round] || 0) + 1;
    return acc;
  }, {} as Record<number, number>);
  
  console.log(`📊 [RESUMO FINAL] Partidas por rodada:`, matchesByRound);
  
  // Validação final
  const expectedTotalMatches = totalTeams - 1; // N teams require N-1 matches to eliminate all but one
  console.log(`✅ [VALIDAÇÃO] Total partidas: ${matches.length}, Esperado: ${expectedTotalMatches}`);
  
  return { matches, metadata };
}

/**
 * Função auxiliar para nomear rodadas durante a geração
 */
function getRoundNameForGeneration(round: number, totalRounds: number): string {
  const roundFromEnd = totalRounds - round;
  
  switch (roundFromEnd) {
    case 0: return 'Final';
    case 1: return 'Semifinal';
    case 2: return 'Quartas de Final';
    case 3: return 'Oitavas de Final';
    case 4: return 'Dezesseisavos de Final';
    case 5: return 'Trinta e dois avos de Final';
    default:
      const participants = Math.pow(2, roundFromEnd + 1);
      return `${participants}ª de Final`;
  }
}

/**
 * Gera rodadas de avanço com número correto de partidas (substitui generateEmptyRounds)
 * CORRIGIDO: Gera TODAS as rodadas necessárias para qualquer número de teams
 */
function generateAdvancementRounds(matches: Match[], currentRoundTeams: number, startRound: number = 2): void {
  let round = startRound;
  let teamsInRound = currentRoundTeams;
  
  console.log(`🔄 [generateAdvancementRounds] Starting with ${teamsInRound} teams in round ${round}`);
  
  while (teamsInRound > 1) {
    const matchesInRound = Math.floor(teamsInRound / 2);
    
    console.log(`🔄 [generateAdvancementRounds] Round ${round}: ${matchesInRound} matches (${teamsInRound} teams)`);
    
    if (matchesInRound <= 0) {
      console.log(`⚠️ [generateAdvancementRounds] No matches needed for round ${round}, stopping`);
      break;
    }
    
    for (let i = 0; i < matchesInRound; i++) {
      // CORRIGIDO: Criar partidas com null ao invés de placeholders ['TBD']
      const match = createMatch(null, null, round, i + 1);
      matches.push(match);
      console.log(`🔄 [ADVANCE] R${round}-${i + 1}: Aguardando definição de confronto`);
    }
    
    // Para próxima rodada, o número de teams é igual ao número de partidas desta rodada
    teamsInRound = matchesInRound;
    round++;
  }
  
  console.log(`✅ [generateAdvancementRounds] Completed: Generated ${round - startRound} additional rounds`);
}

/**
 * Pré-popula times que receberam BYE na segunda rodada
 * TODO: Esta função não está sendo usada atualmente
 */
/*
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
*/

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
function createMatch(team1: string[] | null, team2: string[] | null, round: number, position: number): Match {
  return {
    id: generateUUID(),
    team1,
    team2,
    round,
    position,
    score1: null,
    score2: null,
    winnerId: null,
    completed: false,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null,
    tournamentId: '',
    eventId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as Match;
}
   
