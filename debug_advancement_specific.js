/**
 * SCRIPT DE DEBUG ESPECÍFICO: Verificar Problemas de Avanço
 * 
 * Execute este no console do browser para debugar o avanço automático
 */

console.log('🔍 [DEBUG ESPECÍFICO] Iniciando investigação do avanço automático...');

// Função para inspecionar o estado atual
window.inspectTournamentState = () => {
  // Tentar acessar o store do React via diferentes métodos
  let tournament = null;
  
  // Método 1: Procurar no React DevTools
  if (window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    const reactFiber = document.querySelector('[data-testid="tournament-bracket"]');
    if (reactFiber && reactFiber._reactInternalFiber) {
      // Navegar pela árvore do React para encontrar o store
      console.log('🔍 React fiber encontrado');
    }
  }
  
  // Método 2: Inspecionar dados diretamente do DOM
  const bracketContainer = document.querySelector('[class*="bracket"]') || 
                          document.querySelector('[class*="tournament"]') ||
                          document.querySelector('main');
  
  if (bracketContainer) {
    console.log('🔍 Container do bracket encontrado:', bracketContainer);
    
    // Procurar por elementos que mostram "Vencedor R1_"
    const placeholderElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent && (
        el.textContent.includes('Vencedor R1_') ||
        el.textContent.includes('WINNER_R1_') ||
        el.textContent.includes('Vencedor R') ||
        el.textContent.includes('WINNER_R')
      ));
    
    console.log('🎯 [PLACEHOLDERS ENCONTRADOS]:', placeholderElements.length);
    placeholderElements.forEach((el, index) => {
      console.log(`   ${index + 1}. "${el.textContent}" - Tag: ${el.tagName}`);
    });
    
    // Procurar por partidas concluídas
    const completedElements = Array.from(document.querySelectorAll('*'))
      .filter(el => el.textContent && el.textContent.includes('Concluída'));
    
    console.log('✅ [PARTIDAS CONCLUÍDAS]:', completedElements.length);
    
    return {
      placeholderElements,
      completedElements,
      bracketContainer
    };
  }
  
  return null;
};

// Função para simular o avanço manual
window.simulateAdvancement = () => {
  console.log('🧪 [SIMULAÇÃO] Testando lógica de avanço...');
  
  // Simular dados de uma partida concluída
  const mockCompletedMatch = {
    id: 'match_1_1',
    round: 1,
    position: 1,
    team1: ['player1_id', 'player2_id'],
    team2: ['player3_id', 'player4_id'],
    stage: 'ELIMINATION',
    completed: true
  };
  
  // Simular partida dependente
  const mockDependentMatch = {
    id: 'match_2_1',
    round: 2,
    position: 1,
    team1: ['WINNER_R1_1'],
    team2: ['WINNER_R1_2'],
    stage: 'ELIMINATION',
    completed: false
  };
  
  // Testar busca de placeholders
  const expectedPlaceholders = [
    `WINNER_R${mockCompletedMatch.round}_${mockCompletedMatch.position}`,
    `Vencedor R${mockCompletedMatch.round}_${mockCompletedMatch.position}`,
    `WINNER_R${mockCompletedMatch.round}-${mockCompletedMatch.position}`,
    `Vencedor R${mockCompletedMatch.round}-${mockCompletedMatch.position}`
  ];
  
  console.log('🔍 [SIMULAÇÃO] Placeholders esperados:', expectedPlaceholders);
  
  // Testar se o placeholder seria encontrado
  const team1String = Array.isArray(mockDependentMatch.team1) ? mockDependentMatch.team1.join(' ') : '';
  const team2String = Array.isArray(mockDependentMatch.team2) ? mockDependentMatch.team2.join(' ') : '';
  
  console.log('🔍 [SIMULAÇÃO] Strings dos times:', { team1String, team2String });
  
  const hasPlaceholder = expectedPlaceholders.some(placeholder => 
    team1String.includes(placeholder) || team2String.includes(placeholder)
  );
  
  console.log('🎯 [SIMULAÇÃO] Placeholder seria encontrado?', hasPlaceholder);
  
  return { mockCompletedMatch, mockDependentMatch, expectedPlaceholders, hasPlaceholder };
};

// Função para interceptar chamadas de salvamento
window.interceptSaveResults = () => {
  console.log('🕵️ [INTERCEPTAÇÃO] Preparando interceptação de salvamento...');
  
  // Interceptar fetch calls
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('match')) {
      console.log('🌐 [INTERCEPTAÇÃO] Fetch para match detectado:', args);
    }
    return originalFetch.apply(this, args);
  };
  
  // Interceptar console.log para capturar logs de avanço
  const originalLog = console.log;
  console.log = function(...args) {
    const message = args.join(' ');
    if (message.includes('[AUTO ADVANCE]') || message.includes('[FIND DEPENDENT]')) {
      console.warn('🎯 [INTERCEPTAÇÃO] Log de avanço capturado:', args);
    }
    return originalLog.apply(this, args);
  };
  
  console.log('✅ [INTERCEPTAÇÃO] Interceptação ativada!');
};

// Função para verificar se existem dados no localStorage/sessionStorage
window.checkStorageData = () => {
  console.log('💾 [STORAGE] Verificando dados armazenados...');
  
  // LocalStorage
  console.log('📁 LocalStorage keys:', Object.keys(localStorage));
  Object.keys(localStorage).forEach(key => {
    if (key.includes('tournament') || key.includes('match')) {
      console.log(`   ${key}:`, localStorage.getItem(key));
    }
  });
  
  // SessionStorage
  console.log('📁 SessionStorage keys:', Object.keys(sessionStorage));
  Object.keys(sessionStorage).forEach(key => {
    if (key.includes('tournament') || key.includes('match')) {
      console.log(`   ${key}:`, sessionStorage.getItem(key));
    }
  });
};

// Executar todas as verificações
setTimeout(() => {
  console.log('🚀 [DEBUG] Executando verificações automáticas...');
  
  window.inspectTournamentState();
  window.simulateAdvancement();
  window.checkStorageData();
  
  console.log('📝 [DEBUG] Comandos disponíveis:');
  console.log('   - inspectTournamentState() - Inspeciona estado atual');
  console.log('   - simulateAdvancement() - Testa lógica de avanço');
  console.log('   - interceptSaveResults() - Intercepta salvamentos');
  console.log('   - checkStorageData() - Verifica dados armazenados');
  
}, 1000);

console.log('🎯 [DEBUG ESPECÍFICO] Script carregado! Aguardando execução...');
