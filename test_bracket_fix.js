/**
 * Teste específico para a função generateEliminationBracketWithSmartBye
 */

// Simular dados de entrada (32 duplas classificadas)
const mockQualifiedTeams = [];
for (let i = 1; i <= 32; i++) {
  mockQualifiedTeams.push({
    rank: i,
    teamId: [`player${i}a`, `player${i}b`],
    groupNumber: Math.ceil(i / 4), // Simular 8 grupos de 4
    stats: {
      gameDifference: 32 - i // Times melhores têm maior saldo
    }
  });
}

// Importar função (simulada)
function generateEliminationBracketWithSmartByeTest(qualifiedTeams) {
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const totalTeams = sortedTeams.length;
  
  console.log(`🎾 [SMART BYE TEST] Gerando bracket com ${totalTeams} duplas`);
  
  // Determinar estrutura do bracket
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const byesNeeded = nextPowerOf2 - totalTeams;
  
  console.log(`📊 [SMART BYE TEST] Bracket ${nextPowerOf2} - ${byesNeeded} BYEs necessários`);
  
  if (byesNeeded === 0) {
    // Bracket completo sem BYEs - 32 duplas = 2^5
    console.log(`✅ [SMART BYE TEST] Bracket completo: potência de 2 perfeita`);
    return generateCompleteBracketTest(sortedTeams);
  } else {
    // Bracket com BYEs
    console.log(`⭐ [SMART BYE TEST] Implementando ${byesNeeded} BYEs na estrutura`);
    return generateBracketWithByesTest(sortedTeams, byesNeeded);
  }
}

function generateCompleteBracketTest(sortedTeams) {
  const matches = [];
  const totalTeams = sortedTeams.length;
  
  // Calcular número de rodadas
  const numRounds = Math.ceil(Math.log2(totalTeams));
  console.log(`🏆 [COMPLETE TEST] Total de rodadas necessárias: ${numRounds}`);
  
  // Primeira rodada - criar confrontos diretos
  const firstRoundMatches = Math.floor(totalTeams / 2);
  console.log(`🎯 [COMPLETE TEST] Rodada 1: ${firstRoundMatches} partidas`);
  
  for (let i = 0; i < firstRoundMatches; i++) {
    const team1 = sortedTeams[i * 2];
    const team2 = sortedTeams[i * 2 + 1];
    
    matches.push({
      id: `match_1_${i + 1}`,
      round: 1,
      position: i + 1,
      team1: team1.teamId,
      team2: team2.teamId,
      stage: 'ELIMINATION'
    });
    
    console.log(`   Partida ${i + 1}: ${team1.rank}º vs ${team2.rank}º`);
  }
  
  // Gerar rodadas subsequentes
  generateAdvancementRoundsTest(matches, firstRoundMatches, 2);
  
  // Resumo final
  console.log(`\n📊 [COMPLETE TEST] Resumo final:`);
  const matchesByRound = {};
  matches.forEach(match => {
    const round = match.round;
    matchesByRound[round] = (matchesByRound[round] || 0) + 1;
  });
  
  Object.keys(matchesByRound).forEach(round => {
    const roundName = getRoundNameTest(parseInt(round), numRounds);
    console.log(`   Rodada ${round} (${roundName}): ${matchesByRound[round]} partidas`);
  });
  
  return { matches, totalRounds: numRounds };
}

function generateAdvancementRoundsTest(matches, currentRoundTeams, startRound) {
  let round = startRound;
  let teamsInRound = currentRoundTeams;
  
  console.log(`🔄 [ADVANCE TEST] Iniciando com ${teamsInRound} times na rodada ${round}`);
  
  while (teamsInRound > 1) {
    const matchesInRound = Math.floor(teamsInRound / 2);
    
    console.log(`🔄 [ADVANCE TEST] Rodada ${round}: ${matchesInRound} partidas (${teamsInRound} times)`);
    
    if (matchesInRound <= 0) {
      console.log(`⚠️ [ADVANCE TEST] Nenhuma partida necessária para rodada ${round}, parando`);
      break;
    }
    
    for (let i = 0; i < matchesInRound; i++) {
      matches.push({
        id: `match_${round}_${i + 1}`,
        round: round,
        position: i + 1,
        team1: null, // Será preenchido pelos vencedores
        team2: null, // Será preenchido pelos vencedores
        stage: 'ELIMINATION'
      });
      
      console.log(`   Partida ${i + 1}: Aguardando definição`);
    }
    
    teamsInRound = matchesInRound;
    round++;
  }
  
  console.log(`✅ [ADVANCE TEST] Completado: Geradas ${round - startRound} rodadas adicionais`);
}

function getRoundNameTest(round, totalRounds) {
  const roundFromEnd = totalRounds - round + 1;
  
  switch (roundFromEnd) {
    case 1: return 'FINAL';
    case 2: return 'SEMIFINAL';
    case 3: return 'QUARTAS';
    case 4: return 'OITAVAS';
    case 5: return 'DEZESSEIS';
    case 6: return 'TRINTADOIS';
    default: return `RODADA_${round}`;
  }
}

// Executar teste
console.log('🔍 === TESTE ESPECÍFICO: generateEliminationBracketWithSmartBye ===\n');

const result = generateEliminationBracketWithSmartByeTest(mockQualifiedTeams);

console.log(`\n✅ Teste concluído! Total de partidas geradas: ${result.matches.length}`);
console.log(`📊 Total de rodadas: ${result.totalRounds}`);
