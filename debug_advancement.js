/**
 * SCRIPT DE DEBUG: Avanço Automático das Eliminatórias
 * Este script simula o processo de avanço automático para identificar onde está o problema
 */

// Simular dados de um torneio de Beach Tennis
const mockTournament = {
  id: 'test-tournament',
  matches: [
    // Quartas de Final (Round 1)
    {
      id: 'match-qf1',
      stage: 'elimination',
      round: 1,
      position: 1,
      team1: ['Dupla A1', 'Dupla A2'],
      team2: ['Dupla B1', 'Dupla B2'],
      winner: ['Dupla A1', 'Dupla A2'],
      status: 'completed'
    },
    {
      id: 'match-qf2',
      stage: 'elimination',
      round: 1,
      position: 2,
      team1: ['Dupla C1', 'Dupla C2'],
      team2: ['Dupla D1', 'Dupla D2'],
      winner: ['Dupla C1', 'Dupla C2'],
      status: 'completed'
    },
    
    // Semifinais (Round 2)
    {
      id: 'match-sf1',
      stage: 'elimination',
      round: 2,
      position: 1,
      team1: ['1º Colocado', '1º Colocado'],
      team2: ['Vencedor R1_1', 'Vencedor R1_1'], // Deveria ser Dupla A
      winner: null,
      status: 'pending'
    },
    {
      id: 'match-sf2',
      stage: 'elimination',
      round: 2,
      position: 2,
      team1: ['2º Colocado', '2º Colocado'],
      team2: ['Vencedor R1_2', 'Vencedor R1_2'], // Deveria ser Dupla C
      winner: null,
      status: 'pending'
    },
    
    // Final (Round 3)
    {
      id: 'match-final',
      stage: 'elimination',
      round: 3,
      position: 1,
      team1: ['Vencedor R2_1', 'Vencedor R2_1'],
      team2: ['Vencedor R2_2', 'Vencedor R2_2'],
      winner: null,
      status: 'pending'
    }
  ]
};

// Função para encontrar partidas dependentes (cópia da lógica atual)
function findDependentMatches(completedMatch, allMatches) {
  const dependentMatches = [];
  
  console.log(`🔍 [FIND DEPENDENT] ===== BUSCANDO DEPENDÊNCIAS =====`);
  console.log(`🔍 [FIND DEPENDENT] Match concluída: R${completedMatch.round}_${completedMatch.position}`);
  
  // Lógica para Beach Tennis
  const nextRound = completedMatch.round + 1;
  let nextPosition;
  
  if (completedMatch.round === 1) {
    // Quartas de final → Semifinais: posição se mantém
    nextPosition = completedMatch.position;
  } else {
    // Lógica padrão: posição dividida por 2 (arredondada para cima)
    nextPosition = Math.ceil(completedMatch.position / 2);
  }
  
  console.log(`🔍 [FIND DEPENDENT] Buscando próxima partida: R${nextRound}_${nextPosition}`);
  
  // Buscar partida da próxima rodada
  const nextMatch = allMatches.find(m => 
    m.stage === completedMatch.stage && 
    m.round === nextRound && 
    m.position === nextPosition
  );
  
  if (nextMatch) {
    dependentMatches.push(nextMatch);
    console.log(`✅ [FIND DEPENDENT] Match dependente encontrada: ${nextMatch.id}`);
    console.log(`    Team1: ${Array.isArray(nextMatch.team1) ? nextMatch.team1.join(' & ') : nextMatch.team1}`);
    console.log(`    Team2: ${Array.isArray(nextMatch.team2) ? nextMatch.team2.join(' & ') : nextMatch.team2}`);
  } else {
    console.log(`❌ [FIND DEPENDENT] Nenhuma match dependente encontrada`);
  }
  
  console.log(`🔍 [FIND DEPENDENT] Total de dependentes encontradas: ${dependentMatches.length}`);
  return dependentMatches;
}

// Função para avançar vencedor (cópia da lógica atual)
function advanceWinnerToMatch(winnerTeam, completedMatch, targetMatch) {
  console.log(`🚀 [ADVANCE] ===== INICIANDO AVANÇO PARA MATCH ${targetMatch.id} =====`);
  
  // Determinar qual slot da próxima partida deve receber o vencedor
  let shouldUpdateTeam1 = false;
  let shouldUpdateTeam2 = false;
  
  // Lógica específica para Beach Tennis (6 duplas)
  if (completedMatch.round === 1 && targetMatch.round === 2) {
    // Quartas → Semifinais: sempre vai para team2 (1º e 2º já estão em team1)
    shouldUpdateTeam2 = true;
    console.log(`🏐 [Beach Tennis] QF${completedMatch.position} winner → SF${targetMatch.position} team2`);
  } else if (completedMatch.round === 2 && targetMatch.round === 3) {
    // Semifinais → Final: SF1 → team1, SF2 → team2
    shouldUpdateTeam1 = completedMatch.position === 1;
    shouldUpdateTeam2 = completedMatch.position === 2;
    console.log(`🏐 [Beach Tennis] SF${completedMatch.position} winner → Final ${shouldUpdateTeam1 ? 'team1' : 'team2'}`);
  } else {
    // Lógica padrão: posição ímpar → team1, par → team2
    shouldUpdateTeam1 = completedMatch.position % 2 === 1;
    shouldUpdateTeam2 = !shouldUpdateTeam1;
    console.log(`📋 [Standard] Position ${completedMatch.position} → ${shouldUpdateTeam1 ? 'team1' : 'team2'}`);
  }
  
  // Aplicar a atualização
  let updatedTeam1 = targetMatch.team1;
  let updatedTeam2 = targetMatch.team2;
  let hasChanges = false;
  
  if (shouldUpdateTeam1) {
    updatedTeam1 = winnerTeam;
    hasChanges = true;
    console.log(`🔄 [ADVANCE] Substituindo team1 em match ${targetMatch.id}:`, {
      de: targetMatch.team1,
      para: winnerTeam
    });
  }
  
  if (shouldUpdateTeam2) {
    updatedTeam2 = winnerTeam;
    hasChanges = true;
    console.log(`🔄 [ADVANCE] Substituindo team2 em match ${targetMatch.id}:`, {
      de: targetMatch.team2,
      para: winnerTeam
    });
  }
  
  if (hasChanges) {
    console.log(`✅ [ADVANCE] Mudanças aplicadas com sucesso!`);
    
    // Simular atualização local
    targetMatch.team1 = updatedTeam1;
    targetMatch.team2 = updatedTeam2;
    
    return { success: true, updatedMatch: targetMatch };
  } else {
    console.log(`ℹ️ [ADVANCE] Nenhuma alteração necessária para match ${targetMatch.id}`);
    return { success: false, reason: 'No changes needed' };
  }
}

// Teste 1: Simular conclusão da QF1
console.log(`\n🧪 TESTE 1: Conclusão da Quartas de Final 1`);
console.log(`=====================================`);

const qf1 = mockTournament.matches[0]; // QF1 já concluída
const dependentMatchesQF1 = findDependentMatches(qf1, mockTournament.matches);

if (dependentMatchesQF1.length > 0) {
  const winnerQF1 = qf1.winner;
  const targetSF1 = dependentMatchesQF1[0];
  
  console.log(`\n🎯 Antes do avanço:`);
  console.log(`SF1 Team1: ${targetSF1.team1.join(' & ')}`);
  console.log(`SF1 Team2: ${targetSF1.team2.join(' & ')}`);
  
  const result = advanceWinnerToMatch(winnerQF1, qf1, targetSF1);
  
  console.log(`\n🎯 Após o avanço:`);
  console.log(`SF1 Team1: ${targetSF1.team1.join(' & ')}`);
  console.log(`SF1 Team2: ${targetSF1.team2.join(' & ')}`);
  console.log(`Resultado: ${result.success ? 'SUCESSO' : 'FALHA'}`);
}

// Teste 2: Simular conclusão da QF2
console.log(`\n🧪 TESTE 2: Conclusão da Quartas de Final 2`);
console.log(`=====================================`);

const qf2 = mockTournament.matches[1]; // QF2 já concluída
const dependentMatchesQF2 = findDependentMatches(qf2, mockTournament.matches);

if (dependentMatchesQF2.length > 0) {
  const winnerQF2 = qf2.winner;
  const targetSF2 = dependentMatchesQF2[0];
  
  console.log(`\n🎯 Antes do avanço:`);
  console.log(`SF2 Team1: ${targetSF2.team1.join(' & ')}`);
  console.log(`SF2 Team2: ${targetSF2.team2.join(' & ')}`);
  
  const result = advanceWinnerToMatch(winnerQF2, qf2, targetSF2);
  
  console.log(`\n🎯 Após o avanço:`);
  console.log(`SF2 Team1: ${targetSF2.team1.join(' & ')}`);
  console.log(`SF2 Team2: ${targetSF2.team2.join(' & ')}`);
  console.log(`Resultado: ${result.success ? 'SUCESSO' : 'FALHA'}`);
}

// Mostrar estado final do torneio
console.log(`\n📊 ESTADO FINAL DO TORNEIO:`);
console.log(`============================`);
mockTournament.matches.forEach((match, index) => {
  console.log(`${index + 1}. ${match.id} (R${match.round}_${match.position}):`);
  console.log(`   Team1: ${Array.isArray(match.team1) ? match.team1.join(' & ') : match.team1}`);
  console.log(`   Team2: ${Array.isArray(match.team2) ? match.team2.join(' & ') : match.team2}`);
  console.log(`   Status: ${match.status}`);
  if (match.winner) {
    console.log(`   Winner: ${Array.isArray(match.winner) ? match.winner.join(' & ') : match.winner}`);
  }
  console.log('');
});

console.log(`\n🎯 ANÁLISE: Verificar se os placeholders foram substituídos corretamente nas semifinais!`);
