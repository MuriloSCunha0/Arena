// 🧪 TESTE DAS CORREÇÕES NO AVANÇO AUTOMÁTICO
console.log('🧪 ===== TESTANDO CORREÇÕES NO AVANÇO AUTOMÁTICO =====');

// Simular os dados corretos depois das correções
const bracketData = {
  "matches": [
    {
      "id": "86906994-c0ef-4656-8ad7-111ea79b188a", 
      "round": 1, 
      "position": 1,
      "stage": "ELIMINATION", 
      "team1": ["9022356f-e7ad-4fc5-8ce2-d793783f22e1", "30b8eba5-4011-4bff-920d-f1c1d852238a"], 
      "team2": ["1ecdeba6-6368-4168-a31a-6c350959f043", "84710a6f-86e2-4977-aca1-e1949a19dd6d"], 
      "score1": 6, 
      "score2": 0, 
      "winnerId": "team1", 
      "completed": true
    },
    {
      "id": "63c77bdd-abbc-49ae-98d6-07bde86adcc7", 
      "round": 2, 
      "position": 6,
      "stage": "ELIMINATION", 
      "team1": ["WINNER_R1_1"], 
      "team2": ["WINNER_R1_2"], 
      "score1": 0, 
      "score2": 0, 
      "winnerId": null, 
      "completed": false
    }
  ]
};

// 🧪 TESTE 1: Nova lógica findDependentMatches
console.log('\n🧪 TESTE 1: Nova lógica findDependentMatches');

const completedMatch = bracketData.matches[0]; // R1_1 concluída
const allMatches = bracketData.matches;

const expectedPlaceholder = `WINNER_R${completedMatch.round}_${completedMatch.position}`;
console.log(`🔍 Procurando placeholder: ${expectedPlaceholder}`);

const matchesWithPlaceholder = allMatches.filter(match => {
  if (match.stage !== 'ELIMINATION') return false;
  
  const hasPlaceholderInTeam1 = Array.isArray(match.team1) && 
    match.team1.some(player => player === expectedPlaceholder);
  const hasPlaceholderInTeam2 = Array.isArray(match.team2) && 
    match.team2.some(player => player === expectedPlaceholder);
  
  return hasPlaceholderInTeam1 || hasPlaceholderInTeam2;
});

console.log(`✅ Matches encontradas: ${matchesWithPlaceholder.length}`);
if (matchesWithPlaceholder.length > 0) {
  const dependentMatch = matchesWithPlaceholder[0];
  console.log(`   Match: R${dependentMatch.round}_${dependentMatch.position} (${dependentMatch.id})`);
  console.log(`   Team1: ${dependentMatch.team1}`);
  console.log(`   Team2: ${dependentMatch.team2}`);
}

// 🧪 TESTE 2: Nova lógica advanceWinnerToMatch
console.log('\n🧪 TESTE 2: Nova lógica advanceWinnerToMatch');

if (matchesWithPlaceholder.length > 0) {
  const targetMatch = matchesWithPlaceholder[0];
  const winnerTeam = completedMatch.team1; // Vencedor de R1_1
  
  console.log(`🚀 Avançando vencedor: ${winnerTeam}`);
  console.log(`🎯 Para match: R${targetMatch.round}_${targetMatch.position}`);
  
  // Verificar qual time contém o placeholder específico
  const hasPlaceholderInTeam1 = Array.isArray(targetMatch.team1) && 
    targetMatch.team1.some(player => player === expectedPlaceholder);
  const hasPlaceholderInTeam2 = Array.isArray(targetMatch.team2) && 
    targetMatch.team2.some(player => player === expectedPlaceholder);
  
  console.log(`🔍 Placeholder em team1: ${hasPlaceholderInTeam1}`);
  console.log(`🔍 Placeholder em team2: ${hasPlaceholderInTeam2}`);
  
  // Simular a atualização
  let updatedTeam1 = targetMatch.team1;
  let updatedTeam2 = targetMatch.team2;
  
  if (hasPlaceholderInTeam1) {
    updatedTeam1 = winnerTeam;
    console.log(`✅ team1 atualizada: ${JSON.stringify(updatedTeam1)}`);
  }
  
  if (hasPlaceholderInTeam2) {
    updatedTeam2 = winnerTeam;
    console.log(`✅ team2 atualizada: ${JSON.stringify(updatedTeam2)}`);
  }
  
  console.log('\n🎯 RESULTADO FINAL:');
  console.log(`   Team1: ${JSON.stringify(updatedTeam1)}`);
  console.log(`   Team2: ${JSON.stringify(updatedTeam2)}`);
  
  // Verificar se a substituição está correta
  const correctlyReplaced = 
    (hasPlaceholderInTeam1 && JSON.stringify(updatedTeam1) === JSON.stringify(winnerTeam)) ||
    (hasPlaceholderInTeam2 && JSON.stringify(updatedTeam2) === JSON.stringify(winnerTeam));
    
  console.log(`\n${correctlyReplaced ? '✅' : '❌'} TESTE: ${correctlyReplaced ? 'PASSOU' : 'FALHOU'}`);
}

// 🧪 TESTE 3: Verificar se funciona com outros placeholders
console.log('\n🧪 TESTE 3: Testando com outros placeholders');

const otherMatches = [
  {
    "id": "test-match", 
    "round": 3, 
    "position": 7,
    "stage": "ELIMINATION", 
    "team1": ["WINNER_R2_3"], 
    "team2": ["WINNER_R2_4"]
  }
];

// Simular R2_3 concluída
const completedR2_3 = {
  "id": "r2-3-completed",
  "round": 2,
  "position": 3,
  "stage": "ELIMINATION",
  "winnerId": "team1",
  "team1": ["team-a", "team-b"]
};

const placeholderR2_3 = `WINNER_R${completedR2_3.round}_${completedR2_3.position}`;
console.log(`🔍 Testando placeholder: ${placeholderR2_3}`);

const hasPlaceholder = otherMatches[0].team1.includes(placeholderR2_3);
console.log(`✅ Placeholder encontrado: ${hasPlaceholder}`);

if (hasPlaceholder) {
  console.log(`✅ Substituição funcionaria: ${placeholderR2_3} → ${JSON.stringify(completedR2_3.team1)}`);
}

console.log('\n🎉 ===== TESTES CONCLUÍDOS =====');
console.log('🔧 As correções deveriam resolver o problema de avanço automático!');
console.log('📝 Próximo passo: Testar no sistema real');
