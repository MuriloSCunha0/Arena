// Script para debugar o problema das semifinais que persistem com placeholders
// Simula exatamente o que deveria estar acontecendo no banco de dados

console.log('🔍 DEBUG: Simulando problema das semifinais...');

// Simular dados de elimination_bracket ANTES da atualização (com placeholders)
const eliminationBracketData = [
  {
    id: 'beach_tennis_elimination_sf1',
    round: 2,
    position: 1,
    team1: ['primeiro-colocado-uuid-1', 'primeiro-colocado-uuid-2'], // BYE para 1º lugar
    team2: ['WINNER_QF1', 'WINNER_QF1_PARTNER'], // placeholder
    stage: 'ELIMINATION'
  },
  {
    id: 'beach_tennis_elimination_sf2', 
    round: 2,
    position: 2,
    team1: ['segundo-colocado-uuid-1', 'segundo-colocado-uuid-2'], // BYE para 2º lugar
    team2: ['WINNER_QF2', 'WINNER_QF2_PARTNER'], // placeholder
    stage: 'ELIMINATION'
  }
];

// Simular dados de matches_data DEPOIS da atualização (com UUIDs reais)
const matchesData = [
  {
    id: 'beach_tennis_elimination_sf1',
    round: 2,
    position: 1,
    team1: ['primeiro-colocado-uuid-1', 'primeiro-colocado-uuid-2'],
    team2: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'], // vencedor QF1
    stage: 'ELIMINATION'
  },
  {
    id: 'beach_tennis_elimination_sf2',
    round: 2, 
    position: 2,
    team1: ['segundo-colocado-uuid-1', 'segundo-colocado-uuid-2'],
    team2: ['162f9769-c680-4dc8-8188-ac28293a2c6c', '8c8a1d4a-1196-40cc-b8a3-5ddc3eb62c96'], // vencedor QF2
    stage: 'ELIMINATION'
  }
];

// Função de detecção de placeholder (copiada do código)
const isPlaceholderId = (id) => typeof id === 'string' && (
  id.includes('WINNER_') || id.includes('TBD') || id.includes('Vencedor') || id === 'Desconhecido' || id.length < 36
);

console.log('\n📊 Testando lógica de merge...');

// Simular a lógica de merge CORRIGIDA
const matchesDataMap = new Map();
matchesData.forEach(m => matchesDataMap.set(m.id, m));

const mergedEliminationMatches = eliminationBracketData.map(em => {
  const md = matchesDataMap.get(em.id);
  if (!md) {
    console.log(`🔍 Sem match em matches_data para ${em.id}`);
    return em;
  }
  
  console.log(`\n🔍 Match ${em.id}:`);
  console.log(`  - elimination_bracket: team1=${JSON.stringify(em.team1)}, team2=${JSON.stringify(em.team2)}`);
  console.log(`  - matches_data: team1=${JSON.stringify(md.team1)}, team2=${JSON.stringify(md.team2)}`);
  
  // CORRIGIDO: Se em possui placeholders WINNER_ em qualquer slot e md tem MENOS placeholders, preferir md
  const emHasWinnerPlaceholder = (em.team1 || []).some(x => typeof x === 'string' && x.includes('WINNER_')) || 
                                (em.team2 || []).some(x => typeof x === 'string' && x.includes('WINNER_'));
  const mdHasFewerPlaceholders = ((md.team1 || []).filter(x => isPlaceholderId(x)).length + 
                                 (md.team2 || []).filter(x => isPlaceholderId(x)).length) <
                                ((em.team1 || []).filter(x => isPlaceholderId(x)).length + 
                                 (em.team2 || []).filter(x => isPlaceholderId(x)).length);
  
  console.log(`  - emHasWinnerPlaceholder: ${emHasWinnerPlaceholder}, mdHasFewerPlaceholders: ${mdHasFewerPlaceholders}`);
  console.log(`  - em total placeholders: ${(em.team1 || []).filter(x => isPlaceholderId(x)).length + (em.team2 || []).filter(x => isPlaceholderId(x)).length}`);
  console.log(`  - md total placeholders: ${(md.team1 || []).filter(x => isPlaceholderId(x)).length + (md.team2 || []).filter(x => isPlaceholderId(x)).length}`);
  
  if (emHasWinnerPlaceholder && mdHasFewerPlaceholders) {
    console.log(`♻️ MERGE: Substituindo placeholders na eliminação pelo match mais completo de matches_data`);
    return { ...md };
  }
  return em;
});

console.log('\n✅ Resultado do merge:');
mergedEliminationMatches.forEach(match => {
  console.log(`${match.id}: team2 = ${JSON.stringify(match.team2)}`);
});

// Testar detecção de placeholder APÓS merge
console.log('\n🧪 Testando detecção de placeholder após merge...');
mergedEliminationMatches.forEach(match => {
  const hasPlaceholderTeam1 = match.team1 && match.team1.some(teamId => isPlaceholderId(teamId));
  const hasPlaceholderTeam2 = match.team2 && match.team2.some(teamId => isPlaceholderId(teamId));
  
  console.log(`${match.id}:`);
  console.log(`  - hasPlaceholderTeam1: ${hasPlaceholderTeam1}`);
  console.log(`  - hasPlaceholderTeam2: ${hasPlaceholderTeam2}`);
  console.log(`  - seria skipado no sync: ${hasPlaceholderTeam1 || hasPlaceholderTeam2}`);
});

console.log('\n🎯 Conclusão: Se o merge funcionasse corretamente, nenhuma semifinal deveria ser skipada.');
