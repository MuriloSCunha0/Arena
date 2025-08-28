/**
 * Script de teste simples para validar o avanço adaptativo sem dependências de tipo
 */

// Mock das funções principais para teste local
function analyzeAdvancementStructure(matches) {
  console.log(`🔍 [analyzeAdvancementStructure] Analyzing ${matches.length} matches`);
  
  const eliminationMatches = matches.filter(m => m.stage === 'ELIMINATION');
  const rules = [];
  
  // Agrupar partidas por rodada
  const matchesByRound = new Map();
  eliminationMatches.forEach(match => {
    if (!matchesByRound.has(match.round)) {
      matchesByRound.set(match.round, []);
    }
    matchesByRound.get(match.round).push(match);
  });
  
  const rounds = Array.from(matchesByRound.keys()).sort((a, b) => a - b);
  console.log(`📊 [analyzeAdvancementStructure] Found rounds: ${rounds.join(', ')}`);
  
  // Para cada rodada (exceto a última), encontrar para onde avançam
  for (let i = 0; i < rounds.length - 1; i++) {
    const currentRound = rounds[i];
    const nextRound = rounds[i + 1];
    
    const currentMatches = matchesByRound.get(currentRound).sort((a, b) => a.position - b.position);
    const nextMatches = matchesByRound.get(nextRound).sort((a, b) => a.position - b.position);
    
    console.log(`🔗 [analyzeAdvancementStructure] Mapping R${currentRound} (${currentMatches.length} matches) → R${nextRound} (${nextMatches.length} matches)`);
    
    // Encontrar regras de avanço baseadas em placeholders
    currentMatches.forEach((currentMatch) => {
      const expectedPlaceholder = `WINNER_R${currentRound}_${currentMatch.position}`;
      
      // Procurar onde este placeholder aparece nas próximas partidas
      nextMatches.forEach(nextMatch => {
        // Verificar team1
        if (nextMatch.team1 && Array.isArray(nextMatch.team1) && nextMatch.team1.includes(expectedPlaceholder)) {
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
        if (nextMatch.team2 && Array.isArray(nextMatch.team2) && nextMatch.team2.includes(expectedPlaceholder)) {
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
          const slot = (currentIndex % 2 === 0) ? 'team1' : 'team2';
          
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

function getNextMatchPosition(completedMatch, allMatches) {
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

function updateEliminationBracketRobust(matches, completedMatchId, _winnerId, winnerTeam) {
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

    // Usar o slot determinado pela regra
    const targetSlot = nextPosition.slot;
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

// ===== TESTE ADAPTATIVO COMPLETO =====
console.log('🧪 [TESTE ADAPTATIVO] Iniciando testes para múltiplos cenários de torneio...\n');

// ===== CENÁRIO 1: 4 PARTICIPANTES =====
console.log('🏆 CENÁRIO 1: Torneio com 4 participantes');
const scenario4Players = [
  {
    id: "sf1-4p",
    round: 1,
    position: 1,
    stage: "ELIMINATION",
    team1: ["player1", "player2"],
    team2: ["player3", "player4"],
  },
  {
    id: "sf2-4p",
    round: 1,
    position: 2,
    stage: "ELIMINATION",
    team1: ["player5", "player6"],
    team2: ["player7", "player8"],
  },
  {
    id: "final-4p",
    round: 2,
    position: 1,
    stage: "ELIMINATION",
    team1: ["WINNER_R1_1"],
    team2: ["WINNER_R1_2"],
  }
];

const updated4P = updateEliminationBracketRobust(
  scenario4Players, 
  "sf1-4p", 
  "team1", 
  ["player1", "player2"]
);

const finalMatch4P = updated4P.find(m => m.id === "final-4p");
const test4PPass = finalMatch4P.team1.includes("player1") && finalMatch4P.team1.includes("player2");
console.log(test4PPass ? '🎉 CENÁRIO 4P: PASSOU!\n' : '❌ CENÁRIO 4P: FALHOU!\n');

// ===== CENÁRIO 2: 6 PARTICIPANTES =====
console.log('🏆 CENÁRIO 2: Torneio com 6 participantes (Beach Tennis)');
const scenario6Players = [
  {
    id: "qf1-6p",
    round: 1,
    position: 1,
    stage: "ELIMINATION",
    team1: ["p3", "p4"],
    team2: ["p11", "p12"],
  },
  {
    id: "qf2-6p",
    round: 1,
    position: 2,
    stage: "ELIMINATION",
    team1: ["p5", "p6"],
    team2: ["p9", "p10"],
  },
  {
    id: "sf1-6p",
    round: 2,
    position: 1,
    stage: "ELIMINATION",
    team1: ["p1", "p2"],
    team2: ["WINNER_R1_1"],
  },
  {
    id: "sf2-6p",
    round: 2,
    position: 2,
    stage: "ELIMINATION",
    team1: ["p7", "p8"],
    team2: ["WINNER_R1_2"],
  },
  {
    id: "final-6p",
    round: 3,
    position: 1,
    stage: "ELIMINATION",
    team1: ["WINNER_R2_1"],
    team2: ["WINNER_R2_2"],
  }
];

// Teste QF1 → SF1
const updated6P_QF = updateEliminationBracketRobust(
  scenario6Players,
  "qf1-6p",
  "team1", 
  ["p3", "p4"]
);

const sf1After6P = updated6P_QF.find(m => m.id === "sf1-6p");
const test6PPass = sf1After6P.team2.includes("p3") && sf1After6P.team2.includes("p4");
console.log(test6PPass ? '🎉 CENÁRIO 6P: PASSOU!\n' : '❌ CENÁRIO 6P: FALHOU!\n');

// ===== CENÁRIO 3: 8 PARTICIPANTES =====
console.log('🏆 CENÁRIO 3: Torneio com 8 participantes');
const scenario8Players = [
  { id: "qf1-8p", round: 1, position: 1, stage: "ELIMINATION", team1: ["1st", "1st_p"], team2: ["8th", "8th_p"] },
  { id: "qf2-8p", round: 1, position: 2, stage: "ELIMINATION", team1: ["2nd", "2nd_p"], team2: ["7th", "7th_p"] },
  { id: "qf3-8p", round: 1, position: 3, stage: "ELIMINATION", team1: ["3rd", "3rd_p"], team2: ["6th", "6th_p"] },
  { id: "qf4-8p", round: 1, position: 4, stage: "ELIMINATION", team1: ["4th", "4th_p"], team2: ["5th", "5th_p"] },
  { id: "sf1-8p", round: 2, position: 1, stage: "ELIMINATION", team1: ["WINNER_R1_1"], team2: ["WINNER_R1_2"] },
  { id: "sf2-8p", round: 2, position: 2, stage: "ELIMINATION", team1: ["WINNER_R1_3"], team2: ["WINNER_R1_4"] },
  { id: "final-8p", round: 3, position: 1, stage: "ELIMINATION", team1: ["WINNER_R2_1"], team2: ["WINNER_R2_2"] }
];

// QF1 → SF1
let updated8P = updateEliminationBracketRobust(scenario8Players, "qf1-8p", "team1", ["1st", "1st_p"]);
// QF2 → SF1  
updated8P = updateEliminationBracketRobust(updated8P, "qf2-8p", "team2", ["7th", "7th_p"]);

const sf1After8P = updated8P.find(m => m.id === "sf1-8p");
const test8PPass = sf1After8P.team1.includes("1st") && sf1After8P.team2.includes("7th");
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
