// Script para debugar o conteúdo das semifinais e identificar o problema

console.log('🔍 === DEBUG: Investigando Conteúdo das Semifinais ===');

// Simular o cenário que está acontecendo
console.log('📋 Cenário:');
console.log('1. QF1 completada: Sofia & João venceram Wesley & Eduarda');
console.log('2. Sistema diz que atualizou SF1 team2 com os vencedores');
console.log('3. Mas SF1 ainda é detectada como tendo placeholders');
console.log('');

// Simular a função isPlaceholder exata do código
function isPlaceholder(teamId) {
  const result = typeof teamId === 'string' && (
    teamId.includes('WINNER_') ||
    teamId.includes('TBD') ||
    teamId.includes('Vencedor') ||
    teamId === 'Desconhecido' ||
    teamId.length < 36 // UUIDs têm 36 caracteres
  );
  
  return result;
}

// IDs que deveriam estar na SF1 após a atualização
const sf1_expected = {
  id: 'beach_tennis_elimination_sf1',
  team1: ['5fe810c3-911f-45bd-ac4a-7e1e2b540c92', '901afefe-d978-44be-86fa-362de518a5b1'], // 1º colocado (BYE)
  team2: ['768c38fa-1b6e-435c-bca2-32fc9d3cd4be', 'b98fcd63-de51-445f-8aa7-72241263606c']  // Vencedores QF1 (Sofia & João)
};

console.log('🎯 Testando SF1 como deveria estar após atualização:');
console.log('Team1:', sf1_expected.team1);
console.log('Team2:', sf1_expected.team2);

// Testar se os IDs são detectados como placeholders
const team1HasPlaceholder = sf1_expected.team1.some(id => isPlaceholder(id));
const team2HasPlaceholder = sf1_expected.team2.some(id => isPlaceholder(id));

console.log('');
console.log('🔍 Detecção de placeholders:');
console.log('Team1 tem placeholder?', team1HasPlaceholder);
console.log('Team2 tem placeholder?', team2HasPlaceholder);

sf1_expected.team1.forEach((id, i) => {
  console.log(`  Team1[${i}]: "${id}" -> placeholder: ${isPlaceholder(id)}`);
});

sf1_expected.team2.forEach((id, i) => {
  console.log(`  Team2[${i}]: "${id}" -> placeholder: ${isPlaceholder(id)}`);
});

console.log('');
console.log('🤔 Resultado esperado: NENHUM deveria ser placeholder');
console.log('📊 Resultado atual:');
console.log(`   Team1 válido: ${!team1HasPlaceholder}`);
console.log(`   Team2 válido: ${!team2HasPlaceholder}`);

// Agora vamos testar com placeholders para ver se a função funciona corretamente
console.log('');
console.log('🧪 === TESTE: Função isPlaceholder com placeholders conhecidos ===');

const knownPlaceholders = [
  'WINNER_QF1',
  'WINNER_QF1_PARTNER',
  'WINNER_QF2',
  'WINNER_QF2_PARTNER',
  'TBD',
  'Vencedor',
  'Desconhecido',
  'ID_curto'  // 9 caracteres, menor que 36
];

knownPlaceholders.forEach(placeholder => {
  console.log(`"${placeholder}" -> placeholder: ${isPlaceholder(placeholder)}`);
});

console.log('');
console.log('✅ Todos os placeholders acima DEVERIAM retornar true');

// Hipótese: Talvez o problema seja que os IDs não estão sendo atualizados no objeto correto
console.log('');
console.log('🔍 === HIPÓTESES DO PROBLEMA ===');
console.log('1. IDs reais sendo substituídos incorretamente');
console.log('2. Objeto não sendo atualizado corretamente na memória');
console.log('3. JSONB não sendo salvo corretamente');
console.log('4. Validação rodando antes da atualização ser aplicada');
console.log('5. IDs com caracteres especiais ou encoding incorreto');

// Teste com diferentes cenários problemáticos
console.log('');
console.log('🚨 === TESTE: Cenários Problemáticos ===');

// Cenário 1: IDs com caracteres especiais
const idsWithSpecialChars = [
  '768c38fa-1b6e-435c-bca2-32fc9d3cd4be ', // espaço no final
  ' 768c38fa-1b6e-435c-bca2-32fc9d3cd4be', // espaço no início
  '768c38fa-1b6e-435c-bca2-32fc9d3cd4be\n', // quebra de linha
  '768c38fa-1b6e-435c-bca2-32fc9d3cd4be\r' // carriage return
];

console.log('Testando IDs com caracteres especiais:');
idsWithSpecialChars.forEach((id, i) => {
  console.log(`  ID ${i + 1}: "${id}" (length: ${id.length}) -> placeholder: ${isPlaceholder(id)}`);
});

// Cenário 2: Array misto (ID real + placeholder)
const mixedArray = ['768c38fa-1b6e-435c-bca2-32fc9d3cd4be', 'WINNER_QF1_PARTNER'];
const mixedHasPlaceholder = mixedArray.some(id => isPlaceholder(id));
console.log('');
console.log('Array misto (ID real + placeholder):');
console.log(`  Array: [${mixedArray.join(', ')}]`);
console.log(`  Tem placeholder: ${mixedHasPlaceholder}`);

console.log('');
console.log('🎯 === CONCLUSÃO ===');
if (!team1HasPlaceholder && !team2HasPlaceholder) {
  console.log('✅ A função isPlaceholder está funcionando corretamente com IDs reais');
  console.log('❌ O problema deve estar em outro lugar:');
  console.log('   - Os IDs não estão sendo atualizados corretamente');
  console.log('   - A validação está rodando no momento errado');
  console.log('   - Há um problema de sincronização');
} else {
  console.log('❌ A função isPlaceholder está detectando IDs reais como placeholders!');
  console.log('   Este é o problema principal que precisa ser corrigido');
}

console.log('');
console.log('🔧 === PRÓXIMOS PASSOS ===');
console.log('1. Verificar exatamente quais IDs estão nas semifinais no momento da validação');
console.log('2. Adicionar logs mais detalhados na validação');
console.log('3. Verificar se a atualização está sendo aplicada antes ou depois da validação');
console.log('4. Verificar se existe algum problema de referência de objeto');
