// Teste para identificar por que as duplas reais ainda são detectadas como placeholders

console.log('🔍 === TESTE: Detecção de Placeholders em IDs Reais ===');

// Função isPlaceholder como está no código
function isPlaceholder(teamId) {
  return typeof teamId === 'string' && (
    teamId.includes('WINNER_') ||
    teamId.includes('TBD') ||
    teamId.includes('Vencedor') ||
    teamId === 'Desconhecido' ||
    teamId.length < 36 // UUIDs têm 36 caracteres
  );
}

// IDs reais que deveriam estar nas semifinais após as quartas serem completadas
const realIds = [
  '768c38fa-1b6e-435c-bca2-32fc9d3cd4be', // Sofia Cardoso
  'b98fcd63-de51-445f-8aa7-72241263606c', // João Pedro
  '498f1d9d-472d-41e2-8d68-b8bae20f387e', // Bruno Alves
  '7979cba7-7ea7-46ff-be7c-bd25d4629a19', // Marina Farias
  '5fe810c3-911f-45bd-ac4a-7e1e2b540c92', // 1º colocado BYE
  '901afefe-d978-44be-86fa-362de518a5b1', // Parceiro do 1º
  'ce4e8b46-2906-44bb-a997-1255b0c93905', // 2º colocado BYE
  '8e7a8d28-0350-4460-aa27-51e90b0c24a3'  // Parceiro do 2º
];

console.log('📋 Testando detecção de placeholders nos IDs reais:');
realIds.forEach((id, index) => {
  const isPlaceHolderResult = isPlaceholder(id);
  console.log(`  ${index + 1}. ID: ${id}`);
  console.log(`     Comprimento: ${id.length}`);
  console.log(`     É placeholder: ${isPlaceHolderResult}`);
  console.log(`     Contém WINNER_: ${id.includes('WINNER_')}`);
  console.log(`     Contém TBD: ${id.includes('TBD')}`);
  console.log(`     Contém Vencedor: ${id.includes('Vencedor')}`);
  console.log(`     É Desconhecido: ${id === 'Desconhecido'}`);
  console.log(`     Comprimento < 36: ${id.length < 36}`);
  console.log('');
});

// Simular estrutura das semifinais como deveria estar após QF1 e QF2 serem completadas
const sf1_afterUpdate = {
  id: 'beach_tennis_elimination_sf1',
  team1: ['5fe810c3-911f-45bd-ac4a-7e1e2b540c92', '901afefe-d978-44be-86fa-362de518a5b1'], // 1º BYE
  team2: ['768c38fa-1b6e-435c-bca2-32fc9d3cd4be', 'b98fcd63-de51-445f-8aa7-72241263606c'], // Vencedor QF1
  round: 2,
  position: 1
};

const sf2_afterUpdate = {
  id: 'beach_tennis_elimination_sf2',
  team1: ['ce4e8b46-2906-44bb-a997-1255b0c93905', '8e7a8d28-0350-4460-aa27-51e90b0c24a3'], // 2º BYE
  team2: ['498f1d9d-472d-41e2-8d68-b8bae20f387e', '7979cba7-7ea7-46ff-be7c-bd25d4629a19'], // Vencedor QF2
  round: 2,
  position: 2
};

console.log('🔍 === TESTE: Validação das Semifinais Atualizadas ===');

function validateMatch(match, matchName) {
  console.log(`\n🏆 Validando ${matchName} (${match.id}):`);
  
  const hasPlaceholderTeam1 = match.team1 && match.team1.some(teamId => isPlaceholder(teamId));
  const hasPlaceholderTeam2 = match.team2 && match.team2.some(teamId => isPlaceholder(teamId));
  
  const hasEmptyTeam1 = !match.team1 || match.team1.length === 0;
  const hasEmptyTeam2 = !match.team2 || match.team2.length === 0;
  
  console.log(`  📊 Team1: [${match.team1.join(', ')}]`);
  console.log(`  📊 Team2: [${match.team2.join(', ')}]`);
  
  console.log(`  🔍 Team1 Details:`);
  match.team1.forEach((teamId, i) => {
    console.log(`    ${i + 1}. ${teamId} (placeholder: ${isPlaceholder(teamId)}, length: ${teamId.length})`);
  });
  
  console.log(`  🔍 Team2 Details:`);
  match.team2.forEach((teamId, i) => {
    console.log(`    ${i + 1}. ${teamId} (placeholder: ${isPlaceholder(teamId)}, length: ${teamId.length})`);
  });
  
  console.log(`  ❓ HasPlaceholderTeam1: ${hasPlaceholderTeam1}`);
  console.log(`  ❓ HasPlaceholderTeam2: ${hasPlaceholderTeam2}`);
  console.log(`  ❓ HasEmptyTeam1: ${hasEmptyTeam1}`);
  console.log(`  ❓ HasEmptyTeam2: ${hasEmptyTeam2}`);
  
  const wouldBeSkipped = hasPlaceholderTeam1 || hasPlaceholderTeam2 || hasEmptyTeam1 || hasEmptyTeam2;
  
  const reason = hasPlaceholderTeam1 ? 'placeholder team1' : 
                hasPlaceholderTeam2 ? 'placeholder team2' :
                hasEmptyTeam1 ? 'empty team1' : 'empty team2';
  
  console.log(`  🎯 Seria pulada: ${wouldBeSkipped}`);
  if (wouldBeSkipped) {
    console.log(`  📋 Razão: ${reason}`);
  }
  
  return !wouldBeSkipped;
}

const sf1Valid = validateMatch(sf1_afterUpdate, 'SF1');
const sf2Valid = validateMatch(sf2_afterUpdate, 'SF2');

console.log('\n🎯 === RESULTADO ===');
console.log(`✅ SF1 válida para DB: ${sf1Valid}`);
console.log(`✅ SF2 válida para DB: ${sf2Valid}`);

if (!sf1Valid || !sf2Valid) {
  console.log('\n❌ === PROBLEMA ENCONTRADO ===');
  console.log('As semifinais com IDs reais ainda estão sendo detectadas como placeholders!');
  console.log('Isso indica que há um bug na função isPlaceholder() ou na validação.');
} else {
  console.log('\n✅ === SEMIFINAIS VÁLIDAS ===');
  console.log('As semifinais passaram na validação corretamente.');
}

// Teste adicional: verificar se existem caracteres especiais ou problemas nos IDs
console.log('\n🔬 === ANÁLISE DETALHADA DOS IDs ===');
const allIds = [...sf1_afterUpdate.team1, ...sf1_afterUpdate.team2, ...sf2_afterUpdate.team1, ...sf2_afterUpdate.team2];
allIds.forEach((id, index) => {
  console.log(`ID ${index + 1}: "${id}"`);
  console.log(`  Tipo: ${typeof id}`);
  console.log(`  Comprimento: ${id.length}`);
  console.log(`  Primeiro char: "${id[0]}" (code: ${id.charCodeAt(0)})`);
  console.log(`  Último char: "${id[id.length-1]}" (code: ${id.charCodeAt(id.length-1)})`);
  console.log(`  Regex UUID válido: ${/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)}`);
  console.log('');
});
