/**
 * Script para testar o avanço automático para a final
 */

console.log('🧪 TESTE: Avanço para Final - Simulação de Merge');

// Simular dados como aparecem nos logs
const eliminationBracket = {
  "beach_tennis_elimination_final": {
    team1: ["WINNER_SF1", "WINNER_SF1_PARTNER"],
    team2: ["8c3a3ec5-1853-45fb-8f52-a59719602673", "843f5284-8fe9-476b-ab2c-c4c5aeaf4043"],
    round: 3,
    position: 1
  }
};

const matchesData = {
  "beach_tennis_elimination_final": {
    team1: ["1bbf3cd6-0144-4711-9699-cdfda9fb9491", "f31b75d0-43d6-4b5d-bd07-a5d5621d5087"],
    team2: ["8c3a3ec5-1853-45fb-8f52-a59719602673", "843f5284-8fe9-476b-ab2c-c4c5aeaf4043"],
    round: 3,
    position: 1
  }
};

// Função auxiliar para detectar placeholders (como no código)
const isPlaceholderId = (id) => typeof id === 'string' && (
  id.includes('WINNER_') || id.includes('TBD') || id.includes('Vencedor') || id === 'Desconhecido' || id.length < 36
);

console.log('\n📊 ESTADO INICIAL:');
console.log('elimination_bracket final:', eliminationBracket["beach_tennis_elimination_final"]);
console.log('matches_data final:', matchesData["beach_tennis_elimination_final"]);

// Simular lógica de merge (nova versão)
function testMerge() {
  const em = eliminationBracket["beach_tennis_elimination_final"];
  const md = matchesData["beach_tennis_elimination_final"];

  console.log('\n🔍 ANÁLISE DE PLACEHOLDERS:');
  
  const emPlaceholders = (em.team1 || []).filter(x => isPlaceholderId(x)).length + 
                        (em.team2 || []).filter(x => isPlaceholderId(x)).length;
  const mdPlaceholders = (md.team1 || []).filter(x => isPlaceholderId(x)).length + 
                        (md.team2 || []).filter(x => isPlaceholderId(x)).length;
  
  console.log(`emPlaceholders: ${emPlaceholders}`);
  console.log(`mdPlaceholders: ${mdPlaceholders}`);
  console.log(`md tem menos placeholders? ${mdPlaceholders < emPlaceholders}`);
  
  if (mdPlaceholders < emPlaceholders) {
    console.log('\n✅ RESULTADO: Usando matches_data (tem menos placeholders)');
    return { ...md };
  } else {
    console.log('\n❌ RESULTADO: Mantendo elimination_bracket (não detectou melhoria)');
    return em;
  }
}

const result = testMerge();
console.log('\n🎯 RESULTADO FINAL:', result);

// Validar se o resultado seria válido para sync
const hasPlaceholders = (result.team1 || []).some(id => isPlaceholderId(id)) ||
                       (result.team2 || []).some(id => isPlaceholderId(id));

console.log('\n🔍 VALIDAÇÃO SYNC:');
console.log(`Tem placeholders? ${hasPlaceholders}`);
console.log(`Seria sincronizado com DB? ${!hasPlaceholders}`);

if (!hasPlaceholders) {
  console.log('✅ A final seria sincronizada e apareceria na UI!');
} else {
  console.log('❌ A final ainda seria pulada na sincronização.');
}
