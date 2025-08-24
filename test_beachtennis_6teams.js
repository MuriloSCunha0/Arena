// Teste específico para Beach Tennis com 6 duplas
const fs = require('fs');
const path = require('path');

// Simular as funções do bracketFix como CommonJS
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function createMatch(team1, team2, round, position) {
  return {
    id: generateUUID(),
    tournamentId: 'test',
    eventId: 'test',
    round,
    position,
    team1: team1,
    team2: team2,
    score1: null,
    score2: null,
    winnerId: null,
    completed: false,
    courtId: null,
    scheduledTime: null,
    stage: 'ELIMINATION',
    groupNumber: null
  };
}

function generateBracketWithByes(sortedTeams, byesNeeded, metadata) {
  const matches = [];
  
  const teamsWithByes = sortedTeams.slice(0, byesNeeded);
  const teamsWithoutByes = sortedTeams.slice(byesNeeded);
  
  console.log(`🏆 [BYE] Duplas que recebem BYE direto para semifinal:`);
  teamsWithByes.forEach((team, teamIndex) => {
    console.log(`   ${teamIndex + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')} (Grupo ${team.groupNumber})`);
  });
  
  console.log(`⚔️ [QUARTERFINALS] Duplas que jogam nas quartas de final:`);
  teamsWithoutByes.forEach((team, teamIndex) => {
    console.log(`   ${teamIndex + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')} (Grupo ${team.groupNumber})`);
  });
  
  let position = 1;
  
  // 1. Criar QUARTAS DE FINAL apenas para duplas sem BYE
  if (teamsWithoutByes.length >= 2) {
    const quarterfinalPairs = [];
    for (let i = 0; i < teamsWithoutByes.length; i += 2) {
      if (i + 1 < teamsWithoutByes.length) {
        quarterfinalPairs.push([teamsWithoutByes[i], teamsWithoutByes[i + 1]]);
      }
    }
    
    console.log(`🎯 [QUARTERFINALS] Criando ${quarterfinalPairs.length} partida(s) das quartas de final:`);
    quarterfinalPairs.forEach((pair, index) => {
      const match = createMatch(pair[0].teamId, pair[1].teamId, 1, position++);
      match.stage = 'ELIMINATION';
      matches.push(match);
      console.log(`   QF${index + 1}: ${pair[0].rank}º vs ${pair[1].rank}º`);
    });
  }
  
  // 2. Criar SEMIFINAIS com structure correta
  const quarterfinalsCount = Math.floor(teamsWithoutByes.length / 2);
  
  console.log(`🏆 [SEMIFINALS] Criando 2 partida(s) da semifinal:`);
  
  // Semifinal 1: 1º colocado (BYE) vs Vencedor QF1
  if (teamsWithByes.length > 0 && quarterfinalsCount > 0) {
    const semi1 = createMatch(teamsWithByes[0].teamId, ['WINNER_QF1'], 2, 1);
    matches.push(semi1);
    console.log(`   SF1: ${teamsWithByes[0].rank}º (BYE) vs Vencedor QF1`);
  }
  
  // Semifinal 2: 2º colocado (BYE) vs Vencedor QF2  
  if (teamsWithByes.length > 1 && quarterfinalsCount > 1) {
    const semi2 = createMatch(teamsWithByes[1].teamId, ['WINNER_QF2'], 2, 2);
    matches.push(semi2);
    console.log(`   SF2: ${teamsWithByes[1].rank}º (BYE) vs Vencedor QF2`);
  }
  
  // 3. Criar FINAL
  const final = createMatch(['WINNER_SF1'], ['WINNER_SF2'], 3, 1);
  matches.push(final);
  console.log(`🥇 [FINAL] Vencedor SF1 vs Vencedor SF2`);
  
  console.log(`🏆 [WITH_BYES] Bracket finalizado: ${matches.length} partidas total`);
  
  return { matches, metadata };
}

function generateEliminationBracketWithSmartBye(qualifiedTeams) {
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const totalTeams = sortedTeams.length;
  
  console.log(`🎾 [SMART BYE] Gerando bracket com ${totalTeams} duplas`);
  
  // Determinar estrutura do bracket
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const byesNeeded = nextPowerOf2 - totalTeams;
  
  const metadata = {
    totalTeams,
    bracketSize: nextPowerOf2,
    byesNeeded,
    teamsWithByes: sortedTeams.slice(0, byesNeeded),
    bracketStructure: `${totalTeams} teams → ${nextPowerOf2} bracket (${byesNeeded} BYEs)`,
    byeStrategy: 'Os melhores times recebem BYE automático para a próxima rodada'
  };
  
  console.log(`📊 [SMART BYE] Bracket ${nextPowerOf2} - ${byesNeeded} BYEs para as melhores duplas`);
  
  // Bracket com BYEs - sistema otimizado
  console.log(`⭐ [SMART BYE] Implementando ${byesNeeded} BYEs na estrutura`);
  return generateBracketWithByes(sortedTeams, byesNeeded, metadata);
}

console.log('🏖️ === TESTE BEACH TENNIS: 6 DUPLAS ===\n');

// Simular 6 duplas classificadas (como no Beach Tennis)
const qualifiedTeams = Array.from({ length: 6 }, (_, i) => ({
  teamId: [`player${i*2+1}`, `player${i*2+2}`],
  rank: i + 1,
  groupNumber: Math.floor(i / 2) + 1,
  stats: {
    wins: 2 - Math.floor(i / 2),
    gameDifference: 3 - i,
    gamesWon: 10 - i,
    matchesPlayed: 3
  }
}));

console.log('🎾 Duplas qualificadas:');
qualifiedTeams.forEach((team, index) => {
  console.log(`   ${index + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')} (Grupo ${team.groupNumber})`);
});
console.log();

// Gerar bracket
const result = generateEliminationBracketWithSmartBye(qualifiedTeams);
const { matches, metadata } = result;

console.log('📊 Metadados do bracket:');
console.log(`   - ${metadata.totalTeams} duplas`);
console.log(`   - Bracket size: ${metadata.bracketSize}`);
console.log(`   - BYEs necessários: ${metadata.byesNeeded}`);
console.log(`   - Estratégia: ${metadata.byeStrategy}`);
console.log();

console.log('🏆 Duplas com BYE:');
metadata.teamsWithByes.forEach((team, index) => {
  console.log(`   ${index + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')}`);
});
console.log();

console.log('🎯 Partidas geradas:');
const matchesByRound = matches.reduce((acc, match) => {
  if (!acc[match.round]) acc[match.round] = [];
  acc[match.round].push(match);
  return acc;
}, {});

Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).forEach(round => {
  const roundMatches = matchesByRound[round];
  console.log(`\n   Rodada ${round} (${roundMatches.length} partidas):`);
  
  roundMatches.forEach((match, index) => {
    const team1Name = match.team1 ? 
      (Array.isArray(match.team1[0]) ? 'VENCEDOR' : match.team1.join(' & ')) : 
      'TBD';
    const team2Name = match.team2 ? 
      (Array.isArray(match.team2[0]) ? 'VENCEDOR' : match.team2.join(' & ')) : 
      'TBD';
    
    const status = match.completed ? '✅ Concluída' : '⏳ Aguardando';
    
    console.log(`     ${index + 1}. ${team1Name} vs ${team2Name} - ${status}`);
    if (match.winnerId) {
      console.log(`        🏆 Vencedor: ${match.winnerId === 'team1' ? team1Name : team2Name}`);
    }
  });
});

console.log('\n📊 Resumo do torneio:');
console.log(`   - Total de partidas: ${matches.length}`);
console.log(`   - Total de rodadas: ${Object.keys(matchesByRound).length}`);
console.log('   - Estrutura:');
Object.keys(matchesByRound).sort((a, b) => parseInt(a) - parseInt(b)).forEach(round => {
  const roundMatches = matchesByRound[round];
  const roundName = round === '1' ? 'Quartas de Final' : 
                   round === '2' ? 'Semifinal' : 
                   round === '3' ? 'Final' : 
                   `Rodada ${round}`;
  console.log(`     - ${roundName}: ${roundMatches.length} partida${roundMatches.length !== 1 ? 's' : ''}`);
});

console.log('\n✅ Teste Beach Tennis 6 duplas concluído!');
