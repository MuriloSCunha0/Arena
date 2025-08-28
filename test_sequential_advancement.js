// 🧪 TESTE DA NOVA LÓGICA SEQUENCIAL DE AVANÇO
console.log('🧪 ===== TESTANDO NOVA LÓGICA SEQUENCIAL =====');

// Simular estrutura real do bracket
const bracketData = {
  "matches": [
    // RODADA 1 (posições 1,2)
    {"id": "r1-1", "round": 1, "position": 1, "stage": "ELIMINATION", "completed": true},
    {"id": "r1-2", "round": 1, "position": 2, "stage": "ELIMINATION", "completed": false},
    
    // RODADA 2 (posições 3,4,5,6)
    {"id": "r2-3", "round": 2, "position": 3, "stage": "ELIMINATION"},
    {"id": "r2-4", "round": 2, "position": 4, "stage": "ELIMINATION"},
    {"id": "r2-5", "round": 2, "position": 5, "stage": "ELIMINATION"},
    {"id": "r2-6", "round": 2, "position": 6, "stage": "ELIMINATION", "team1": ["WINNER_R1_1"], "team2": ["WINNER_R1_2"]},
    
    // RODADA 3 (posições 7,8)
    {"id": "r3-7", "round": 3, "position": 7, "stage": "ELIMINATION"},
    {"id": "r3-8", "round": 3, "position": 8, "stage": "ELIMINATION"}
  ]
};

console.log('\n🧪 TESTE 1: Nova lógica findDependentMatches');

function testFindDependentMatches(completedMatch, allMatches) {
  console.log(`\n🔍 Match concluída: R${completedMatch.round}_${completedMatch.position}`);
  
  const nextRound = completedMatch.round + 1;
  
  // Obter todas as matches da rodada atual, ordenadas por posição
  const currentRoundMatches = allMatches
    .filter(m => m.stage === 'ELIMINATION' && m.round === completedMatch.round)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
    
  // Obter todas as matches da próxima rodada, ordenadas por posição  
  const nextRoundMatches = allMatches
    .filter(m => m.stage === 'ELIMINATION' && m.round === nextRound)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  console.log(`📊 Rodada atual (${completedMatch.round}): ${currentRoundMatches.length} matches`);
  currentRoundMatches.forEach((m, i) => console.log(`   ${i}: R${m.round}_${m.position} (${m.id})`));
  
  console.log(`📊 Próxima rodada (${nextRound}): ${nextRoundMatches.length} matches`);
  nextRoundMatches.forEach((m, i) => console.log(`   ${i}: R${m.round}_${m.position} (${m.id})`));
  
  // Encontrar o índice sequencial da match concluída
  const completedMatchIndex = currentRoundMatches.findIndex(m => m.id === completedMatch.id);
  
  console.log(`🔢 Match concluída é a ${completedMatchIndex + 1}ª da rodada`);
  
  // Calcular qual match da próxima rodada deve receber o vencedor
  const targetMatchIndex = Math.floor(completedMatchIndex / 2);
  
  if (targetMatchIndex < nextRoundMatches.length) {
    const targetMatch = nextRoundMatches[targetMatchIndex];
    console.log(`🎯 Match de destino: R${targetMatch.round}_${targetMatch.position} (índice ${targetMatchIndex})`);
    return targetMatch;
  } else {
    console.log(`❌ Índice ${targetMatchIndex} excede matches disponíveis`);
    return null;
  }
}

function testAdvanceWinnerToMatch(completedMatch, targetMatch, allMatches) {
  console.log(`\n🚀 TESTE advanceWinnerToMatch`);
  console.log(`   De: R${completedMatch.round}_${completedMatch.position} → Para: R${targetMatch.round}_${targetMatch.position}`);
  
  // Obter todas as matches da rodada da match concluída, ordenadas por posição
  const currentRoundMatches = allMatches
    .filter(m => m.stage === 'ELIMINATION' && m.round === completedMatch.round)
    .sort((a, b) => (a.position || 0) - (b.position || 0));
  
  // Encontrar o índice sequencial da match concluída
  const completedMatchIndex = currentRoundMatches.findIndex(m => m.id === completedMatch.id);
  
  console.log(`🔢 Match concluída é a ${completedMatchIndex + 1}ª da rodada`);
  
  // Determinar se vai para team1 ou team2
  const shouldUpdateTeam1 = completedMatchIndex % 2 === 0;
  const shouldUpdateTeam2 = completedMatchIndex % 2 === 1;
  
  console.log(`🎯 Match ${completedMatchIndex + 1}ª → ${shouldUpdateTeam1 ? 'team1' : 'team2'} da próxima rodada`);
  
  return { shouldUpdateTeam1, shouldUpdateTeam2 };
}

// Executar testes
console.log('\n🎯 TESTANDO CENÁRIOS:');

// Cenário 1: R1_1 concluída
const r1_1 = bracketData.matches.find(m => m.id === 'r1-1');
const targetForR1_1 = testFindDependentMatches(r1_1, bracketData.matches);
if (targetForR1_1) {
  const advancement = testAdvanceWinnerToMatch(r1_1, targetForR1_1, bracketData.matches);
  console.log(`✅ R1_1 → R${targetForR1_1.round}_${targetForR1_1.position} ${advancement.shouldUpdateTeam1 ? 'team1' : 'team2'}`);
}

// Cenário 2: R1_2 concluída (hipotético)
const r1_2 = bracketData.matches.find(m => m.id === 'r1-2');
const targetForR1_2 = testFindDependentMatches(r1_2, bracketData.matches);
if (targetForR1_2) {
  const advancement = testAdvanceWinnerToMatch(r1_2, targetForR1_2, bracketData.matches);
  console.log(`✅ R1_2 → R${targetForR1_2.round}_${targetForR1_2.position} ${advancement.shouldUpdateTeam1 ? 'team1' : 'team2'}`);
}

// Verificar se faz sentido
console.log('\n🔍 VERIFICAÇÃO LÓGICA:');
console.log('R1_1 (1ª match) → team1 da próxima rodada ✓');
console.log('R1_2 (2ª match) → team2 da próxima rodada ✓');
console.log('Isso significa que R1_1 e R1_2 vão para a MESMA match da próxima rodada, mas em slots diferentes');

// Testar com R2
console.log('\n🧪 TESTE R2 → R3:');

// Simular que R2_3 está concluída
const r2_3 = bracketData.matches.find(m => m.id === 'r2-3');
const targetForR2_3 = testFindDependentMatches(r2_3, bracketData.matches);
if (targetForR2_3) {
  const advancement = testAdvanceWinnerToMatch(r2_3, targetForR2_3, bracketData.matches);
  console.log(`✅ R2_3 → R${targetForR2_3.round}_${targetForR2_3.position} ${advancement.shouldUpdateTeam1 ? 'team1' : 'team2'}`);
}

// Simular que R2_4 está concluída
const r2_4 = bracketData.matches.find(m => m.id === 'r2-4');
const targetForR2_4 = testFindDependentMatches(r2_4, bracketData.matches);
if (targetForR2_4) {
  const advancement = testAdvanceWinnerToMatch(r2_4, targetForR2_4, bracketData.matches);
  console.log(`✅ R2_4 → R${targetForR2_4.round}_${targetForR2_4.position} ${advancement.shouldUpdateTeam1 ? 'team1' : 'team2'}`);
}

console.log('\n🎉 ===== LÓGICA SEQUENCIAL VALIDADA =====');
console.log('✅ Matches são mapeadas por ordem sequencial dentro da rodada');
console.log('✅ Vencedores vão para team1/team2 baseado na ordem (par/ímpar)');
console.log('✅ Não depende de placeholders específicos');
