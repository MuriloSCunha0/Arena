/**
 * Utilitário adaptativo para avanço automático no chaveamento eliminatório
 * Funciona para qualquer quantidade de participantes (8 a 1000+), rodadas e confrontos
 */

import { Match } from '../types';

/**
 * Interface para estrutura de torneio detectada automaticamente
 */
interface TournamentStructure {
  totalRounds: number;
  matchesByRound: Record<number, number>;
  positionsByRound: Record<number, number[]>;
  bracketType: 'standard' | 'with_byes' | 'custom';
  totalParticipants: number;
}

/**
 * Analisa automaticamente a estrutura do torneio baseado nas partidas
 * Funciona para qualquer quantidade de participantes
 */
export function analyzeTournamentStructure(matches: Match[]): TournamentStructure {
  console.log(`🔍 [analyzeTournamentStructure] Analisando ${matches.length} partidas`);
  
  const eliminationMatches = matches.filter(m => m.stage === 'ELIMINATION');
  
  if (eliminationMatches.length === 0) {
    throw new Error('Nenhuma partida eliminatória encontrada');
  }

  // Agrupar por rodada
  const matchesByRound: Record<number, number> = {};
  const positionsByRound: Record<number, number[]> = {};
  
  eliminationMatches.forEach(match => {
    const round = match.round;
    matchesByRound[round] = (matchesByRound[round] || 0) + 1;
    
    if (!positionsByRound[round]) {
      positionsByRound[round] = [];
    }
    positionsByRound[round].push(match.position);
  });

  // Ordenar posições por rodada
  Object.keys(positionsByRound).forEach(round => {
    positionsByRound[parseInt(round)].sort((a, b) => a - b);
  });

  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  const totalRounds = Math.max(...rounds);
  
  // Detectar tipo de bracket
  const firstRoundMatches = matchesByRound[rounds[0]];
  
  let bracketType: 'standard' | 'with_byes' | 'custom' = 'standard';
  let totalParticipants = firstRoundMatches * 2;

  // Verificar se é potência de 2 (bracket padrão)
  if (!isPowerOfTwo(totalParticipants)) {
    bracketType = 'with_byes';
  }

  // Detectar participantes reais baseado na estrutura
  if (bracketType === 'with_byes') {
    // Calcular participantes considerando BYEs
    totalParticipants = calculateParticipantsWithByes(matchesByRound);
  }

  const structure: TournamentStructure = {
    totalRounds,
    matchesByRound,
    positionsByRound,
    bracketType,
    totalParticipants
  };

  console.log(`✅ [analyzeTournamentStructure] Estrutura detectada:`, {
    totalRounds,
    bracketType,
    totalParticipants,
    matchesByRound
  });

  return structure;
}

/**
 * Verifica se um número é potência de 2
 */
function isPowerOfTwo(n: number): boolean {
  return n > 0 && (n & (n - 1)) === 0;
}

/**
 * Calcula número real de participantes em torneios com BYE
 */
function calculateParticipantsWithByes(matchesByRound: Record<number, number>): number {
  const rounds = Object.keys(matchesByRound).map(Number).sort((a, b) => a - b);
  
  // Trabalhar de trás para frente
  let participants = 1; // Final tem 1 vencedor
  
  for (let i = rounds.length - 1; i >= 0; i--) {
    const round = rounds[i];
    const matches = matchesByRound[round];
    participants = matches * 2; // Cada partida tem 2 participantes
  }
  
  return participants;
}
interface AdvancementRule {
  fromRound: number;
  fromPosition: number;
  toRound: number;
  toPosition: number;
  toSlot: 'team1' | 'team2';
}

/**
 * Analisa toda a estrutura do bracket e constrói as regras de avanço dinamicamente
 * Funciona para qualquer formato de torneio eliminatório
 */
export function analyzeAdvancementStructure(matches: Match[]): AdvancementRule[] {
  console.log(`🔍 [analyzeAdvancementStructure] Analyzing ${matches.length} matches`);
  
  const eliminationMatches = matches.filter(m => m.stage === 'ELIMINATION');
  const rules: AdvancementRule[] = [];
  
  // Agrupar partidas por rodada
  const matchesByRound = new Map<number, Match[]>();
  eliminationMatches.forEach(match => {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round)!.push(match);
  });
  
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);
  console.log(`📊 [analyzeAdvancementStructure] Found rounds: ${rounds.join(', ')}`);
  
  // Para cada rodada (exceto a última), encontrar para onde avançam
  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRound = rounds[i];
    const nextRound = rounds[i + 1];
    
    const currentMatches = matchesByRound.get(currentRound)!.sort((a, b) => a.position - b.position);
    const nextMatches = matchesByRound.get(nextRound)!.sort((a, b) => a.position - b.position);
    
    console.log(`🔗 [analyzeAdvancementStructure] Mapping R${currentRound} (${currentMatches.length} matches) → R${nextRound} (${nextMatches.length} matches)`);
    
    // Encontrar regras de avanço baseadas em placeholders
    currentMatches.forEach((currentMatch) => {
      const expectedPlaceholder = `WINNER_R${currentRound}_${currentMatch.position}`;
      
      // Procurar onde este placeholder aparece nas próximas partidas
      nextMatches.forEach(nextMatch => {
        // Verificar team1
        if (nextMatch.team1 && isPlaceholderMatch(nextMatch.team1, expectedPlaceholder)) {
          rules.push({
            fromRound: currentRound,
            fromPosition: currentMatch.position,
            toRound: nextRound,
            toPosition: nextMatch.position,
            toSlot: 'team1'
          });
          console.log(`   ✅ Rule: R${currentRound}-${currentMatch.position} → R${nextRound}-${nextMatch.position} (team1)`);
        }
        
        // Verificar team2
        if (nextMatch.team2 && isPlaceholderMatch(nextMatch.team2, expectedPlaceholder)) {
          rules.push({
            fromRound: currentRound,
            fromPosition: currentMatch.position,
            toRound: nextRound,
            toPosition: nextMatch.position,
            toSlot: 'team2'
          });
          console.log(`   ✅ Rule: R${currentRound}-${currentMatch.position} → R${nextRound}-${nextMatch.position} (team2)`);
        }
      });
    });
    
    // Se não encontrou regras por placeholder, usar lógica matemática padrão
    if (rules.filter(r => r.fromRound === currentRound).length === 0) {
      console.log(`⚠️ [analyzeAdvancementStructure] No placeholder rules found for R${currentRound}, using mathematical mapping`);
      
      currentMatches.forEach((currentMatch, currentIndex) => {
        // Lógica padrão: cada 2 partidas da rodada atual vão para 1 partida da próxima
        const nextMatchIndex = Math.floor(currentIndex / 2);
        const nextMatch = nextMatches[nextMatchIndex];
        
        if (nextMatch) {
          const slot: 'team1' | 'team2' = (currentIndex % 2 === 0) ? 'team1' : 'team2';
          
          rules.push({
            fromRound: currentRound,
            fromPosition: currentMatch.position,
            toRound: nextRound,
            toPosition: nextMatch.position,
            toSlot: slot
          });
          
          console.log(`   📐 Mathematical Rule: R${currentRound}-${currentMatch.position} → R${nextRound}-${nextMatch.position} (${slot})`);
        }
      });
    }
  }
  
  console.log(`🎯 [analyzeAdvancementStructure] Generated ${rules.length} advancement rules`);
  return rules;
}

/**
 * Verifica se um time contém um placeholder específico
 */
function isPlaceholderMatch(team: string[], expectedPlaceholder: string): boolean {
  if (!team || team.length === 0) return false;
  
  // Verificação direta
  if (team.includes(expectedPlaceholder)) return true;
  
  // Verificação por padrão (para casos como WINNER_R1_1 vs WINNER_QF1)
  const placeholderPatterns = [
    expectedPlaceholder,
    expectedPlaceholder.replace('WINNER_R', 'WINNER_QF'),
    expectedPlaceholder.replace('WINNER_R', 'WINNER_SF'),
    expectedPlaceholder.replace('WINNER_R', 'WINNER_')
  ];
  
  return team.some(member => 
    placeholderPatterns.some(pattern => 
      member.includes(pattern) || pattern.includes(member)
    )
  );
}

/**
 * Mapeia a posição da partida completada para a próxima partida correta
 * VERSÃO ADAPTATIVA: Funciona para qualquer estrutura de torneio
 */
export function getNextMatchPosition(completedMatch: Match, allMatches: Match[]): { round: number; position: number; slot: 'team1' | 'team2' } | null {
  console.log(`🔍 [getNextMatchPosition] Analyzing completed match:`, {
    id: completedMatch.id,
    round: completedMatch.round,
    position: completedMatch.position,
    stage: completedMatch.stage
  });

  if (completedMatch.stage !== 'ELIMINATION') {
    console.log(`ℹ️ [getNextMatchPosition] Not an elimination match, skipping`);
    return null;
  }

  // Gerar regras de avanço dinamicamente
  const rules = analyzeAdvancementStructure(allMatches);
  
  // Encontrar a regra para esta partida
  const rule = rules.find(r => 
    r.fromRound === completedMatch.round && 
    r.fromPosition === completedMatch.position
  );
  
  if (!rule) {
    console.log(`🏆 [getNextMatchPosition] No advancement rule found - likely final match`);
    return null;
  }
  
  console.log(`✅ [getNextMatchPosition] Found rule: R${rule.fromRound}-${rule.fromPosition} → R${rule.toRound}-${rule.toPosition} (${rule.toSlot})`);
  
  return { 
    round: rule.toRound, 
    position: rule.toPosition, 
    slot: rule.toSlot 
  };
}

/**
 * Determina qual slot (team1 ou team2) o vencedor deve ocupar na próxima partida
 * VERSÃO ADAPTATIVA: Funciona com qualquer estrutura de placeholders
 */
export function getTeamSlotForWinner(completedMatch: Match, nextMatch: Match, allMatches: Match[]): 'team1' | 'team2' | null {
  console.log(`🎯 [getTeamSlotForWinner] Analyzing:`, {
    completed: { round: completedMatch.round, position: completedMatch.position },
    next: { round: nextMatch.round, position: nextMatch.position, team1: nextMatch.team1, team2: nextMatch.team2 }
  });

  // Usar a nova função adaptativa para obter o slot correto
  const advancementInfo = getNextMatchPosition(completedMatch, allMatches);
  if (advancementInfo && advancementInfo.round === nextMatch.round && advancementInfo.position === nextMatch.position) {
    console.log(`✅ [getTeamSlotForWinner] Using adaptive slot: ${advancementInfo.slot}`);
    return advancementInfo.slot;
  }

  // Fallback: verificar placeholders no formato tradicional
  const team1IsPlaceholder = Array.isArray(nextMatch.team1) && nextMatch.team1.length === 1 && 
    nextMatch.team1[0].startsWith('WINNER_');
  const team2IsPlaceholder = Array.isArray(nextMatch.team2) && nextMatch.team2.length === 1 && 
    nextMatch.team2[0].startsWith('WINNER_');

  console.log(`🔍 [getTeamSlotForWinner] Placeholder analysis:`, {
    team1IsPlaceholder,
    team2IsPlaceholder,
    team1Value: nextMatch.team1,
    team2Value: nextMatch.team2
  });

  // Construir múltiplos placeholders esperados (mais flexível)
  const expectedPlaceholders = [
    `WINNER_R${completedMatch.round}_${completedMatch.position}`,
    `WINNER_QF${completedMatch.position}`,
    `WINNER_SF${completedMatch.position}`,
    `WINNER_${completedMatch.round}_${completedMatch.position}`,
    `WINNER_ROUND${completedMatch.round}_${completedMatch.position}`
  ];
  
  console.log(`🎯 [getTeamSlotForWinner] Expected placeholders:`, expectedPlaceholders);

  // Verificar qual slot tem qualquer um dos placeholders esperados
  for (const placeholder of expectedPlaceholders) {
    if (team1IsPlaceholder && nextMatch.team1 && nextMatch.team1[0] === placeholder) {
      console.log(`✅ [getTeamSlotForWinner] Found exact placeholder '${placeholder}' in team1`);
      return 'team1';
    }
    
    if (team2IsPlaceholder && nextMatch.team2 && nextMatch.team2[0] === placeholder) {
      console.log(`✅ [getTeamSlotForWinner] Found exact placeholder '${placeholder}' in team2`);
      return 'team2';
    }
  }

  // Fallback mais agressivo: verificar substring
  const roundPlaceholderPattern = new RegExp(`WINNER.*R${completedMatch.round}.*${completedMatch.position}|WINNER.*${completedMatch.round}.*${completedMatch.position}`);
  
  if (team1IsPlaceholder && nextMatch.team1 && roundPlaceholderPattern.test(nextMatch.team1[0])) {
    console.log(`⚠️ [getTeamSlotForWinner] Found related placeholder in team1 (pattern match)`);
    return 'team1';
  }
  
  if (team2IsPlaceholder && nextMatch.team2 && roundPlaceholderPattern.test(nextMatch.team2[0])) {
    console.log(`⚠️ [getTeamSlotForWinner] Found related placeholder in team2 (pattern match)`);
    return 'team2';
  }

  // Último fallback: usar primeiro slot vazio
  if (team1IsPlaceholder) {
    console.log(`🔄 [getTeamSlotForWinner] Using team1 slot as fallback (is placeholder)`);
    return 'team1';
  }
  
  if (team2IsPlaceholder) {
    console.log(`🔄 [getTeamSlotForWinner] Using team2 slot as fallback (is placeholder)`);
    return 'team2';
  }

  console.warn(`❌ [getTeamSlotForWinner] No suitable slot found for advancement`);
  return null;
}

/**
 * Atualiza o chaveamento eliminatório com lógica robusta e adaptativa
 * VERSÃO ADAPTATIVA: Funciona para qualquer quantidade de participantes, rodadas e confrontos
 */
export function updateEliminationBracketRobust(
  matches: Match[],
  completedMatchId: string,
  _winnerId: 'team1' | 'team2',
  winnerTeam: string[]
): Match[] {
  try {
    console.log(`🚀 [updateEliminationBracketRobust] Starting adaptive update for match ${completedMatchId}`);
    console.log(`🚀 [updateEliminationBracketRobust] Tournament structure: ${matches.filter(m => m.stage === 'ELIMINATION').length} elimination matches`);
    
    // Encontrar a partida completada
    const completedMatch = matches.find(m => m.id === completedMatchId);
    if (!completedMatch) {
      console.warn(`⚠️ [updateEliminationBracketRobust] Completed match not found: ${completedMatchId}`);
      return matches;
    }

    // Obter posição da próxima partida usando lógica adaptativa
    const nextPosition = getNextMatchPosition(completedMatch, matches);
    if (!nextPosition) {
      console.log(`🏆 [updateEliminationBracketRobust] No next match (final completed or not elimination)`);
      return matches;
    }

    // Encontrar a próxima partida
    const nextMatchIndex = matches.findIndex(m => 
      m.stage === 'ELIMINATION' && 
      m.round === nextPosition.round && 
      m.position === nextPosition.position
    );

    if (nextMatchIndex === -1) {
      console.error(`❌ [updateEliminationBracketRobust] Next match not found: Round ${nextPosition.round}, Position ${nextPosition.position}`);
      return matches;
    }

    const nextMatch = matches[nextMatchIndex];
    console.log(`📝 [updateEliminationBracketRobust] Found next match:`, {
      id: nextMatch.id,
      round: nextMatch.round,
      position: nextMatch.position
    });

    // Determinar qual slot atualizar usando lógica adaptativa
    const targetSlot = nextPosition.slot || getTeamSlotForWinner(completedMatch, nextMatch, matches);
    if (!targetSlot) {
      console.error(`❌ [updateEliminationBracketRobust] Could not determine target slot`);
      return matches;
    }

    // Criar array atualizado
    const updatedMatches = [...matches];
    const updatedNextMatch = { 
      ...nextMatch,
      [targetSlot]: winnerTeam,
      updatedAt: new Date().toISOString()
    };

    updatedMatches[nextMatchIndex] = updatedNextMatch;

    console.log(`✅ [updateEliminationBracketRobust] Successfully updated ${targetSlot} of match ${nextMatch.id} with winner: ${winnerTeam.join(' & ')}`);
    
    // Log da estrutura final para debug
    console.log(`📊 [updateEliminationBracketRobust] Updated match state:`, {
      matchId: updatedNextMatch.id,
      team1: updatedNextMatch.team1,
      team2: updatedNextMatch.team2,
      round: updatedNextMatch.round,
      position: updatedNextMatch.position
    });
    
    return updatedMatches;

  } catch (error) {
    console.error('❌ [updateEliminationBracketRobust] Error:', error);
    return matches;
  }
}

/**
 * Função de validação para verificar se a estrutura do bracket está correta
 * Útil para debugging e garantir que o avanço funcione corretamente
 */
export function validateBracketStructure(matches: Match[]): {
  isValid: boolean;
  issues: string[];
  structure: any;
} {
  const issues: string[] = [];
  const eliminationMatches = matches.filter(m => m.stage === 'ELIMINATION');
  
  console.log(`🔍 [validateBracketStructure] Validating ${eliminationMatches.length} elimination matches`);
  
  // Agrupar por rodada
  const byRound = new Map<number, Match[]>();
  eliminationMatches.forEach(match => {
    if (!byRound.has(match.round)) {
      byRound.set(match.round, []);
    }
    byRound.get(match.round)!.push(match);
  });
  
  const rounds = Array.from(byRound.keys()).sort((a, b) => a - b);
  
  // Verificar se o número de partidas diminui corretamente
  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRound = rounds[i];
    const nextRound = rounds[i + 1];
    const currentCount = byRound.get(currentRound)!.length;
    const nextCount = byRound.get(nextRound)!.length;
    
    // Regra: próxima rodada deve ter aproximadamente metade das partidas
    const expectedNext = Math.ceil(currentCount / 2);
    if (nextCount > expectedNext) {
      issues.push(`Round ${nextRound} has ${nextCount} matches, expected ≤ ${expectedNext} (from ${currentCount} in R${currentRound})`);
    }
  }
  
  // Verificar se existem regras de avanço para todas as partidas (exceto final)
  const rules = analyzeAdvancementStructure(matches);
  for (let i = 0; i < rounds.length - 1; i++) {
    const round = rounds[i];
    const matchesInRound = byRound.get(round)!;
    
    matchesInRound.forEach(match => {
      const hasRule = rules.some(r => r.fromRound === round && r.fromPosition === match.position);
      if (!hasRule) {
        issues.push(`No advancement rule found for Round ${round}, Position ${match.position}`);
      }
    });
  }
  
  const structure = {
    totalMatches: eliminationMatches.length,
    rounds: rounds.map(r => ({
      round: r,
      matches: byRound.get(r)!.length,
      positions: byRound.get(r)!.map(m => m.position).sort((a, b) => a - b)
    })),
    advancementRules: rules.length
  };
  
  console.log(`📊 [validateBracketStructure] Structure:`, structure);
  
  if (issues.length > 0) {
    console.warn(`⚠️ [validateBracketStructure] Found ${issues.length} issues:`, issues);
  } else {
    console.log(`✅ [validateBracketStructure] Bracket structure is valid`);
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    structure
  };
}
