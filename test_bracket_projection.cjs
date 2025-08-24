// Teste da nova funcionalidade de projeção do bracket
console.log('🏆 === TESTE DE PROJEÇÃO DO BRACKET ===\n');

// Simular função calculateBracketStructure
function calculateBracketStructure(qualifiedTeamsCount) {
  if (qualifiedTeamsCount === 0) {
    return {
      totalRounds: 0,
      bracketStructure: [],
      bracketSize: 0,
      byesNeeded: 0,
      qualifiedTeamsCount: 0
    };
  }
  
  // Calcular bracket size (próxima potência de 2)
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(qualifiedTeamsCount)));
  const byesNeeded = bracketSize - qualifiedTeamsCount;
  
  // Calcular número total de rodadas
  const totalRounds = Math.ceil(Math.log2(bracketSize));
  
  // Gerar estrutura completa das rodadas
  const bracketStructure = [];
  for (let round = 1; round <= totalRounds; round++) {
    const matchesInRound = Math.floor(bracketSize / Math.pow(2, round));
    const roundFromEnd = totalRounds - round;
    
    let roundName = '';
    switch (roundFromEnd) {
      case 0: roundName = 'Final'; break;
      case 1: roundName = 'Semifinal'; break;
      case 2: roundName = 'Quartas de Final'; break;
      case 3: roundName = 'Oitavas de Final'; break;
      case 4: roundName = 'Dezesseisavos de Final'; break;
      case 5: roundName = 'Trinta e dois avos de Final'; break;
      default: 
        const participants = Math.pow(2, roundFromEnd + 1);
        roundName = `${participants}ª de Final`;
    }
    
    bracketStructure.push({
      round,
      roundName,
      matchesCount: matchesInRound,
      roundFromEnd,
      isFirstRound: round === 1,
      isFinalRound: round === totalRounds
    });
  }
  
  return {
    totalRounds,
    bracketStructure,
    bracketSize,
    byesNeeded,
    qualifiedTeamsCount
  };
}

// Testar diferentes cenários
const scenarios = [
  { teams: 4, description: 'Torneio pequeno - 4 duplas' },
  { teams: 6, description: 'Beach Tennis típico - 6 duplas' },
  { teams: 8, description: 'Torneio médio - 8 duplas (potência de 2)' },
  { teams: 10, description: 'Torneio médio - 10 duplas' },
  { teams: 12, description: 'Torneio grande - 12 duplas' },
  { teams: 16, description: 'Torneio grande - 16 duplas (potência de 2)' },
  { teams: 20, description: 'Torneio muito grande - 20 duplas' },
  { teams: 32, description: 'Torneio massivo - 32 duplas (potência de 2)' }
];

scenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.description}`);
  console.log(`${'='.repeat(50)}`);
  
  const result = calculateBracketStructure(scenario.teams);
  
  console.log(`📊 Resumo:`);
  console.log(`   • Duplas qualificadas: ${result.qualifiedTeamsCount}`);
  console.log(`   • Tamanho do bracket: ${result.bracketSize}`);
  console.log(`   • BYEs necessários: ${result.byesNeeded}`);
  console.log(`   • Total de rodadas: ${result.totalRounds}`);
  
  if (result.bracketStructure.length > 0) {
    console.log(`\n🗓️ Estrutura das rodadas:`);
    result.bracketStructure.forEach((round, roundIndex) => {
      const indicator = round.isFinalRound ? '🏆' : round.isFirstRound ? '🚀' : '⚔️';
      console.log(`   ${indicator} Rodada ${round.round}: ${round.roundName} (${round.matchesCount} partida${round.matchesCount !== 1 ? 's' : ''})`);
    });
    
    if (result.byesNeeded > 0) {
      console.log(`\n📝 Observações:`);
      console.log(`   • ${result.byesNeeded} dupla${result.byesNeeded !== 1 ? 's' : ''} receberá${result.byesNeeded !== 1 ? 'ão' : ''} BYE automático`);
      console.log(`   • As melhores duplas do ranking avançam diretamente para a próxima rodada`);
    }
  }
});

console.log('\n✅ Teste de projeção do bracket concluído!');
console.log('\n💡 A nova funcionalidade permite:');
console.log('   ✅ Calcular automaticamente a estrutura completa do bracket');
console.log('   ✅ Mostrar todas as rodadas (Oitavas, Quartas, Semifinal, Final)');
console.log('   ✅ Calcular BYEs necessários para balancear o bracket');
console.log('   ✅ Exibir projeção mesmo antes de gerar as partidas');
console.log('   ✅ Adaptar-se a qualquer número de duplas qualificadas');
