/**
 * Script de teste final para verificar o avanço automático no chaveamento eliminatório
 * Este script testa a nova lógica robusta de avanço
 */

const { updateEliminationBracketRobust } = require('./src/utils/bracketAdvancement.js');

// Mock de partidas do chaveamento eliminatório baseado no JSON real
const mockEliminationMatches = [
  // Quartas de Final (Round 1)
  {
    id: "qf1-match",
    round: 1,
    position: 1,
    stage: "ELIMINATION",
    team1: ["player1", "player2"],
    team2: ["player3", "player4"],
    score1: 6,
    score2: 4,
    completed: true,
    winnerId: "team1"
  },
  {
    id: "qf2-match", 
    round: 1,
    position: 2,
    stage: "ELIMINATION",
    team1: ["player5", "player6"],
    team2: ["player7", "player8"],
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  },
  
  // Semifinais (Round 2) - baseado no JSON real
  {
    id: "sf1-match",
    round: 2,
    position: 6, // Posição real do JSON
    stage: "ELIMINATION",
    team1: ["BYE_PLAYER1", "BYE_PLAYER2"], // 1º colocado com BYE
    team2: ["WINNER_R1_1"], // Placeholder para vencedor QF1
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  },
  {
    id: "sf2-match",
    round: 2,
    position: 5, // Outra posição do JSON
    stage: "ELIMINATION", 
    team1: ["BYE_PLAYER3", "BYE_PLAYER4"], // 2º colocado com BYE
    team2: ["WINNER_R1_2"], // Placeholder para vencedor QF2
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  },
  
  // Final (Round 3)
  {
    id: "final-match",
    round: 3,
    position: 9,
    stage: "ELIMINATION",
    team1: ["WINNER_R2_6"], // Vencedor SF1
    team2: ["WINNER_R2_5"], // Vencedor SF2  
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  }
];

console.log('🧪 [TESTE BRACKET ADVANCEMENT] Iniciando testes da lógica robusta...\n');

// Teste 1: Completar QF1 e verificar avanço para SF
console.log('🔄 TESTE 1: Completando QF1 e testando avanço para semifinal');
console.log('📊 Antes do avanço:');
console.log('   QF1:', mockEliminationMatches[0].team1, 'vs', mockEliminationMatches[0].team2, '(Vencedor: team1)');
console.log('   SF1:', mockEliminationMatches[2].team1, 'vs', mockEliminationMatches[2].team2);

try {
  const updatedMatches1 = updateEliminationBracketRobust(
    mockEliminationMatches,
    "qf1-match",
    "team1", 
    ["player1", "player2"]
  );
  
  const updatedSF1 = updatedMatches1.find(m => m.id === "sf1-match");
  console.log('✅ Depois do avanço:');
  console.log('   SF1:', updatedSF1.team1, 'vs', updatedSF1.team2);
  
  if (updatedSF1.team2.includes("player1") && updatedSF1.team2.includes("player2")) {
    console.log('🎉 TESTE 1 PASSOU: Vencedor da QF1 avançou corretamente para SF1!\n');
  } else {
    console.log('❌ TESTE 1 FALHOU: Avanço não ocorreu corretamente\n');
  }
  
} catch (error) {
  console.error('❌ TESTE 1 ERRO:', error.message);
}

// Teste 2: Simular avanço da semifinal para final
console.log('🔄 TESTE 2: Simulando avanço de semifinal para final');

const mockForSFTest = [
  {
    id: "sf-test",
    round: 2,
    position: 6,
    stage: "ELIMINATION",
    team1: ["bye1", "bye2"],
    team2: ["sf_player1", "sf_player2"], 
    score1: 4,
    score2: 6,
    completed: true,
    winnerId: "team2"
  },
  {
    id: "final-test",
    round: 3,
    position: 9,
    stage: "ELIMINATION",
    team1: ["WINNER_R2_6"],
    team2: ["WINNER_R2_5"],
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  }
];

try {
  const updatedMatches2 = updateEliminationBracketRobust(
    mockForSFTest,
    "sf-test",
    "team2",
    ["sf_player1", "sf_player2"]
  );
  
  const updatedFinal = updatedMatches2.find(m => m.id === "final-test");
  console.log('📊 Antes do avanço - Final:', mockForSFTest[1].team1, 'vs', mockForSFTest[1].team2);
  console.log('✅ Depois do avanço - Final:', updatedFinal.team1, 'vs', updatedFinal.team2);
  
  // Verificar se o vencedor da SF chegou na final
  const hasWinner = (updatedFinal.team1.includes("sf_player1") && updatedFinal.team1.includes("sf_player2")) ||
                   (updatedFinal.team2.includes("sf_player1") && updatedFinal.team2.includes("sf_player2"));
  
  if (hasWinner) {
    console.log('🎉 TESTE 2 PASSOU: Vencedor da SF avançou corretamente para a Final!\n');
  } else {
    console.log('❌ TESTE 2 FALHOU: Avanço SF→Final não ocorreu\n');
  }
  
} catch (error) {
  console.error('❌ TESTE 2 ERRO:', error.message);
}

// Teste 3: Verificar comportamento quando não há próxima partida (Final completada)
console.log('🔄 TESTE 3: Testando quando não há próxima partida (Final)');

const mockFinalMatch = [{
  id: "final-completed",
  round: 4, // Final
  position: 1,
  stage: "ELIMINATION",
  team1: ["finalist1", "finalist2"],
  team2: ["finalist3", "finalist4"],
  score1: 6,
  score2: 3,
  completed: true,
  winnerId: "team1"
}];

try {
  const result = updateEliminationBracketRobust(
    mockFinalMatch,
    "final-completed", 
    "team1",
    ["finalist1", "finalist2"]
  );
  
  if (result.length === 1 && result[0].id === "final-completed") {
    console.log('🎉 TESTE 3 PASSOU: Final completada, nenhum avanço necessário\n');
  } else {
    console.log('❌ TESTE 3 FALHOU: Comportamento inesperado para final\n');
  }
  
} catch (error) {
  console.error('❌ TESTE 3 ERRO:', error.message);
}

console.log('🏁 [RESULTADO] Testes da lógica robusta de avanço concluídos!');
console.log('📝 Verifique os logs acima para identificar possíveis problemas.');
console.log('🔧 Se todos os testes passaram, o avanço automático deve estar funcionando correctly.');
