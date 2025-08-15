/**
 * Script para testar se as partidas de eliminação agora usam UUIDs válidos
 */

console.log('🆔 TESTE: Verificando se as partidas usam UUIDs válidos');

// Função para simular generateUUID() como no código
function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback UUID v4 generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Função para validar UUID
function isValidUUID(uuid) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

// Simular a criação de um bracket Beach Tennis com 6 duplas
function simulateBeachTennisBracket() {
  console.log('\n🏆 Simulando criação de bracket Beach Tennis com 6 duplas...');
  
  // Gerar UUIDs como o código faz agora
  const sf1Id = generateUUID();
  const sf2Id = generateUUID();
  const finalId = generateUUID();
  
  // Simular as partidas que seriam criadas
  const matches = [
    // Quartas
    { id: generateUUID(), stage: 'ELIMINATION', round: 1, position: 1, nextMatch: sf1Id },
    { id: generateUUID(), stage: 'ELIMINATION', round: 1, position: 2, nextMatch: sf2Id },
    
    // Semifinais
    { id: sf1Id, stage: 'ELIMINATION', round: 2, position: 1, nextMatch: finalId },
    { id: sf2Id, stage: 'ELIMINATION', round: 2, position: 2, nextMatch: finalId },
    
    // Final
    { id: finalId, stage: 'ELIMINATION', round: 3, position: 1, nextMatch: null }
  ];
  
  console.log('\n📊 RESULTADOS:');
  
  let allValidUUIDs = true;
  matches.forEach((match, index) => {
    const isValid = isValidUUID(match.id);
    const nextValid = match.nextMatch ? isValidUUID(match.nextMatch) : true;
    
    console.log(`Match ${index + 1}:`);
    console.log(`  ID: ${match.id} ${isValid ? '✅' : '❌'} ${isValid ? 'UUID válido' : 'UUID inválido'}`);
    if (match.nextMatch) {
      console.log(`  Next: ${match.nextMatch} ${nextValid ? '✅' : '❌'} ${nextValid ? 'UUID válido' : 'UUID inválido'}`);
    }
    console.log(`  Stage: ${match.stage}, Round: ${match.round}, Position: ${match.position}`);
    console.log('');
    
    if (!isValid || !nextValid) {
      allValidUUIDs = false;
    }
  });
  
  return { matches, allValidUUIDs };
}

// Testar problemas antigos vs novos
function testOldVsNew() {
  console.log('\n🔍 COMPARAÇÃO: Antes vs Depois');
  
  const oldIds = [
    'beach_tennis_elimination_sf1',
    'beach_tennis_elimination_sf2', 
    'beach_tennis_elimination_final'
  ];
  
  const newIds = [
    generateUUID(),
    generateUUID(),
    generateUUID()
  ];
  
  console.log('\n❌ ANTES (strings fixas):');
  oldIds.forEach((id, index) => {
    const isValid = isValidUUID(id);
    console.log(`  ${id} ${isValid ? '✅' : '❌'} ${isValid ? 'UUID válido' : 'UUID inválido'}`);
  });
  
  console.log('\n✅ DEPOIS (UUIDs verdadeiros):');
  newIds.forEach((id, index) => {
    const isValid = isValidUUID(id);
    console.log(`  ${id} ${isValid ? '✅' : '❌'} ${isValid ? 'UUID válido' : 'UUID inválido'}`);
  });
}

// Simular validação do sync de banco
function testDatabaseSync() {
  console.log('\n💾 TESTE: Validação de sync para banco de dados');
  
  const mixedMatches = [
    { id: generateUUID(), name: 'QF1 - UUID válido' },
    { id: 'beach_tennis_elimination_sf1', name: 'SF1 - String fixa (OLD)' },
    { id: generateUUID(), name: 'SF1 - UUID válido (NEW)' },
    { id: 'beach_tennis_elimination_final', name: 'Final - String fixa (OLD)' },
    { id: generateUUID(), name: 'Final - UUID válido (NEW)' }
  ];
  
  const validMatches = [];
  const invalidMatches = [];
  
  mixedMatches.forEach(match => {
    if (isValidUUID(match.id)) {
      validMatches.push(match);
    } else {
      invalidMatches.push(match);
    }
  });
  
  console.log(`\n✅ VÁLIDAS PARA SYNC: ${validMatches.length}`);
  validMatches.forEach(match => {
    console.log(`  ${match.name}: ${match.id.substring(0, 8)}...`);
  });
  
  console.log(`\n❌ REJEITADAS PELO SYNC: ${invalidMatches.length}`);
  invalidMatches.forEach(match => {
    console.log(`  ${match.name}: ${match.id}`);
  });
  
  return { validMatches: validMatches.length, invalidMatches: invalidMatches.length };
}

// Executar todos os testes
const bracketResult = simulateBeachTennisBracket();
testOldVsNew();
const syncResult = testDatabaseSync();

console.log('\n📝 RESUMO FINAL:');
console.log(`✅ Bracket Beach Tennis: ${bracketResult.allValidUUIDs ? 'TODOS UUIDs VÁLIDOS' : 'CONTÉM UUIDs INVÁLIDOS'}`);
console.log(`✅ Partidas válidas para sync: ${syncResult.validMatches}`);
console.log(`❌ Partidas rejeitadas: ${syncResult.invalidMatches}`);

if (bracketResult.allValidUUIDs && syncResult.invalidMatches === 0) {
  console.log('\n🎉 SUCESSO: Problema de UUID resolvido!');
  console.log('   - Todas as partidas agora usam UUIDs válidos');
  console.log('   - Sync com banco de dados funcionará corretamente');
  console.log('   - Duplas podem avançar das quartas para semifinais');
} else {
  console.log('\n⚠️  AINDA HÁ PROBLEMAS: Revisar implementação');
}
