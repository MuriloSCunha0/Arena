/**
 * DIAGNÓSTICO FINAL: Estrutura das Eliminatórias
 * Este script analisa a estrutura real do bracket baseada nos logs fornecidos
 */

console.log('🔍 [DIAGNOSIS] ===== ANÁLISE DA ESTRUTURA ELIMINATÓRIA =====');

// Dados extraídos dos logs do usuário
const eliminationMatches = [
  // Rodada 1 - 2 partidas
  { id: '18ae2b0d-3cf2-4cab-a323-1cfe6b270036', round: 1, position: 1, stage: 'ELIMINATION' },
  { id: 'e6cc951f-4823-42e9-93fe-1bc05e63d4aa', round: 1, position: 2, stage: 'ELIMINATION' },
  
  // Rodada 2 - 4 partidas
  { id: 'c59042d8-e790-4c13-b726-3005e449f7a4', round: 2, position: 3, stage: 'ELIMINATION' },
  { id: 'ae45535a-a488-4c24-aa82-9df0e8796060', round: 2, position: 4, stage: 'ELIMINATION' },
  { id: '1fe1fa82-ed42-4bd0-b8a8-000f59d0d413', round: 2, position: 5, stage: 'ELIMINATION' },
  { id: 'f8a67100-d41f-440b-b50b-8ad1cea61949', round: 2, position: 6, stage: 'ELIMINATION' },
  
  // Rodada 3 - 2 partidas (Semifinais)
  { id: 'de1ee903-24f4-4d13-b368-2b1a0d1f16b2', round: 3, position: 7, stage: 'ELIMINATION' },
  { id: '085eac43-e724-49cb-b98e-eb332a86014f', round: 3, position: 8, stage: 'ELIMINATION' },
  
  // Rodada 4 - 1 partida (Final)
  { id: '1a258789-c458-4885-a973-c686c4383def', round: 4, position: 9, stage: 'ELIMINATION' }
];

console.log('📊 ESTRUTURA IDENTIFICADA:');
console.log('Rodada 1: 2 partidas (positions 1, 2)');
console.log('Rodada 2: 4 partidas (positions 3, 4, 5, 6)');
console.log('Rodada 3: 2 partidas (positions 7, 8)');
console.log('Rodada 4: 1 partida (position 9)');

console.log('\n🔗 MAPEAMENTO DE DEPENDÊNCIAS CORRETO:');

// Função corrigida para encontrar dependências
function findDependentMatches(completedMatch, allMatches) {
  const dependentMatches = [];
  const currentRound = completedMatch.round;
  const currentPosition = completedMatch.position;
  let targetRound, targetPosition;
  
  console.log(`\n🔍 Processando: R${currentRound}_${currentPosition}`);
  
  if (currentRound === 1) {
    // R1_1 → R2_3, R1_2 → R2_4
    targetRound = 2;
    targetPosition = currentPosition === 1 ? 3 : 4;
    console.log(`   → R1_${currentPosition} alimenta R2_${targetPosition}`);
    
  } else if (currentRound === 2) {
    // R2_3,R2_4 → R3_7 | R2_5,R2_6 → R3_8
    targetRound = 3;
    if (currentPosition === 3 || currentPosition === 4) {
      targetPosition = 7;
    } else if (currentPosition === 5 || currentPosition === 6) {
      targetPosition = 8;
    }
    console.log(`   → R2_${currentPosition} alimenta R3_${targetPosition}`);
    
  } else if (currentRound === 3) {
    // R3_7,R3_8 → R4_9
    targetRound = 4;
    targetPosition = 9;
    console.log(`   → R3_${currentPosition} alimenta R4_${targetPosition}`);
    
  } else {
    console.log(`   → R${currentRound}_${currentPosition} é final - sem dependentes`);
    return [];
  }
  
  const nextMatch = allMatches.find(m => 
    m.round === targetRound && m.position === targetPosition
  );
  
  if (nextMatch) {
    dependentMatches.push(nextMatch);
    console.log(`   ✅ Dependente encontrada: ${nextMatch.id}`);
  } else {
    console.log(`   ❌ Dependente não encontrada`);
  }
  
  return dependentMatches;
}

// Função corrigida para determinar slot (team1/team2)
function determineTeamSlot(sourceRound, sourcePosition, targetRound, targetPosition) {
  console.log(`\n🎯 Determinando slot para R${sourceRound}_${sourcePosition} → R${targetRound}_${targetPosition}`);
  
  if (sourceRound === 1 && targetRound === 2) {
    // R1_1 → R2_3 team1, R1_2 → R2_4 team1
    console.log(`   → team1 (vencedor da primeira fase)`);
    return { team1: true, team2: false };
    
  } else if (sourceRound === 2 && targetRound === 3) {
    // R2_3 → R3_7 team1, R2_4 → R3_7 team2
    // R2_5 → R3_8 team1, R2_6 → R3_8 team2
    if (targetPosition === 7) {
      const isTeam1 = sourcePosition === 3;
      console.log(`   → ${isTeam1 ? 'team1' : 'team2'} (semifinal 1)`);
      return { team1: isTeam1, team2: !isTeam1 };
    } else if (targetPosition === 8) {
      const isTeam1 = sourcePosition === 5;
      console.log(`   → ${isTeam1 ? 'team1' : 'team2'} (semifinal 2)`);
      return { team1: isTeam1, team2: !isTeam1 };
    }
    
  } else if (sourceRound === 3 && targetRound === 4) {
    // R3_7 → R4_9 team1, R3_8 → R4_9 team2
    const isTeam1 = sourcePosition === 7;
    console.log(`   → ${isTeam1 ? 'team1' : 'team2'} (final)`);
    return { team1: isTeam1, team2: !isTeam1 };
  }
  
  console.log(`   ❌ Mapeamento não encontrado`);
  return { team1: false, team2: false };
}

// Testar todas as dependências
console.log('\n🧪 TESTE DE TODAS AS DEPENDÊNCIAS:');
eliminationMatches.forEach(match => {
  const dependents = findDependentMatches(match, eliminationMatches);
  if (dependents.length > 0) {
    const dependent = dependents[0];
    const slots = determineTeamSlot(match.round, match.position, dependent.round, dependent.position);
  }
});

console.log('\n✅ RESUMO DAS CORREÇÕES NECESSÁRIAS:');
console.log('1. findDependentMatches() - Usar mapeamento específico por posição');
console.log('2. advanceWinnerToMatch() - Determinar slot correto (team1/team2)');
console.log('3. Usar stage === "ELIMINATION" na busca');
console.log('4. Logs detalhados para debugging');

console.log('\n🎯 PRÓXIMOS PASSOS:');
console.log('1. Aplicar as correções no código');
console.log('2. Testar completando uma partida R1_1');
console.log('3. Verificar se R2_3 team1 é atualizada');
console.log('4. Confirmar avanço automático funcionando');

console.log('\n🔍 [DIAGNOSIS] ===== ANÁLISE CONCLUÍDA =====');
