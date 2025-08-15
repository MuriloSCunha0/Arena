/**
 * Script para simular o fluxo completo de completar uma semifinal
 * e verificar se a final avança automaticamente
 */

console.log('🏆 SIMULAÇÃO: Testando avanço automático para a final');

// Simular dados do estado atual (baseado nos logs)
const currentMatches = [
  // Quartas completadas
  {
    id: '07b47d19-0f47-46e6-856c-9b088656c3c0',
    stage: 'ELIMINATION',
    round: 1,
    position: 1,
    team1: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'],
    team2: ['5de42327-3e66-48fe-9181-b38815e3f87e', 'aa9b3f36-ad35-43fd-b82c-3a21068623f1'],
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'cfd64f15-7b2a-4797-bf9e-34b02a255e6b',
    stage: 'ELIMINATION',
    round: 1,
    position: 2,
    team1: ['14a65ea8-b2bc-4425-8a82-dfcc83c9eefc', 'a8fc0942-6488-4d5b-9962-108161af869e'],
    team2: ['162f9769-c680-4dc8-8188-ac28293a2c6c', '8c8a1d4a-1196-40cc-b8a3-5ddc3eb62c96'],
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  // Semifinais - SF1 completada, SF2 completada
  {
    id: 'beach_tennis_elimination_sf1',
    stage: 'ELIMINATION',
    round: 2,
    position: 1,
    team1: ['1bbf3cd6-0144-4711-9699-cdfda9fb9491', 'f31b75d0-43d6-4b5d-bd07-a5d5621d5087'],
    team2: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'],
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'beach_tennis_elimination_sf2',
    stage: 'ELIMINATION',
    round: 2,
    position: 2,
    team1: ['8c3a3ec5-1853-45fb-8f52-a59719602673', '843f5284-8fe9-476b-ab2c-c4c5aeaf4043'],
    team2: ['14a65ea8-b2bc-4425-8a82-dfcc83c9eefc', 'a8fc0942-6488-4d5b-9962-108161af869e'],
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  // Final - deve ser atualizada automaticamente
  {
    id: 'beach_tennis_elimination_final',
    stage: 'ELIMINATION',
    round: 3,
    position: 1,
    team1: ['WINNER_SF1', 'WINNER_SF1_PARTNER'], // PROBLEMA: ainda tem placeholders
    team2: ['WINNER_SF2', 'WINNER_SF2_PARTNER'], // PROBLEMA: ainda tem placeholders
    completed: false,
    winnerId: null,
    score1: 0,
    score2: 0
  }
];

// Simular lógica updateEliminationBracket
function simulateUpdateEliminationBracket(matches, completedMatchId, winnerId, winnerTeam) {
  console.log(`\n🔄 Simulando updateEliminationBracket para match: ${completedMatchId}`);
  console.log(`Winner: ${winnerId}, Team: ${JSON.stringify(winnerTeam)}`);
  
  const updatedMatches = [...matches];
  const completedMatch = updatedMatches.find(m => m.id === completedMatchId);
  
  if (!completedMatch) {
    console.log('❌ Match completada não encontrada');
    return updatedMatches;
  }
  
  console.log(`📊 Match completada - Round: ${completedMatch.round}, Position: ${completedMatch.position}`);
  
  // Encontrar próxima partida
  const nextRound = completedMatch.round + 1;
  const nextPosition = Math.ceil(completedMatch.position / 2);
  
  console.log(`🎯 Procurando próxima partida - Round: ${nextRound}, Position: ${nextPosition}`);
  
  const nextMatch = updatedMatches.find(m => 
    m.stage === 'ELIMINATION' && 
    m.round === nextRound && 
    m.position === nextPosition
  );
  
  if (!nextMatch) {
    console.log('⚠️ Próxima partida não encontrada');
    return updatedMatches;
  }
  
  console.log(`📝 Encontrada próxima partida: ${nextMatch.id}`);
  console.log(`Estado atual: team1=${JSON.stringify(nextMatch.team1)}, team2=${JSON.stringify(nextMatch.team2)}`);
  
  // Lógica Beach Tennis: posição ímpar → team1, posição par → team2
  const targetTeam = completedMatch.position % 2 === 1 ? 'team1' : 'team2';
  
  console.log(`🏐 Beach Tennis: Position ${completedMatch.position} ${completedMatch.position % 2 === 1 ? 'é ímpar' : 'é par'}, atualizando ${targetTeam}`);
  
  // Atualizar a próxima partida
  if (targetTeam === 'team1') {
    nextMatch.team1 = [...winnerTeam];
  } else {
    nextMatch.team2 = [...winnerTeam];
  }
  
  console.log(`✅ Partida ${nextMatch.id} atualizada:`);
  console.log(`Novo estado: team1=${JSON.stringify(nextMatch.team1)}, team2=${JSON.stringify(nextMatch.team2)}`);
  
  return updatedMatches;
}

// Testar o fluxo completo
console.log('📊 Estado inicial da final:');
const finalMatch = currentMatches.find(m => m.id === 'beach_tennis_elimination_final');
console.log(`Team1: ${JSON.stringify(finalMatch.team1)}`);
console.log(`Team2: ${JSON.stringify(finalMatch.team2)}`);

// Simular as atualizações já feitas
let updatedMatches = currentMatches;

// SF1 vencedor → Final team1
const sf1Winner = ['1bbf3cd6-0144-4711-9699-cdfda9fb9491', 'f31b75d0-43d6-4b5d-bd07-a5d5621d5087'];
updatedMatches = simulateUpdateEliminationBracket(
  updatedMatches, 
  'beach_tennis_elimination_sf1', 
  'team1', 
  sf1Winner
);

// SF2 vencedor → Final team2
const sf2Winner = ['8c3a3ec5-1853-45fb-8f52-a59719602673', '843f5284-8fe9-476b-ab2c-c4c5aeaf4043'];
updatedMatches = simulateUpdateEliminationBracket(
  updatedMatches, 
  'beach_tennis_elimination_sf2', 
  'team1', 
  sf2Winner
);

// Verificar resultado final
console.log('\n🏆 RESULTADO FINAL DA SIMULAÇÃO:');
const updatedFinal = updatedMatches.find(m => m.id === 'beach_tennis_elimination_final');
console.log(`Team1: ${JSON.stringify(updatedFinal.team1)}`);
console.log(`Team2: ${JSON.stringify(updatedFinal.team2)}`);

// Verificar se não há mais placeholders
const hasPlaceholders = [...(updatedFinal.team1 || []), ...(updatedFinal.team2 || [])]
  .some(id => typeof id === 'string' && id.includes('WINNER_'));

if (!hasPlaceholders) {
  console.log('✅ SUCESSO: Final não tem mais placeholders!');
  console.log('✅ As duplas estão prontas para jogar a final!');
} else {
  console.log('❌ FALHOU: Final ainda tem placeholders');
}

console.log('\n📝 RESUMO:');
console.log('- SF1 vencedor (Eduarda & Elisa) → Final team1');
console.log('- SF2 vencedor (Otávio & Felipe) → Final team2');
console.log('- Final deve estar pronta para ser jogada sem precisar atualizar a tela');
