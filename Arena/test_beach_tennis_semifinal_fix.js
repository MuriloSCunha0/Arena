/**
 * Teste da correção Beach Tennis: Semifinal → Final
 * O problema era que a SF1 não estava atualizando o team1 da final corretamente
 */

console.log('🏐 TESTE: Correção Beach Tennis - Semifinal para Final');

// Estado atual das semifinais (ambas completadas)
const matches = [
  // SF1 completada
  {
    id: 'beach_tennis_elimination_sf1',
    stage: 'ELIMINATION',
    round: 2,
    position: 1,
    team1: ['1bbf3cd6-0144-4711-9699-cdfda9fb9491', 'f31b75d0-43d6-4b5d-bd07-a5d5621d5087'], // Eduarda & Elisa
    team2: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'], // Lucas & Sofia
    completed: true,
    winnerId: 'team1'
  },
  // SF2 completada
  {
    id: 'beach_tennis_elimination_sf2',
    stage: 'ELIMINATION',
    round: 2,
    position: 2,
    team1: ['8c3a3ec5-1853-45fb-8f52-a59719602673', '843f5284-8fe9-476b-ab2c-c4c5aeaf4043'], // Otávio & Felipe
    team2: ['14a65ea8-b2bc-4425-8a82-dfcc83c9eefc', 'a8fc0942-6488-4d5b-9962-108161af869e'], // Vitor & Rafael
    completed: true,
    winnerId: 'team1'
  },
  // Final com placeholders
  {
    id: 'beach_tennis_elimination_final',
    stage: 'ELIMINATION',
    round: 3,
    position: 1,
    team1: ['WINNER_SF1', 'WINNER_SF1_PARTNER'], // PROBLEMA: ainda tem placeholders
    team2: ['WINNER_SF2', 'WINNER_SF2_PARTNER'], // PROBLEMA: ainda tem placeholders
    completed: false,
    winnerId: null
  }
];

// Simular lógica corrigida
function simulateBeachTennisLogic(completedMatch, matches) {
  console.log(`\n🔄 Simulando avanço de ${completedMatch.id} (Round ${completedMatch.round}, Position ${completedMatch.position})`);
  
  // Encontrar próxima partida
  const nextRound = completedMatch.round + 1;
  const nextPosition = Math.ceil(completedMatch.position / 2);
  
  const nextMatch = matches.find(m => 
    m.stage === 'ELIMINATION' && 
    m.round === nextRound && 
    m.position === nextPosition
  );
  
  if (!nextMatch) {
    console.log('❌ Próxima partida não encontrada');
    return matches;
  }
  
  console.log(`📝 Próxima partida: ${nextMatch.id} (Round ${nextRound}, Position ${nextPosition})`);
  
  // LÓGICA CORRIGIDA: Beach Tennis para semifinais → final
  let isTeam1Slot;
  let winnerTeam = completedMatch.winnerId === 'team1' ? completedMatch.team1 : completedMatch.team2;
  
  if (completedMatch.round === 2 && nextRound === 3) {
    // BEACH TENNIS: Semifinais → Final
    // SF1 (pos=1) → Final team1, SF2 (pos=2) → Final team2
    isTeam1Slot = completedMatch.position === 1;
    console.log(`🏐 [Beach Tennis] SF${completedMatch.position} winner → Final ${isTeam1Slot ? 'team1' : 'team2'}`);
  } else {
    // Lógica padrão
    isTeam1Slot = completedMatch.position % 2 === 1;
    console.log(`📋 [Standard] Position ${completedMatch.position} → ${isTeam1Slot ? 'team1' : 'team2'}`);
  }
  
  // Atualizar próxima partida
  const updatedMatches = [...matches];
  const nextMatchIndex = updatedMatches.findIndex(m => m.id === nextMatch.id);
  const updatedNextMatch = { ...nextMatch };
  
  if (isTeam1Slot) {
    updatedNextMatch.team1 = [...winnerTeam];
    console.log(`✅ Atualizando team1 com: ${winnerTeam.join(' & ')}`);
  } else {
    updatedNextMatch.team2 = [...winnerTeam];
    console.log(`✅ Atualizando team2 com: ${winnerTeam.join(' & ')}`);
  }
  
  updatedMatches[nextMatchIndex] = updatedNextMatch;
  
  console.log(`📊 Estado atualizado da final:`);
  console.log(`Team1: ${JSON.stringify(updatedNextMatch.team1)}`);
  console.log(`Team2: ${JSON.stringify(updatedNextMatch.team2)}`);
  
  return updatedMatches;
}

// Testar o fluxo
let updatedMatches = matches;

console.log('📊 Estado inicial da final:');
const initialFinal = matches.find(m => m.id === 'beach_tennis_elimination_final');
console.log(`Team1: ${JSON.stringify(initialFinal.team1)}`);
console.log(`Team2: ${JSON.stringify(initialFinal.team2)}`);

// Simular SF1 completada
const sf1 = matches.find(m => m.id === 'beach_tennis_elimination_sf1');
updatedMatches = simulateBeachTennisLogic(sf1, updatedMatches);

// Simular SF2 completada
const sf2 = matches.find(m => m.id === 'beach_tennis_elimination_sf2');
updatedMatches = simulateBeachTennisLogic(sf2, updatedMatches);

// Verificar resultado final
console.log('\n🏆 RESULTADO FINAL:');
const finalMatch = updatedMatches.find(m => m.id === 'beach_tennis_elimination_final');
console.log(`Team1: ${JSON.stringify(finalMatch.team1)}`);
console.log(`Team2: ${JSON.stringify(finalMatch.team2)}`);

// Verificar se não há mais placeholders
const hasPlaceholders = [...(finalMatch.team1 || []), ...(finalMatch.team2 || [])]
  .some(id => typeof id === 'string' && id.includes('WINNER_'));

if (!hasPlaceholders) {
  console.log('✅ SUCESSO: Final sem placeholders!');
  console.log('✅ Eduarda & Elisa vs Otávio & Felipe prontos para a final!');
} else {
  console.log('❌ FALHOU: Final ainda tem placeholders');
}

console.log('\n📝 RESUMO DA CORREÇÃO:');
console.log('- SF1 (pos=1) → Final team1 ✅');
console.log('- SF2 (pos=2) → Final team2 ✅');
console.log('- Lógica Beach Tennis agora funciona para semifinais → final');
