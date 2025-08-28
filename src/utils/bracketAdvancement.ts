/**
 * Utilitário específico para avanço correto no chaveamento eliminatório
 * Baseado na análise do JSON real do banco de dados
 */

import { Match } from '../types';

/**
 * Mapeia a posição da partida completada para a próxima partida correta
 * Baseado na estrutura real do chaveamento no banco
 */
export function getNextMatchPosition(completedMatch: Match): { round: number; position: number } | null {
  console.log(`🔍 [getNextMatchPosition] Analyzing completed match:`, {
    id: completedMatch.id,
    round: completedMatch.round,
    position: completedMatch.position,
    stage: completedMatch.stage
  });

  // Análise baseada no JSON real:
  // Round 1: positions 1, 2 (Quartas de Final)
  // Round 2: positions 3, 4, 5, 6 (BYEs + Semifinais) 
  // Round 3: positions 7, 8 (Semifinais)
  // Round 4: position 9 (Final)

  if (completedMatch.stage !== 'ELIMINATION') {
    console.log(`ℹ️ [getNextMatchPosition] Not an elimination match, skipping`);
    return null;
  }

  let nextRound: number;
  let nextPosition: number;

  switch (completedMatch.round) {
    case 1:
      // Quartas de Final → próxima rodada
      nextRound = 2;
      if (completedMatch.position === 1) {
        // QF1 (pos=1) → vai para match com WINNER_R1_1 (que é pos=6)
        nextPosition = 6;
      } else if (completedMatch.position === 2) {
        // QF2 (pos=2) → vai para match com WINNER_R1_2 (que é pos=6 também)
        nextPosition = 6;
      } else {
        console.warn(`⚠️ [getNextMatchPosition] Unexpected position ${completedMatch.position} in round 1`);
        return null;
      }
      break;

    case 2:
      // Round 2 → Round 3
      nextRound = 3;
      if (completedMatch.position === 3) {
        // R2_1 → R3_1 (pos=7)
        nextPosition = 7;
      } else if (completedMatch.position === 4) {
        // R2_2 → R3_1 (pos=7) 
        nextPosition = 7;
      } else if (completedMatch.position === 5) {
        // R2_3 → R3_2 (pos=8)
        nextPosition = 8;
      } else if (completedMatch.position === 6) {
        // R2_4 → R3_2 (pos=8)
        nextPosition = 8;
      } else {
        console.warn(`⚠️ [getNextMatchPosition] Unexpected position ${completedMatch.position} in round 2`);
        return null;
      }
      break;

    case 3:
      // Round 3 → Round 4 (Final)
      nextRound = 4;
      if (completedMatch.position === 7) {
        // R3_1 → Final (pos=9)
        nextPosition = 9;
      } else if (completedMatch.position === 8) {
        // R3_2 → Final (pos=9)
        nextPosition = 9;
      } else {
        console.warn(`⚠️ [getNextMatchPosition] Unexpected position ${completedMatch.position} in round 3`);
        return null;
      }
      break;

    case 4:
      // Final não tem próxima partida
      console.log(`🏆 [getNextMatchPosition] Final match completed, no next match`);
      return null;

    default:
      console.warn(`⚠️ [getNextMatchPosition] Unexpected round ${completedMatch.round}`);
      return null;
  }

  console.log(`✅ [getNextMatchPosition] Round ${completedMatch.round} pos ${completedMatch.position} → Round ${nextRound} pos ${nextPosition}`);
  
  return { round: nextRound, position: nextPosition };
}

/**
 * Determina qual slot (team1 ou team2) o vencedor deve ocupar na próxima partida
 */
export function getTeamSlotForWinner(completedMatch: Match, nextMatch: Match): 'team1' | 'team2' | null {
  console.log(`🎯 [getTeamSlotForWinner] Analyzing:`, {
    completed: { round: completedMatch.round, position: completedMatch.position },
    next: { round: nextMatch.round, position: nextMatch.position, team1: nextMatch.team1, team2: nextMatch.team2 }
  });

  // Verificar qual slot tem o placeholder correspondente
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

  // Construir o placeholder esperado baseado na partida completada
  const expectedPlaceholder = `WINNER_R${completedMatch.round}_${completedMatch.position}`;
  console.log(`🎯 [getTeamSlotForWinner] Expected placeholder: ${expectedPlaceholder}`);

  // Verificar qual slot tem o placeholder esperado
  if (team1IsPlaceholder && nextMatch.team1 && nextMatch.team1[0] === expectedPlaceholder) {
    console.log(`✅ [getTeamSlotForWinner] Found expected placeholder in team1`);
    return 'team1';
  }
  
  if (team2IsPlaceholder && nextMatch.team2 && nextMatch.team2[0] === expectedPlaceholder) {
    console.log(`✅ [getTeamSlotForWinner] Found expected placeholder in team2`);
    return 'team2';
  }

  // Fallback: verificar qualquer placeholder que reference a rodada
  const roundPlaceholderPattern = new RegExp(`WINNER_R${completedMatch.round}_`);
  
  if (team1IsPlaceholder && nextMatch.team1 && roundPlaceholderPattern.test(nextMatch.team1[0])) {
    console.log(`⚠️ [getTeamSlotForWinner] Found related placeholder in team1 (fallback)`);
    return 'team1';
  }
  
  if (team2IsPlaceholder && nextMatch.team2 && roundPlaceholderPattern.test(nextMatch.team2[0])) {
    console.log(`⚠️ [getTeamSlotForWinner] Found related placeholder in team2 (fallback)`);
    return 'team2';
  }

  console.warn(`❌ [getTeamSlotForWinner] No matching placeholder found for ${expectedPlaceholder}`);
  return null;
}

/**
 * Atualiza o chaveamento eliminatório com lógica robusta baseada no formato real
 */
export function updateEliminationBracketRobust(
  matches: Match[],
  completedMatchId: string,
  _winnerId: 'team1' | 'team2',
  winnerTeam: string[]
): Match[] {
  try {
    console.log(`🚀 [updateEliminationBracketRobust] Starting update for match ${completedMatchId}`);
    
    // Encontrar a partida completada
    const completedMatch = matches.find(m => m.id === completedMatchId);
    if (!completedMatch) {
      console.warn(`⚠️ [updateEliminationBracketRobust] Completed match not found: ${completedMatchId}`);
      return matches;
    }

    // Obter posição da próxima partida
    const nextPosition = getNextMatchPosition(completedMatch);
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

    // Determinar qual slot atualizar
    const targetSlot = getTeamSlotForWinner(completedMatch, nextMatch);
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
    
    return updatedMatches;

  } catch (error) {
    console.error('❌ [updateEliminationBracketRobust] Error:', error);
    return matches;
  }
}
