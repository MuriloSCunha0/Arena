/**
 * FUNÇÕES CORRIGIDAS: findDependentMatches e advanceWinnerToMatch
 * Baseadas na análise da estrutura real das eliminatórias
 */

// 🔍 FUNÇÃO CORRIGIDA: Encontrar partidas que dependem de uma partida específica
const findDependentMatches = (completedMatch: Match, allMatches: Match[]): Match[] => {
  const dependentMatches: Match[] = [];
  
  console.log(`🔍 [FIND DEPENDENT] ===== BUSCANDO DEPENDÊNCIAS =====`);
  console.log(`🔍 [FIND DEPENDENT] Match concluída: R${completedMatch.round}_${completedMatch.position} (${completedMatch.stage})`);
  
  // 🔥 LÓGICA CORRIGIDA BASEADA NOS LOGS:
  // R1: positions 1,2 → R2: positions 3,4 
  // R2: positions 3,4,5,6 → R3: positions 7,8
  // R3: positions 7,8 → R4: position 9
  
  const currentRound = completedMatch.round;
  const currentPosition = completedMatch.position;
  let targetRound: number;
  let targetPosition: number;
  
  // Mapeamento específico baseado na estrutura real do torneio
  if (currentRound === 1) {
    // R1_1 → R2_3, R1_2 → R2_4
    targetRound = 2;
    targetPosition = currentPosition === 1 ? 3 : 4;
    console.log(`🏐 [Beach Tennis] R1_${currentPosition} → R2_${targetPosition}`);
    
  } else if (currentRound === 2) {
    // R2_3,R2_4 → R3_7 | R2_5,R2_6 → R3_8
    targetRound = 3;
    if (currentPosition === 3 || currentPosition === 4) {
      targetPosition = 7;
    } else if (currentPosition === 5 || currentPosition === 6) {
      targetPosition = 8;
    } else {
      console.warn(`⚠️ [FIND DEPENDENT] Posição inesperada na rodada 2: ${currentPosition}`);
      return [];
    }
    console.log(`🏐 [Beach Tennis] R2_${currentPosition} → R3_${targetPosition}`);
    
  } else if (currentRound === 3) {
    // R3_7,R3_8 → R4_9
    targetRound = 4;
    targetPosition = 9;
    console.log(`🏐 [Beach Tennis] R3_${currentPosition} → R4_${targetPosition}`);
    
  } else {
    console.log(`ℹ️ [FIND DEPENDENT] Rodada ${currentRound} não tem dependentes (possivelmente final)`);
    return [];
  }
  
  console.log(`🔍 [FIND DEPENDENT] Procurando partida: R${targetRound}_${targetPosition}`);
  
  // Buscar partida da próxima rodada usando stage ELIMINATION
  const nextMatch = allMatches.find(m => 
    m.stage === 'ELIMINATION' && 
    m.round === targetRound && 
    m.position === targetPosition
  );
  
  if (nextMatch) {
    dependentMatches.push(nextMatch);
    console.log(`✅ [FIND DEPENDENT] Match dependente encontrada: ${nextMatch.id}`);
    console.log(`    Team1: ${Array.isArray(nextMatch.team1) ? nextMatch.team1.join(' & ') : nextMatch.team1}`);
    console.log(`    Team2: ${Array.isArray(nextMatch.team2) ? nextMatch.team2.join(' & ') : nextMatch.team2}`);
    
    // Verificar qual slot tem placeholder
    const isPlaceholder = (team: any) => {
      if (!team) return true;
      if (Array.isArray(team)) {
        return team.some(player => 
          typeof player === 'string' && 
          (player.includes('WINNER_') || player.includes('Vencedor') || player.includes('TBD'))
        );
      }
      return typeof team === 'string' && 
             (team.includes('WINNER_') || team.includes('Vencedor') || team.includes('TBD'));
    };
    
    const placeholders = [];
    if (isPlaceholder(nextMatch.team1)) placeholders.push('team1');
    if (isPlaceholder(nextMatch.team2)) placeholders.push('team2');
    
    console.log(`    Placeholders encontrados: ${placeholders.join(', ')}`);
  } else {
    console.warn(`⚠️ [FIND DEPENDENT] Nenhuma partida dependente encontrada para R${targetRound}_${targetPosition}`);
  }
  
  console.log(`🔍 [FIND DEPENDENT] Total de dependentes: ${dependentMatches.length}`);
  console.log(`🔍 [FIND DEPENDENT] ===== FIM DA BUSCA =====`);
  
  return dependentMatches;
};

// 🚀 FUNÇÃO CORRIGIDA: Avançar vencedor para partida específica
const advanceWinnerToMatch = async (winnerTeam: string[], completedMatch: Match, targetMatch: Match) => {
  try {
    console.log(`🚀 [ADVANCE] ===== INICIANDO AVANÇO PARA MATCH ${targetMatch.id} =====`);
    console.log(`🚀 [ADVANCE] Vencedor: ${Array.isArray(winnerTeam) ? winnerTeam.join(' & ') : winnerTeam}`);
    console.log(`🚀 [ADVANCE] De: R${completedMatch.round}_${completedMatch.position} → Para: R${targetMatch.round}_${targetMatch.position}`);
    
    // 🔥 LÓGICA CORRIGIDA: Determinar slot correto baseado na estrutura real
    let shouldUpdateTeam1 = false;
    let shouldUpdateTeam2 = false;
    
    const sourceRound = completedMatch.round;
    const sourcePosition = completedMatch.position;
    const targetRound = targetMatch.round;
    const targetPosition = targetMatch.position;
    
    // Mapeamento específico baseado na estrutura identificada nos logs
    if (sourceRound === 1 && targetRound === 2) {
      // R1_1 → R2_3 team1, R1_2 → R2_4 team1
      shouldUpdateTeam1 = true;
      console.log(`🏐 [Beach Tennis] R1_${sourcePosition} → R2_${targetPosition} team1`);
      
    } else if (sourceRound === 2 && targetRound === 3) {
      // R2_3 → R3_7 team1, R2_4 → R3_7 team2
      // R2_5 → R3_8 team1, R2_6 → R3_8 team2
      if (targetPosition === 7) {
        shouldUpdateTeam1 = sourcePosition === 3;
        shouldUpdateTeam2 = sourcePosition === 4;
      } else if (targetPosition === 8) {
        shouldUpdateTeam1 = sourcePosition === 5;
        shouldUpdateTeam2 = sourcePosition === 6;
      }
      console.log(`🏐 [Beach Tennis] R2_${sourcePosition} → R3_${targetPosition} ${shouldUpdateTeam1 ? 'team1' : 'team2'}`);
      
    } else if (sourceRound === 3 && targetRound === 4) {
      // R3_7 → R4_9 team1, R3_8 → R4_9 team2
      shouldUpdateTeam1 = sourcePosition === 7;
      shouldUpdateTeam2 = sourcePosition === 8;
      console.log(`🏐 [Beach Tennis] R3_${sourcePosition} → R4_${targetPosition} ${shouldUpdateTeam1 ? 'team1' : 'team2'}`);
      
    } else {
      console.error(`❌ [ADVANCE] Mapeamento não encontrado: R${sourceRound}_${sourcePosition} → R${targetRound}_${targetPosition}`);
      return;
    }
    
    // Aplicar a atualização
    let updatedTeam1 = targetMatch.team1;
    let updatedTeam2 = targetMatch.team2;
    let hasChanges = false;
    
    if (shouldUpdateTeam1) {
      console.log(`🔄 [ADVANCE] ANTES - team1:`, updatedTeam1);
      updatedTeam1 = winnerTeam;
      hasChanges = true;
      console.log(`🔄 [ADVANCE] DEPOIS - team1:`, updatedTeam1);
    }
    
    if (shouldUpdateTeam2) {
      console.log(`🔄 [ADVANCE] ANTES - team2:`, updatedTeam2);
      updatedTeam2 = winnerTeam;
      hasChanges = true;
      console.log(`🔄 [ADVANCE] DEPOIS - team2:`, updatedTeam2);
    }
    
    // Salvar alterações no banco de dados
    if (hasChanges) {
      console.log(`💾 [ADVANCE] Salvando alterações no banco de dados...`);
      
      const storeUpdateMatchTeams = useTournamentStore.getState().updateMatchTeams;
      if (storeUpdateMatchTeams) {
        await storeUpdateMatchTeams(targetMatch.id, updatedTeam1, updatedTeam2);
        console.log(`✅ [ADVANCE] Match ${targetMatch.id} atualizada no banco via store`);
        
        // ✅ VERIFICAÇÃO EXTRA: Confirmar que a mudança foi aplicada no estado
        setTimeout(() => {
          const currentTournament = useTournamentStore.getState().tournament;
          const updatedMatch = currentTournament?.matches.find(m => m.id === targetMatch.id);
          if (updatedMatch) {
            console.log(`🔍 [ADVANCE] Verificação pós-update:`, {
              matchId: updatedMatch.id,
              team1: Array.isArray(updatedMatch.team1) ? updatedMatch.team1.join(' & ') : updatedMatch.team1,
              team2: Array.isArray(updatedMatch.team2) ? updatedMatch.team2.join(' & ') : updatedMatch.team2
            });
          } else {
            console.warn(`⚠️ [ADVANCE] Match ${targetMatch.id} não encontrada após update`);
          }
        }, 500);
        
      } else {
        console.warn(`⚠️ [ADVANCE] Store updateMatchTeams não disponível, usando método local`);
        await updateMatchTeamsDirectly(targetMatch.id, updatedTeam1, updatedTeam2);
      }
    } else {
      console.log(`ℹ️ [ADVANCE] Nenhuma alteração necessária para match ${targetMatch.id}`);
    }
    
    console.log(`✅ [ADVANCE] ===== AVANÇO CONCLUÍDO PARA MATCH ${targetMatch.id} =====`);
    
  } catch (error) {
    console.error(`🚨 [ADVANCE] Erro ao avançar vencedor:`, error);
  }
};
