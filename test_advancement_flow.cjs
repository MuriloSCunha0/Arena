/**
 * TESTE COMPLETO: Validação do Avanço Automático
 * 
 * Este script testa o fluxo completo de avanço automático
 */

console.log('🧪 [TESTE] Iniciando teste completo do avanço automático...');

// Simular dados de teste
const testData = {
  // Partida das Oitavas (R1) concluída
  completedMatch: {
    id: 'match_elim_1_1',
    round: 1,
    position: 1,
    stage: 'ELIMINATION',
    team1: ['vitor_lopes', 'karina_almeida'],
    team2: ['felipe_rocha', 'joao_pedro'],
    score1: 6,
    score2: 0,
    winnerId: 'team1',
    completed: true
  },
  
  // Partida das Quartas (R2) com placeholder
  dependentMatch: {
    id: 'match_elim_2_1',
    round: 2,
    position: 1,
    stage: 'ELIMINATION',
    team1: ['Vencedor R1_1'],
    team2: ['Vencedor R1_2'],
    score1: null,
    score2: null,
    winnerId: null,
    completed: false
  }
};

// Função para testar busca de placeholders
function testPlaceholderDetection() {
  console.log('🔍 [TESTE] Testando detecção de placeholders...');
  
  const completedMatch = testData.completedMatch;
  
  // Placeholders esperados
  const expectedPlaceholders = [
    `WINNER_R${completedMatch.round}_${completedMatch.position}`,
    `Vencedor R${completedMatch.round}_${completedMatch.position}`,
    `WINNER_R${completedMatch.round}-${completedMatch.position}`,
    `Vencedor R${completedMatch.round}-${completedMatch.position}`
  ];
  
  console.log('📋 Placeholders esperados:', expectedPlaceholders);
  // Resultado: ['WINNER_R1_1', 'Vencedor R1_1', 'WINNER_R1-1', 'Vencedor R1-1']
  
  // Testar se o placeholder seria encontrado
  const dependentMatch = testData.dependentMatch;
  const team1String = Array.isArray(dependentMatch.team1) ? dependentMatch.team1.join(' ') : '';
  const team2String = Array.isArray(dependentMatch.team2) ? dependentMatch.team2.join(' ') : '';
  
  console.log('🎯 Times atuais da partida dependente:', {
    team1String,
    team2String
  });
  
  const hasPlaceholder = expectedPlaceholders.some(placeholder => 
    team1String.includes(placeholder) || team2String.includes(placeholder)
  );
  
  console.log('✅ Placeholder seria encontrado?', hasPlaceholder);
  
  // ⚠️ PROBLEMA IDENTIFICADO: O placeholder "Vencedor R1_1" não bate com "WINNER_R1_1"
  // Precisamos garantir que ambos os formatos sejam detectados
  
  return { expectedPlaceholders, hasPlaceholder, team1String, team2String };
}

// Função para testar substituição
function testPlaceholderReplacement() {
  console.log('🔄 [TESTE] Testando substituição de placeholders...');
  
  const completedMatch = testData.completedMatch;
  const dependentMatch = testData.dependentMatch;
  const winnerTeam = completedMatch.team1; // Vencedor
  
  // Simular a lógica de substituição
  const expectedPlaceholders = [
    `WINNER_R${completedMatch.round}_${completedMatch.position}`,
    `Vencedor R${completedMatch.round}_${completedMatch.position}`,
    `WINNER_R${completedMatch.round}-${completedMatch.position}`,
    `Vencedor R${completedMatch.round}-${completedMatch.position}`
  ];
  
  let updatedTeam1 = dependentMatch.team1;
  let updatedTeam2 = dependentMatch.team2;
  let hasChanges = false;
  
  // Verificar team1
  if (Array.isArray(dependentMatch.team1)) {
    const team1String = dependentMatch.team1.join(' ');
    const hasPlaceholder = expectedPlaceholders.some(placeholder => 
      team1String.includes(placeholder)
    );
    
    if (hasPlaceholder) {
      updatedTeam1 = winnerTeam;
      hasChanges = true;
      console.log('🔄 Team1 seria substituído:', {
        de: dependentMatch.team1,
        para: winnerTeam
      });
    }
  }
  
  // Verificar team2
  if (Array.isArray(dependentMatch.team2)) {
    const team2String = dependentMatch.team2.join(' ');
    const hasPlaceholder = expectedPlaceholders.some(placeholder => 
      team2String.includes(placeholder)
    );
    
    if (hasPlaceholder) {
      updatedTeam2 = winnerTeam;
      hasChanges = true;
      console.log('🔄 Team2 seria substituído:', {
        de: dependentMatch.team2,
        para: winnerTeam
      });
    }
  }
  
  console.log('📊 Resultado da substituição:', {
    hasChanges,
    team1: { antes: dependentMatch.team1, depois: updatedTeam1 },
    team2: { antes: dependentMatch.team2, depois: updatedTeam2 }
  });
  
  return { hasChanges, updatedTeam1, updatedTeam2 };
}

// Função para testar fluxo completo
function testCompleteFlow() {
  console.log('🚀 [TESTE] Testando fluxo completo...');
  
  // 1. Detectar placeholders
  const detection = testPlaceholderDetection();
  
  // 2. Testar substituição
  const replacement = testPlaceholderReplacement();
  
  // 3. Verificar resultado final
  const success = detection.hasPlaceholder && replacement.hasChanges;
  
  console.log('🎊 RESULTADO FINAL:', {
    placeholderDetectado: detection.hasPlaceholder,
    substituicaoFeita: replacement.hasChanges,
    sucessoCompleto: success
  });
  
  if (!success) {
    console.error('❌ FALHA NO TESTE! Investigar problemas...');
    
    if (!detection.hasPlaceholder) {
      console.error('  - Placeholder não foi detectado');
      console.error('  - Verificar formatos:', detection.expectedPlaceholders);
      console.error('  - Times atuais:', { 
        team1: detection.team1String, 
        team2: detection.team2String 
      });
    }
    
    if (!replacement.hasChanges) {
      console.error('  - Substituição não foi realizada');
    }
  } else {
    console.log('✅ TESTE PASSOU! Avanço automático deve funcionar.');
  }
  
  return success;
}

// Executar todos os testes
setTimeout(() => {
  console.log('🎯 [TESTE] Executando testes...\n');
  
  testCompleteFlow();
  
  console.log('\n📝 [TESTE] Comandos disponíveis:');
  console.log('   - testPlaceholderDetection() - Testa detecção');
  console.log('   - testPlaceholderReplacement() - Testa substituição');
  console.log('   - testCompleteFlow() - Testa fluxo completo');
  
}, 500);

console.log('🎯 [TESTE] Script carregado! Aguardando execução...');
