// 🔍 DIAGNÓSTICO DETALHADO DO AVANÇO AUTOMÁTICO
// Analisa especificamente por que R1_1 concluída não está avançando para R2_6

console.log('🔍 ===== DIAGNÓSTICO DETALHADO DO AVANÇO AUTOMÁTICO =====');

// Simular os dados do banco exatamente como estão
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
      "id": "31222ba9-b221-4302-9d5f-4caab29234e6", 
      "round": 1, 
      "position": 2,
      "stage": "ELIMINATION", 
      "team1": ["150f5235-2bc9-4942-9776-418de09fdb3a", "4b1314a1-bb7a-4f82-a8fd-02917ecd8fae"], 
      "team2": ["442dbded-97de-4b44-a512-15836b21c67e", "a7bbbab4-064d-4040-9345-1e9cd1446bba"], 
      "score1": 0, 
      "score2": 0, 
      "winnerId": null, 
      "completed": false
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

console.log('\n📊 ANÁLISE DOS DADOS:');

// 1. Verificar match concluída
const completedMatch = bracketData.matches.find(m => m.id === "86906994-c0ef-4656-8ad7-111ea79b188a");
console.log('✅ Match R1_1 concluída:', {
  id: completedMatch.id,
  round: completedMatch.round,
  position: completedMatch.position,
  winnerId: completedMatch.winnerId,
  completed: completedMatch.completed,
  winnerTeam: completedMatch.winnerId === 'team1' ? completedMatch.team1 : completedMatch.team2
});

// 2. Simular lógica findDependentMatches
console.log('\n🔍 SIMULANDO findDependentMatches:');
const currentRound = completedMatch.round;  // 1
const currentPosition = completedMatch.position;  // 1

let targetRound, targetPosition;

if (currentRound === 1) {
  // PROBLEMA AQUI! A lógica atual está:
  // R1_1 → R2_3, R1_2 → R2_4
  // MAS deveria ser:
  // R1_1 → R2_6, R1_2 → R2_6
  
  console.log('❌ LÓGICA ATUAL (ERRADA):');
  targetRound = 2;
  targetPosition = currentPosition === 1 ? 3 : 4;
  console.log(`   R1_${currentPosition} → R2_${targetPosition}`);
  
  console.log('✅ LÓGICA CORRETA (BASEADA NO BANCO):');
  // R1_1 e R1_2 → R2_6 (que tem WINNER_R1_1 e WINNER_R1_2)
  targetRound = 2;
  targetPosition = 6;
  console.log(`   R1_${currentPosition} → R2_${targetPosition}`);
}

// 3. Verificar match dependente no banco
const dependentMatch = bracketData.matches.find(m => 
  m.stage === 'ELIMINATION' && 
  m.round === 2 && 
  m.position === 6
);

console.log('\n🎯 MATCH DEPENDENTE (R2_6):');
console.log('Match encontrada:', dependentMatch ? 'SIM' : 'NÃO');
if (dependentMatch) {
  console.log({
    id: dependentMatch.id,
    round: dependentMatch.round,
    position: dependentMatch.position,
    team1: dependentMatch.team1,
    team2: dependentMatch.team2,
    hasPlaceholder1: dependentMatch.team1 && dependentMatch.team1.includes('WINNER_R1_1'),
    hasPlaceholder2: dependentMatch.team2 && dependentMatch.team2.includes('WINNER_R1_2')
  });
}

// 4. Simular lógica advanceWinnerToMatch
console.log('\n🚀 SIMULANDO advanceWinnerToMatch:');
const winnerTeam = completedMatch.team1; // Vencedor de R1_1

if (dependentMatch) {
  console.log('Vencedor a avançar:', winnerTeam);
  console.log('Match de destino atual:', {
    team1: dependentMatch.team1,
    team2: dependentMatch.team2
  });
  
  // Determinar qual time substituir
  console.log('\n🔄 LÓGICA DE SUBSTITUIÇÃO:');
  
  // PROBLEMA AQUI TAMBÉM! A lógica atual da advanceWinnerToMatch está:
  console.log('❌ LÓGICA ATUAL (ERRADA):');
  console.log('   Usando mapeamento R1_1 → R2_3, mas deveria ser R1_1 → R2_6');
  
  console.log('✅ LÓGICA CORRETA:');
  // R1_1 vencedor → R2_6 team1 (WINNER_R1_1)
  // R1_2 vencedor → R2_6 team2 (WINNER_R1_2)
  const shouldUpdateTeam1 = dependentMatch.team1 && dependentMatch.team1.includes('WINNER_R1_1');
  const shouldUpdateTeam2 = dependentMatch.team2 && dependentMatch.team2.includes('WINNER_R1_2');
  
  console.log(`   R1_1 vencedor deve substituir: ${shouldUpdateTeam1 ? 'team1' : 'team2'}`);
  console.log(`   Placeholders: team1=${dependentMatch.team1}, team2=${dependentMatch.team2}`);
  
  // Resultado esperado
  const expectedResult = {
    team1: shouldUpdateTeam1 ? winnerTeam : dependentMatch.team1,
    team2: shouldUpdateTeam2 ? winnerTeam : dependentMatch.team2
  };
  
  console.log('   Resultado esperado:', expectedResult);
}

console.log('\n🔧 CONCLUSÃO:');
console.log('O problema está em duas funções:');
console.log('1. findDependentMatches: mapeamento incorreto R1 → R2');
console.log('2. advanceWinnerToMatch: lógica de posicionamento incorreta');
console.log('\n✅ SOLUÇÃO: Corrigir mapeamento para usar placeholders como referência');
