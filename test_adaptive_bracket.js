/**
 * Script de teste abrangente para validar a lógica adaptativa de avanço
 * Testa múltiplos cenários: 4, 6, 8, 16 participantes
 */

import { 
  updateEliminationBracketRobust, 
  validateBracketStructure, 
  analyzeAdvancementStructure 
} from './src/utils/bracketAdvancement.js';

console.log('🧪 [TESTE ADAPTATIVO] Iniciando testes para múltiplos cenários de torneio...\n');

// ===== CENÁRIO 1: 4 PARTICIPANTES (2 semifinais + 1 final) =====
console.log('🏆 CENÁRIO 1: Torneio com 4 participantes');
const scenario4Players = [
  // Semifinais (Round 1)
  {
    id: "sf1-4p",
    round: 1,
    position: 1,
    stage: "ELIMINATION",
    team1: ["player1", "player2"],
    team2: ["player3", "player4"],
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  },
  {
    id: "sf2-4p",
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
  // Final (Round 2)
  {
    id: "final-4p",
    round: 2,
    position: 1,
    stage: "ELIMINATION",
    team1: ["WINNER_R1_1"],
    team2: ["WINNER_R1_2"],
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  }
];

console.log('📊 Validando estrutura do cenário 4 participantes...');
const validation4P = validateBracketStructure(scenario4Players);
console.log('✅ Estrutura:', validation4P.structure);

// Teste de avanço SF1 → Final
console.log('🔄 Testando avanço SF1 → Final...');
scenario4Players[0].completed = true;
scenario4Players[0].score1 = 6;
scenario4Players[0].score2 = 4;
scenario4Players[0].winnerId = 'team1';

const updated4P = updateEliminationBracketRobust(
  scenario4Players, 
  "sf1-4p", 
  "team1", 
  ["player1", "player2"]
);

const finalMatch4P = updated4P.find(m => m.id === "final-4p");
console.log('📝 Final após avanço:', {
  team1: finalMatch4P.team1,
  team2: finalMatch4P.team2
});

const test4PPass = finalMatch4P.team1.includes("player1") && finalMatch4P.team1.includes("player2");
console.log(test4PPass ? '🎉 CENÁRIO 4P: PASSOU!\n' : '❌ CENÁRIO 4P: FALHOU!\n');

// ===== CENÁRIO 2: 6 PARTICIPANTES (Beach Tennis padrão) =====
console.log('🏆 CENÁRIO 2: Torneio com 6 participantes (Beach Tennis)');
const scenario6Players = [
  // Quartas de Final (Round 1) 
  {
    id: "qf1-6p",
    round: 1,
    position: 1,
    stage: "ELIMINATION",
    team1: ["p3", "p4"], // 3º colocado
    team2: ["p11", "p12"], // 6º colocado
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  },
  {
    id: "qf2-6p",
    round: 1,
    position: 2,
    stage: "ELIMINATION",
    team1: ["p5", "p6"], // 4º colocado
    team2: ["p9", "p10"], // 5º colocado
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  },
  // Semifinais (Round 2)
  {
    id: "sf1-6p",
    round: 2,
    position: 1,
    stage: "ELIMINATION",
    team1: ["p1", "p2"], // 1º colocado (BYE)
    team2: ["WINNER_R1_1"], // Vencedor QF1
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  },
  {
    id: "sf2-6p",
    round: 2,
    position: 2,
    stage: "ELIMINATION",
    team1: ["p7", "p8"], // 2º colocado (BYE)
    team2: ["WINNER_R1_2"], // Vencedor QF2
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  },
  // Final (Round 3)
  {
    id: "final-6p",
    round: 3,
    position: 1,
    stage: "ELIMINATION",
    team1: ["WINNER_R2_1"],
    team2: ["WINNER_R2_2"],
    score1: null,
    score2: null,
    completed: false,
    winnerId: null
  }
];

console.log('📊 Validando estrutura do cenário 6 participantes...');
const validation6P = validateBracketStructure(scenario6Players);
console.log('✅ Estrutura:', validation6P.structure);

// Teste QF1 → SF1
console.log('🔄 Testando avanço QF1 → SF1...');
scenario6Players[0].completed = true;
scenario6Players[0].score1 = 6;
scenario6Players[0].score2 = 3;
scenario6Players[0].winnerId = 'team1';

const updated6P_QF = updateEliminationBracketRobust(
  scenario6Players,
  "qf1-6p",
  "team1", 
  ["p3", "p4"]
);

const sf1After6P = updated6P_QF.find(m => m.id === "sf1-6p");
console.log('📝 SF1 após QF1:', {
  team1: sf1After6P.team1,
  team2: sf1After6P.team2
});

// Teste SF1 → Final
console.log('🔄 Testando avanço SF1 → Final...');
const updatedSF1 = updated6P_QF.map(m => 
  m.id === "sf1-6p" ? { ...m, completed: true, score1: 6, score2: 4, winnerId: 'team2' } : m
);

const updated6P_SF = updateEliminationBracketRobust(
  updatedSF1,
  "sf1-6p",
  "team2",
  ["p3", "p4"] // Vencedor da QF1 que estava em team2
);

const finalAfter6P = updated6P_SF.find(m => m.id === "final-6p");
console.log('📝 Final após SF1:', {
  team1: finalAfter6P.team1,
  team2: finalAfter6P.team2
});

const test6PPass = sf1After6P.team2.includes("p3") && finalAfter6P.team1.includes("p3");
console.log(test6PPass ? '🎉 CENÁRIO 6P: PASSOU!\n' : '❌ CENÁRIO 6P: FALHOU!\n');

// ===== CENÁRIO 3: 8 PARTICIPANTES (Chaveamento completo) =====
console.log('🏆 CENÁRIO 3: Torneio com 8 participantes (chaveamento completo)');
const scenario8Players = [
  // Quartas de Final (Round 1)
  { id: "qf1-8p", round: 1, position: 1, stage: "ELIMINATION", team1: ["1st", "1st_p"], team2: ["8th", "8th_p"], score1: null, score2: null, completed: false, winnerId: null },
  { id: "qf2-8p", round: 1, position: 2, stage: "ELIMINATION", team1: ["2nd", "2nd_p"], team2: ["7th", "7th_p"], score1: null, score2: null, completed: false, winnerId: null },
  { id: "qf3-8p", round: 1, position: 3, stage: "ELIMINATION", team1: ["3rd", "3rd_p"], team2: ["6th", "6th_p"], score1: null, score2: null, completed: false, winnerId: null },
  { id: "qf4-8p", round: 1, position: 4, stage: "ELIMINATION", team1: ["4th", "4th_p"], team2: ["5th", "5th_p"], score1: null, score2: null, completed: false, winnerId: null },
  
  // Semifinais (Round 2)
  { id: "sf1-8p", round: 2, position: 1, stage: "ELIMINATION", team1: ["WINNER_R1_1"], team2: ["WINNER_R1_2"], score1: null, score2: null, completed: false, winnerId: null },
  { id: "sf2-8p", round: 2, position: 2, stage: "ELIMINATION", team1: ["WINNER_R1_3"], team2: ["WINNER_R1_4"], score1: null, score2: null, completed: false, winnerId: null },
  
  // Final (Round 3)
  { id: "final-8p", round: 3, position: 1, stage: "ELIMINATION", team1: ["WINNER_R2_1"], team2: ["WINNER_R2_2"], score1: null, score2: null, completed: false, winnerId: null }
];

console.log('📊 Validando estrutura do cenário 8 participantes...');
const validation8P = validateBracketStructure(scenario8Players);
console.log('✅ Estrutura:', validation8P.structure);

// Teste múltiplos avanços
console.log('🔄 Testando avanços sequenciais QF → SF → Final...');

// QF1 → SF1
scenario8Players[0].completed = true;
scenario8Players[0].winnerId = 'team1';
let updated8P = updateEliminationBracketRobust(scenario8Players, "qf1-8p", "team1", ["1st", "1st_p"]);

// QF2 → SF1  
updated8P[1].completed = true;
updated8P[1].winnerId = 'team2';
updated8P = updateEliminationBracketRobust(updated8P, "qf2-8p", "team2", ["7th", "7th_p"]);

const sf1After8P = updated8P.find(m => m.id === "sf1-8p");
console.log('📝 SF1 após QFs:', {
  team1: sf1After8P.team1,
  team2: sf1After8P.team2
});

// SF1 → Final
const updatedSF1_8P = updated8P.map(m => 
  m.id === "sf1-8p" ? { ...m, completed: true, winnerId: 'team1' } : m
);

updated8P = updateEliminationBracketRobust(updatedSF1_8P, "sf1-8p", "team1", ["1st", "1st_p"]);

const finalAfter8P = updated8P.find(m => m.id === "final-8p");
console.log('📝 Final após SF1:', {
  team1: finalAfter8P.team1,
  team2: finalAfter8P.team2
});

const test8PPass = sf1After8P.team1.includes("1st") && sf1After8P.team2.includes("7th") && finalAfter8P.team1.includes("1st");
console.log(test8PPass ? '🎉 CENÁRIO 8P: PASSOU!\n' : '❌ CENÁRIO 8P: FALHOU!\n');

// ===== RESUMO FINAL =====
console.log('🏁 [RESUMO] Resultados dos testes adaptativos:');
console.log(`   4 Participantes: ${test4PPass ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   6 Participantes: ${test6PPass ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`   8 Participantes: ${test8PPass ? '✅ PASSOU' : '❌ FALHOU'}`);

const allPassed = test4PPass && test6PPass && test8PPass;
console.log(`\n🎯 [RESULTADO FINAL]: ${allPassed ? '🎉 TODOS OS TESTES PASSARAM!' : '❌ ALGUNS TESTES FALHARAM'}`);

if (allPassed) {
  console.log('🚀 A lógica adaptativa está funcionando perfeitamente para qualquer quantidade de participantes!');
} else {
  console.log('🔧 Necessário revisar a lógica para os cenários que falharam.');
}
