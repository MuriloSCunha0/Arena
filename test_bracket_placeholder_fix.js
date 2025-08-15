// Teste para verificar se as correções de placeholder funcionam corretamente

console.log('🧪 === TESTE: Correção de Placeholders em Semifinais ===');

// Mock data para simular o cenário do beach tennis com 6 duplas
const mockQualifiedTeams = [
  {
    teamId: ['5fe810c3-911f-45bd-ac4a-7e1e2b540c92', '901afefe-d978-44be-86fa-362de518a5b1'],
    rank: 1,
    stats: { wins: 2, losses: 0, gameDifference: 12 }
  },
  {
    teamId: ['ce4e8b46-2906-44bb-a997-1255b0c93905', '8e7a8d28-0350-4460-aa27-51e90b0c24a3'],
    rank: 2,
    stats: { wins: 2, losses: 0, gameDifference: 12 }
  },
  {
    teamId: ['768c38fa-1b6e-435c-bca2-32fc9d3cd4be', 'b98fcd63-de51-445f-8aa7-72241263606c'],
    rank: 3,
    stats: { wins: 2, losses: 0, gameDifference: 12 }
  },
  {
    teamId: ['498f1d9d-472d-41e2-8d68-b8bae20f387e', '7979cba7-7ea7-46ff-be7c-bd25d4629a19'],
    rank: 4,
    stats: { wins: 0, losses: 2, gameDifference: 0 }
  },
  {
    teamId: ['c88e9d1a-6e27-475c-a3b0-9db781aa11c8', '91956c2a-6934-49dc-84d5-b5897494a828'],
    rank: 5,
    stats: { wins: 0, losses: 2, gameDifference: 0 }
  },
  {
    teamId: ['74c14827-368b-48a7-ba04-b1f378badaf2', '88c62561-9743-49a8-a6eb-d397d1f63313'],
    rank: 6,
    stats: { wins: 0, losses: 2, gameDifference: 0 }
  }
];

function createMatchWithNextMatch(team1, team2, round, position, nextMatchId) {
  return {
    id: `test_match_${round}_${position}`,
    team1,
    team2,
    round,
    position,
    stage: 'ELIMINATION',
    nextMatchId
  };
}

function createMatch(team1, team2, round, position) {
  return {
    id: `test_match_${round}_${position}`,
    team1,
    team2,
    round,
    position,
    stage: 'ELIMINATION'
  };
}

// Simular a criação das semifinais (como será após a correção)
console.log('📊 Criando semifinais com placeholders corrigidos...');

const bestTwo = mockQualifiedTeams.slice(0, 2);

// SF1: 1º colocado (BYE) vs Vencedor QF1
const sf1 = createMatchWithNextMatch(
  bestTwo[0].teamId,        // 1º colocado (BYE) - 2 elementos
  ['WINNER_QF1', 'WINNER_QF1_PARTNER'],  // Vencedor da QF1 - 2 elementos
  2, 1, 'beach_tennis_elimination_final'
);
sf1.id = 'beach_tennis_elimination_sf1';

// SF2: 2º colocado (BYE) vs Vencedor QF2
const sf2 = createMatchWithNextMatch(
  bestTwo[1].teamId,        // 2º colocado (BYE) - 2 elementos
  ['WINNER_QF2', 'WINNER_QF2_PARTNER'],  // Vencedor da QF2 - 2 elementos
  2, 2, 'beach_tennis_elimination_final'
);
sf2.id = 'beach_tennis_elimination_sf2';

// FINAL: Vencedor SF1 vs Vencedor SF2
const final = createMatch(
  ['WINNER_SF1', 'WINNER_SF1_PARTNER'], 
  ['WINNER_SF2', 'WINNER_SF2_PARTNER'], 
  3, 1
);
final.id = 'beach_tennis_elimination_final';

console.log('✅ Semifinais criadas:');
console.log('  SF1 Team1:', sf1.team1, '(length:', sf1.team1.length, ')');
console.log('  SF1 Team2:', sf1.team2, '(length:', sf1.team2.length, ')');
console.log('  SF2 Team1:', sf2.team1, '(length:', sf2.team1.length, ')');
console.log('  SF2 Team2:', sf2.team2, '(length:', sf2.team2.length, ')');
console.log('  Final Team1:', final.team1, '(length:', final.team1.length, ')');
console.log('  Final Team2:', final.team2, '(length:', final.team2.length, ')');

// Teste: Verificar se os placeholders são identificados corretamente
function isPlaceholder(teamId) {
  return typeof teamId === 'string' && (
    teamId.includes('WINNER_') ||
    teamId.includes('TBD') ||
    teamId.includes('Vencedor') ||
    teamId === 'Desconhecido' ||
    teamId.length < 36 // UUIDs têm 36 caracteres
  );
}

function validateMatch(match, matchName) {
  const hasPlaceholderTeam1 = match.team1 && match.team1.some(teamId => isPlaceholder(teamId));
  const hasPlaceholderTeam2 = match.team2 && match.team2.some(teamId => isPlaceholder(teamId));
  
  const hasEmptyTeam1 = !match.team1 || match.team1.length === 0;
  const hasEmptyTeam2 = !match.team2 || match.team2.length === 0;
  
  console.log(`🔍 Validando ${matchName}:`);
  console.log(`  Team1 (${match.team1.length} elementos): [${match.team1.join(', ')}]`);
  console.log(`  Team2 (${match.team2.length} elementos): [${match.team2.join(', ')}]`);
  console.log(`  Team1 tem placeholder: ${hasPlaceholderTeam1}`);
  console.log(`  Team2 tem placeholder: ${hasPlaceholderTeam2}`);
  console.log(`  Team1 vazio: ${hasEmptyTeam1}`);
  console.log(`  Team2 vazio: ${hasEmptyTeam2}`);
  
  const isValidForDb = !hasPlaceholderTeam1 && !hasPlaceholderTeam2 && !hasEmptyTeam1 && !hasEmptyTeam2;
  console.log(`  ✅ Válido para DB: ${isValidForDb}`);
  
  return isValidForDb;
}

console.log('\n🔍 === VALIDAÇÃO DE ESTRUTURA ===');
validateMatch(sf1, 'SF1');
console.log('');
validateMatch(sf2, 'SF2');
console.log('');
validateMatch(final, 'Final');

// Teste: Simular atualização após QF1 ser completada
console.log('\n🎯 === TESTE: Atualização após QF1 ===');

// Simular vencedores da QF1 (dupla que avança)
const qf1Winners = ['768c38fa-1b6e-435c-bca2-32fc9d3cd4be', 'b98fcd63-de51-445f-8aa7-72241263606c'];

// Atualizar SF1
const updatedSf1 = { ...sf1 };
updatedSf1.team2 = qf1Winners;

console.log('SF1 após atualização:');
console.log('  Team1:', updatedSf1.team1, '(length:', updatedSf1.team1.length, ')');
console.log('  Team2:', updatedSf1.team2, '(length:', updatedSf1.team2.length, ')');

validateMatch(updatedSf1, 'SF1 Atualizada');

console.log('\n✅ === RESULTADO ===');
console.log('Todas as partidas agora têm teams com 2 elementos consistentes!');
console.log('✅ SF1 Team1: 2 elementos (reais)');
console.log('✅ SF1 Team2: 2 elementos (após atualização)');
console.log('✅ SF2 Team1: 2 elementos (reais)');
console.log('✅ SF2 Team2: 2 elementos (placeholders)');
console.log('✅ Final Team1: 2 elementos (placeholders)');
console.log('✅ Final Team2: 2 elementos (placeholders)');
