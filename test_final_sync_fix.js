/**
 * Script para testar a correção do sync e merge das partidas da final
 * Simula o cenário onde as semifinais foram completadas mas a final não está avançando
 */

console.log('🧪 TESTE: Verificando correção do sync e merge das partidas da final');

// Simular dados como estão aparecendo nos logs
const eliminationBracketData = [
  {
    id: '07b47d19-0f47-46e6-856c-9b088656c3c0',
    team1: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'],
    team2: ['5de42327-3e66-48fe-9181-b38815e3f87e', 'aa9b3f36-ad35-43fd-b82c-3a21068623f1'],
    round: 1,
    position: 1,
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'cfd64f15-7b2a-4797-bf9e-34b02a255e6b',
    team1: ['14a65ea8-b2bc-4425-8a82-dfcc83c9eefc', 'a8fc0942-6488-4d5b-9962-108161af869e'],
    team2: ['162f9769-c680-4dc8-8188-ac28293a2c6c', '8c8a1d4a-1196-40cc-b8a3-5ddc3eb62c96'],
    round: 1,
    position: 2,
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'beach_tennis_elimination_sf1',
    team1: ['1bbf3cd6-0144-4711-9699-cdfda9fb9491', 'f31b75d0-43d6-4b5d-bd07-a5d5621d5087'],
    team2: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'],
    round: 2,
    position: 1,
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'beach_tennis_elimination_sf2',
    team1: ['8c3a3ec5-1853-45fb-8f52-a59719602673', '843f5284-8fe9-476b-ab2c-c4c5aeaf4043'],
    team2: ['14a65ea8-b2bc-4425-8a82-dfcc83c9eefc', 'a8fc0942-6488-4d5b-9962-108161af869e'],
    round: 2,
    position: 2,
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'beach_tennis_elimination_final',
    team1: ['1bbf3cd6-0144-4711-9699-cdfda9fb9491', 'f31b75d0-43d6-4b5d-bd07-a5d5621d5087'], // ATUALIZADO com vencedor SF1
    team2: ['8c3a3ec5-1853-45fb-8f52-a59719602673', '843f5284-8fe9-476b-ab2c-c4c5aeaf4043'], // ATUALIZADO com vencedor SF2
    round: 3,
    position: 1,
    completed: false,
    winnerId: null,
    score1: 0,
    score2: 0
  }
];

const matchesData = [
  // ... 9 matches de grupo ...
  {
    id: '07b47d19-0f47-46e6-856c-9b088656c3c0',
    team1: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'],
    team2: ['5de42327-3e66-48fe-9181-b38815e3f87e', 'aa9b3f36-ad35-43fd-b82c-3a21068623f1'],
    round: 1,
    position: 1,
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'cfd64f15-7b2a-4797-bf9e-34b02a255e6b',
    team1: ['14a65ea8-b2bc-4425-8a82-dfcc83c9eefc', 'a8fc0942-6488-4d5b-9962-108161af869e'],
    team2: ['162f9769-c680-4dc8-8188-ac28293a2c6c', '8c8a1d4a-1196-40cc-b8a3-5ddc3eb62c96'],
    round: 1,
    position: 2,
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'beach_tennis_elimination_sf1',
    team1: ['1bbf3cd6-0144-4711-9699-cdfda9fb9491', 'f31b75d0-43d6-4b5d-bd07-a5d5621d5087'],
    team2: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe', '680db2cb-dac0-4e9b-8ef3-0555ab3387d7'],
    round: 2,
    position: 1,
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'beach_tennis_elimination_sf2',
    team1: ['8c3a3ec5-1853-45fb-8f52-a59719602673', '843f5284-8fe9-476b-ab2c-c4c5aeaf4043'],
    team2: ['14a65ea8-b2bc-4425-8a82-dfcc83c9eefc', 'a8fc0942-6488-4d5b-9962-108161af869e'],
    round: 2,
    position: 2,
    completed: true,
    winnerId: 'team1',
    score1: 6,
    score2: 0
  },
  {
    id: 'beach_tennis_elimination_final',
    team1: ['WINNER_SF1', 'WINNER_SF1_PARTNER'], // AINDA COM PLACEHOLDERS (problema!)
    team2: ['8c3a3ec5-1853-45fb-8f52-a59719602673', '843f5284-8fe9-476b-ab2c-c4c5aeaf4043'], // ATUALIZADO
    round: 3,
    position: 1,
    completed: false,
    winnerId: null,
    score1: 0,
    score2: 0
  }
];

// Função para verificar se um ID é placeholder
function isPlaceholderId(id) {
  return typeof id === 'string' && (
    id.includes('WINNER_') ||
    id.includes('TBD') ||
    id.includes('Vencedor') ||
    id === 'Desconhecido' ||
    id.length < 36
  );
}

// Simular lógica de merge corrigida
function testMergeLogic() {
  console.log('\n📊 TESTE 1: Lógica de Merge');
  
  const matchesDataMap = new Map();
  matchesData.forEach(m => matchesDataMap.set(m.id, m));
  
  const mergedMatches = eliminationBracketData.map(em => {
    const md = matchesDataMap.get(em.id);
    if (!md) {
      console.log(`🔍 Sem match em matches_data para ${em.id}`);
      return em;
    }
    
    // Contar placeholders
    const emPlaceholders = ((em.team1 || []).filter(x => isPlaceholderId(x)).length + 
                           (em.team2 || []).filter(x => isPlaceholderId(x)).length);
    const mdPlaceholders = ((md.team1 || []).filter(x => isPlaceholderId(x)).length + 
                           (md.team2 || []).filter(x => isPlaceholderId(x)).length);
    
    console.log(`🔍 Match ${em.id}:`);
    console.log(`  - elimination_bracket placeholders: ${emPlaceholders}`);
    console.log(`  - matches_data placeholders: ${mdPlaceholders}`);
    
    // Sempre preferir a versão com MENOS placeholders
    if (mdPlaceholders < emPlaceholders) {
      console.log(`♻️ [MERGE] Usando matches_data (menos placeholders) para ${em.id}`);
      return { 
        ...em,
        team1: md.team1,
        team2: md.team2,
        score1: md.score1,
        score2: md.score2,
        winnerId: md.winnerId,
        completed: md.completed,
        updatedAt: md.updatedAt || new Date().toISOString()
      };
    } else if (emPlaceholders < mdPlaceholders) {
      console.log(`♻️ [MERGE] Usando elimination_bracket (menos placeholders) para ${em.id}`);
      return em;
    } else {
      console.log(`📊 [MERGE] Mesmo número de placeholders, mesclando dados para ${em.id}`);
      return {
        ...em,
        score1: md.score1 !== undefined ? md.score1 : em.score1,
        score2: md.score2 !== undefined ? md.score2 : em.score2,
        winnerId: md.winnerId || em.winnerId,
        completed: md.completed !== undefined ? md.completed : em.completed,
        updatedAt: md.updatedAt || em.updatedAt || new Date().toISOString()
      };
    }
  });
  
  // Verificar resultado do merge para a final
  const finalMatch = mergedMatches.find(m => m.id === 'beach_tennis_elimination_final');
  
  console.log('\n🏆 RESULTADO FINAL:');
  console.log(`Team1: ${JSON.stringify(finalMatch.team1)}`);
  console.log(`Team2: ${JSON.stringify(finalMatch.team2)}`);
  
  const finalPlaceholders = ((finalMatch.team1 || []).filter(x => isPlaceholderId(x)).length + 
                            (finalMatch.team2 || []).filter(x => isPlaceholderId(x)).length);
  
  console.log(`Placeholders na final: ${finalPlaceholders}`);
  
  if (finalPlaceholders === 0) {
    console.log('✅ TESTE PASSOU: Final não tem mais placeholders!');
  } else {
    console.log('❌ TESTE FALHOU: Final ainda tem placeholders');
  }
  
  return mergedMatches;
}

// Teste de validação de UUID para sync
function testUUIDValidation() {
  console.log('\n🔍 TESTE 2: Validação de UUID para Sync');
  
  const testMatches = [
    {
      id: '07b47d19-0f47-46e6-856c-9b088656c3c0', // UUID válido
      team1: ['b0fe83d9-3b29-4249-afa4-fcad84d4cffe'],
      team2: ['5de42327-3e66-48fe-9181-b38815e3f87e']
    },
    {
      id: 'beach_tennis_elimination_sf1', // ID inválido (não UUID)
      team1: ['1bbf3cd6-0144-4711-9699-cdfda9fb9491'],
      team2: ['f31b75d0-43d6-4b5d-bd07-a5d5621d5087']
    }
  ];
  
  testMatches.forEach(match => {
    const isValidMatchId = typeof match.id === 'string' && 
                           match.id.length === 36 && 
                           /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(match.id);
    
    console.log(`Match ${match.id}: ${isValidMatchId ? '✅ UUID válido' : '❌ UUID inválido'}`);
  });
}

// Executar testes
testMergeLogic();
testUUIDValidation();

console.log('\n🏁 Teste concluído. Se a final não tem mais placeholders e apenas UUIDs válidos passam na validação, a correção funciona!');
