// 🔍 DIAGNÓSTICO: Entender a estrutura real do bracket
console.log('🔍 ===== ANALISANDO ESTRUTURA REAL DO BRACKET =====');

// Dados do banco que você forneceu
const bracketData = {
  "matches": [
    {"id": "86906994-c0ef-4656-8ad7-111ea79b188a", "round": 1, "position": 1, "stage": "ELIMINATION", "team1": ["9022356f-e7ad-4fc5-8ce2-d793783f22e1", "30b8eba5-4011-4bff-920d-f1c1d852238a"], "team2": ["1ecdeba6-6368-4168-a31a-6c350959f043", "84710a6f-86e2-4977-aca1-e1949a19dd6d"], "winnerId": "team1", "completed": true},
    {"id": "31222ba9-b221-4302-9d5f-4caab29234e6", "round": 1, "position": 2, "stage": "ELIMINATION", "team1": ["150f5235-2bc9-4942-9776-418de09fdb3a", "4b1314a1-bb7a-4f82-a8fd-02917ecd8fae"], "team2": ["442dbded-97de-4b44-a512-15836b21c67e", "a7bbbab4-064d-4040-9345-1e9cd1446bba"], "winnerId": null, "completed": false},
    {"id": "e81ab41f-bd88-48f6-8ec4-8a5c3b6e01b1", "round": 2, "position": 3, "stage": "ELIMINATION", "team1": ["da40b891-4826-413c-a9a0-9e37944a1ace", "1372a2fb-d20a-405c-995c-ecaa03977521"], "team2": ["fe4afdf4-8232-43f9-bd0c-260750afeddd", "33fde390-d355-486f-a540-ff010bfbb439"], "winnerId": null, "completed": false},
    {"id": "1bfe2413-1cc0-4d78-9ba5-cdb92f76e9ed", "round": 2, "position": 4, "stage": "ELIMINATION", "team1": ["9ce8fba7-bb1d-4f39-a662-39b60667e009", "b7b05df6-fb8d-453b-b790-f313e0b2d0c7"], "team2": ["2021b127-c1aa-438a-adf4-be12b400388c", "c1e0efa5-9704-4913-97f4-c3e5243f0ee8"], "winnerId": null, "completed": false},
    {"id": "090238cc-9f22-49c0-9e9d-7dce65d51117", "round": 2, "position": 5, "stage": "ELIMINATION", "team1": ["a34ef78b-25d2-4ba8-8736-cc7d2810dcd3", "2b3bebba-6470-4363-b2c5-ca25c9298aed"], "team2": ["aa249f11-044e-445e-a9cb-647e5137b501", "d65ea5c1-b841-44c4-b95d-da34bfea5333"], "winnerId": null, "completed": false},
    {"id": "63c77bdd-abbc-49ae-98d6-07bde86adcc7", "round": 2, "position": 6, "stage": "ELIMINATION", "team1": ["WINNER_R1_1"], "team2": ["WINNER_R1_2"], "winnerId": null, "completed": false},
    {"id": "fd32674f-2a1f-4a27-8d6a-d08ca4a720ef", "round": 3, "position": 7, "stage": "ELIMINATION", "team1": ["WINNER_R2_1"], "team2": ["WINNER_R2_2"], "winnerId": null, "completed": false},
    {"id": "5bd81c4f-11d7-4daa-89f0-9be61d4e61d5", "round": 3, "position": 8, "stage": "ELIMINATION", "team1": ["WINNER_R2_3"], "team2": ["WINNER_R2_4"], "winnerId": null, "completed": false},
    {"id": "c28f1029-89b0-4f97-8122-7fc193537ce2", "round": 4, "position": 9, "stage": "ELIMINATION", "team1": ["WINNER_R3_1"], "team2": ["WINNER_R3_2"], "winnerId": null, "completed": false}
  ]
};

console.log('\n📊 ANÁLISE DA ESTRUTURA:');

// Agrupar por rodada
const rounds = {};
bracketData.matches.forEach(match => {
  if (!rounds[match.round]) rounds[match.round] = [];
  rounds[match.round].push(match);
});

// Ordenar por posição
Object.keys(rounds).forEach(round => {
  rounds[round].sort((a, b) => a.position - b.position);
});

console.log('\n🔍 ESTRUTURA POR RODADA:');
Object.keys(rounds).forEach(round => {
  console.log(`\n🏆 RODADA ${round}:`);
  rounds[round].forEach(match => {
    const team1Str = Array.isArray(match.team1) ? match.team1.join(' & ') : match.team1;
    const team2Str = Array.isArray(match.team2) ? match.team2.join(' & ') : match.team2;
    console.log(`   Posição ${match.position}: ${team1Str} vs ${team2Str}`);
  });
});

console.log('\n❌ PROBLEMA IDENTIFICADO:');
console.log('R1 tem posições 1,2 mas R2 tem posições 3,4,5,6');
console.log('R2 tem posições 3,4,5,6 mas R3 tem posições 7,8');
console.log('R3 tem posições 7,8 mas R4 tem posição 9');

console.log('\n🎯 LÓGICA CORRETA DEVERIA SER:');
console.log('R1_1 vencedor → primeira posição disponível em R2');
console.log('R1_2 vencedor → segunda posição disponível em R2');

// Mapear posições corretas
console.log('\n🔄 MAPEAMENTO CORRETO:');

// R1 para R2: precisa mapear para as primeiras posições de R2
const r1Matches = rounds[1]; // posições 1,2
const r2Matches = rounds[2]; // posições 3,4,5,6
console.log(`R1 (${r1Matches.length} matches) → R2 (${r2Matches.length} matches)`);

// Identificar quais matches de R2 são para vencedores de R1
const r2WithPlaceholders = r2Matches.filter(match => {
  const team1HasR1Placeholder = Array.isArray(match.team1) && match.team1.some(p => typeof p === 'string' && p.includes('WINNER_R1_'));
  const team2HasR1Placeholder = Array.isArray(match.team2) && match.team2.some(p => typeof p === 'string' && p.includes('WINNER_R1_'));
  return team1HasR1Placeholder || team2HasR1Placeholder;
});

console.log('R2 matches com placeholders R1:');
r2WithPlaceholders.forEach(match => {
  console.log(`   R2_${match.position}: ${match.team1} vs ${match.team2}`);
});

// O correto seria:
console.log('\n✅ MAPEAMENTO IDEAL:');
console.log('R1_1 vencedor → R2_6 team1 (WINNER_R1_1)');
console.log('R1_2 vencedor → R2_6 team2 (WINNER_R1_2)');

// Para R2 para R3
const r3Matches = rounds[3]; // posições 7,8
console.log(`\nR2 (${r2Matches.length} matches) → R3 (${r3Matches.length} matches)`);

// Mas aqui fica confuso porque há placeholders WINNER_R2_1, WINNER_R2_2, WINNER_R2_3, WINNER_R2_4
// Mas R2 tem posições 3,4,5,6... 

console.log('\n🚨 INCONSISTÊNCIA DETECTADA:');
console.log('Placeholders referenciam WINNER_R2_1, WINNER_R2_2 mas R2 tem posições 3,4,5,6');
console.log('Isso sugere que o sistema de placeholders está usando numeração sequencial (1,2,3...) mas as posições reais são diferentes');

console.log('\n🔧 SOLUÇÃO SUGERIDA:');
console.log('1. Mapear vencedores por ordem sequencial, não por placeholder específico');
console.log('2. R1_1 (primeira de R1) → primeira posição disponível de R2');
console.log('3. R1_2 (segunda de R1) → segunda posição disponível de R2');
