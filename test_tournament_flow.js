// Teste para verificar o fluxo após sorteio de duplas
// Este arquivo testa a lógica de exibição após o sorteio

console.log('🧪 Teste: Verificação do fluxo após sorteio');

// Simular dados após sorteio
const simulatedTournamentData = {
  id: 'test-tournament-123',
  status: 'CREATED',
  matches: [], // Ainda não há matches criadas
  teams_data: [
    { id: '1', players: ['Player 1', 'Player 2'] },
    { id: '2', players: ['Player 3', 'Player 4'] },
    { id: '3', players: ['Player 5', 'Player 6'] },
    { id: '4', players: ['Player 7', 'Player 8'] }
  ],
  groups_data: [
    { id: 1, name: 'Grupo A', teams: ['1', '2'] },
    { id: 2, name: 'Grupo B', teams: ['3', '4'] }
  ],
  matches_data: [],
  standings_data: []
};

// Função para testar a lógica de detecção de dados do sorteio
function testHasDataFromDraw(tournament) {
  return tournament && (
    (tournament.teams_data && tournament.teams_data.length > 0) ||
    (tournament.groups_data && tournament.groups_data.length > 0) ||
    (tournament.matches_data && tournament.matches_data.length > 0) ||
    (tournament.standings_data && tournament.standings_data.length > 0)
  );
}

// Função para testar se o torneio tem dados
function testTournamentHasData(tournament) {
  const hasDataFromDraw = testHasDataFromDraw(tournament);
  
  return tournament && (
    tournament.matches.length > 0 || 
    tournament.status === 'CREATED' ||
    hasDataFromDraw
  );
}

// Executar testes
const hasDataFromDraw = testHasDataFromDraw(simulatedTournamentData);
const tournamentHasData = testTournamentHasData(simulatedTournamentData);

console.log('📊 Resultados do teste:');
console.log(`- Dados do sorteio detectados: ${hasDataFromDraw ? '✅ SIM' : '❌ NÃO'}`);
console.log(`- Torneio deve mostrar dados: ${tournamentHasData ? '✅ SIM' : '❌ NÃO'}`);
console.log(`- Status do torneio: ${simulatedTournamentData.status}`);
console.log(`- Número de matches: ${simulatedTournamentData.matches.length}`);
console.log(`- Teams data: ${simulatedTournamentData.teams_data.length} times`);
console.log(`- Groups data: ${simulatedTournamentData.groups_data.length} grupos`);

// Teste sem dados do sorteio
const emptyTournamentData = {
  id: 'test-tournament-456',
  status: 'PENDING',
  matches: [],
  teams_data: null,
  groups_data: null,
  matches_data: null,
  standings_data: null
};

const emptyHasDataFromDraw = testHasDataFromDraw(emptyTournamentData);
const emptyTournamentHasData = testTournamentHasData(emptyTournamentData);

console.log('\n📊 Teste com torneio vazio:');
console.log(`- Dados do sorteio detectados: ${emptyHasDataFromDraw ? '✅ SIM' : '❌ NÃO'}`);
console.log(`- Torneio deve mostrar dados: ${emptyTournamentHasData ? '✅ SIM' : '❌ NÃO'}`);

console.log('\n🎯 Conclusão:');
if (hasDataFromDraw && tournamentHasData) {
  console.log('✅ SUCESSO: Após o sorteio, o sistema deve mostrar os grupos e duplas');
} else {
  console.log('❌ FALHA: A lógica não está detectando os dados do sorteio corretamente');
}

if (!emptyHasDataFromDraw && !emptyTournamentHasData) {
  console.log('✅ SUCESSO: Torneio vazio não mostra dados (correto)');
} else {
  console.log('⚠️ ATENÇÃO: Torneio vazio está mostrando dados incorretamente');
}
