// Script final para validar as correções das semifinais
console.log('🎯 VALIDAÇÃO FINAL: Testando correções para semifinais...\n');

// Função de detecção de placeholder
const isPlaceholder = (teamId) => {
  return typeof teamId === 'string' && (
    teamId.includes('WINNER_') ||
    teamId.includes('TBD') ||
    teamId.includes('Vencedor') ||
    teamId === 'Desconhecido' ||
    teamId.length < 36
  );
};

// Simular estado APÓS as correções aplicadas
const semifinaisAposMerge = [
  {
    id: 'beach_tennis_elimination_sf1',
    team1: ['primeiro-colocado-uuid-1', 'primeiro-colocado-uuid-2'], // BYEs (placeholders)
    team2: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'] // UUIDs reais
  },
  {
    id: 'beach_tennis_elimination_sf2',
    team1: ['segundo-colocado-uuid-1', 'segundo-colocado-uuid-2'], // BYEs (placeholders)
    team2: ['162f9769-c680-4dc8-8188-ac28293a2c6c', '8c8a1d4a-1196-40cc-b8a3-5ddc3eb62c96'] // UUIDs reais
  }
];

console.log('📊 Estado das semifinais após merge:');
semifinaisAposMerge.forEach(match => {
  console.log(`${match.id}:`);
  console.log(`  team1: ${JSON.stringify(match.team1)}`);
  console.log(`  team2: ${JSON.stringify(match.team2)}`);
});

console.log('\n🧪 Testando nova lógica de sync (permite partidas com um lado válido):');
semifinaisAposMerge.forEach(match => {
  const hasPlaceholderTeam1 = match.team1 && match.team1.some(teamId => isPlaceholder(teamId));
  const hasPlaceholderTeam2 = match.team2 && match.team2.some(teamId => isPlaceholder(teamId));
  const hasEmptyTeam1 = !match.team1 || match.team1.length === 0;
  const hasEmptyTeam2 = !match.team2 || match.team2.length === 0;
  
  // Nova lógica: só skip se AMBOS os lados tiverem placeholders ou se algum lado estiver vazio
  let shouldSkip = false;
  let skipReason = '';
  
  if (hasEmptyTeam1 || hasEmptyTeam2) {
    shouldSkip = true;
    skipReason = hasEmptyTeam1 ? 'empty team1' : 'empty team2';
  } else if (hasPlaceholderTeam1 && hasPlaceholderTeam2) {
    shouldSkip = true;
    skipReason = 'both teams have placeholders';
  }
  
  console.log(`${match.id}:`);
  console.log(`  hasPlaceholderTeam1: ${hasPlaceholderTeam1}`);
  console.log(`  hasPlaceholderTeam2: ${hasPlaceholderTeam2}`);
  console.log(`  shouldSkip: ${shouldSkip} (${skipReason || 'no reason'})`);
  console.log(`  ✅ Será sincronizada: ${!shouldSkip}`);
});

console.log('\n🎯 RESULTADO ESPERADO:');
console.log('✅ Ambas as semifinais devem ser sincronizadas agora');
console.log('✅ Os vencedores das quartas estão corretamente nas semifinais');
console.log('✅ O problema das duplas não avançando deve estar resolvido');
