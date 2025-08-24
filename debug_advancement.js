/**
 * SCRIPT DE DEBUG: Verificar Avanço Automático em Tempo Real
 * 
 * Execute este script no console do navegador para monitorar
 * o comportamento do avanço automático.
 */

// 1. Verificar estado atual do torneio
console.log('🔍 [DEBUG] Verificando estado do torneio...');

// Função para debugar torneio
window.debugTournament = () => {
  const tournamentStore = window.__tournamentStore || {};
  const tournament = tournamentStore.tournament;
  
  if (!tournament) {
    console.error('❌ Nenhum torneio encontrado no store');
    return;
  }
  
  console.log('🏆 TORNEIO ATUAL:', {
    id: tournament.id,
    status: tournament.status,
    matchesTotal: tournament.matches?.length || 0
  });
  
  // Separar partidas por estágio
  const groupMatches = tournament.matches?.filter(m => m.stage === 'GROUP') || [];
  const elimMatches = tournament.matches?.filter(m => m.stage === 'ELIMINATION') || [];
  
  console.log('📊 PARTIDAS POR ESTÁGIO:', {
    group: groupMatches.length,
    elimination: elimMatches.length
  });
  
  // Verificar partidas de eliminação por rodada
  const elimByRound = elimMatches.reduce((acc, match) => {
    const round = match.round || 0;
    if (!acc[round]) acc[round] = [];
    acc[round].push(match);
    return acc;
  }, {});
  
  console.log('🎯 PARTIDAS DE ELIMINAÇÃO POR RODADA:');
  Object.keys(elimByRound).forEach(round => {
    const matches = elimByRound[round];
    console.log(`   Rodada ${round}: ${matches.length} partidas`);
    
    matches.forEach((match, index) => {
      const team1Display = Array.isArray(match.team1) ? match.team1.join(' & ') : match.team1;
      const team2Display = Array.isArray(match.team2) ? match.team2.join(' & ') : match.team2;
      
      console.log(`     ${index + 1}. ${match.id} - ${team1Display} vs ${team2Display} ${match.completed ? '✅' : '⏳'}`);
      
      // Verificar se tem placeholders
      if (team1Display?.includes('Vencedor') || team2Display?.includes('Vencedor')) {
        console.log(`        🎯 PLACEHOLDER DETECTADO!`);
      }
    });
  });
  
  return {
    tournament,
    groupMatches,
    elimMatches,
    elimByRound
  };
};

// 2. Função para simular avanço automático
window.testAdvancement = (matchId, score1, score2) => {
  console.log('🧪 [TEST] Simulando avanço automático...', { matchId, score1, score2 });
  
  const data = window.debugTournament();
  if (!data) return;
  
  const { tournament } = data;
  
  // Encontrar a partida
  const match = tournament.matches.find(m => m.id === matchId);
  if (!match) {
    console.error('❌ Partida não encontrada:', matchId);
    return;
  }
  
  console.log('🎯 [TEST] Partida encontrada:', {
    id: match.id,
    round: match.round,
    position: match.position,
    team1: match.team1,
    team2: match.team2
  });
  
  // Determinar vencedor
  const winnerId = score1 > score2 ? 'team1' : 'team2';
  const winnerTeam = winnerId === 'team1' ? match.team1 : match.team2;
  
  console.log('🏆 [TEST] Vencedor:', { winnerId, winnerTeam });
  
  // Buscar partidas dependentes
  const expectedPlaceholders = [
    `WINNER_R${match.round}_${match.position}`,
    `Vencedor R${match.round}_${match.position}`,
    `WINNER_R${match.round}-${match.position}`,
    `Vencedor R${match.round}-${match.position}`
  ];
  
  console.log('🔍 [TEST] Procurando por placeholders:', expectedPlaceholders);
  
  const dependentMatches = tournament.matches.filter(m => {
    const team1String = Array.isArray(m.team1) ? m.team1.join(' ') : '';
    const team2String = Array.isArray(m.team2) ? m.team2.join(' ') : '';
    
    return expectedPlaceholders.some(placeholder => 
      team1String.includes(placeholder) || team2String.includes(placeholder)
    );
  });
  
  console.log('🔗 [TEST] Partidas dependentes encontradas:', dependentMatches.length);
  dependentMatches.forEach(depMatch => {
    console.log(`   - ${depMatch.id}: ${depMatch.team1} vs ${depMatch.team2}`);
  });
  
  return { match, winnerTeam, dependentMatches };
};

// 3. Verificar placeholders específicos
window.findPlaceholders = () => {
  const data = window.debugTournament();
  if (!data) return;
  
  const { elimMatches } = data;
  
  console.log('🎯 [PLACEHOLDERS] Procurando por placeholders...');
  
  elimMatches.forEach(match => {
    const team1String = Array.isArray(match.team1) ? match.team1.join(' ') : '';
    const team2String = Array.isArray(match.team2) ? match.team2.join(' ') : '';
    
    if (team1String.includes('Vencedor') || team1String.includes('WINNER') ||
        team2String.includes('Vencedor') || team2String.includes('WINNER')) {
      console.log(`🎯 PLACEHOLDER em ${match.id}:`, {
        round: match.round,
        position: match.position,
        team1: match.team1,
        team2: match.team2
      });
    }
  });
};

// 4. Executar verificações iniciais
setTimeout(() => {
  console.log('🚀 [DEBUG] Executando verificações iniciais...');
  window.debugTournament();
  window.findPlaceholders();
  
  console.log('📝 [DEBUG] Comandos disponíveis:');
  console.log('   - debugTournament() - Mostra estado do torneio');
  console.log('   - findPlaceholders() - Procura placeholders');
  console.log('   - testAdvancement(matchId, score1, score2) - Testa avanço');
}, 1000);

console.log('🎯 [DEBUG] Script de debug carregado! Execute os comandos no console.');
