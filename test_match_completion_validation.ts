import { transformMatch } from './src/services/supabase/tournament';

// Teste da lógica de validação de scores
function testMatchCompletion() {
  console.log('🧪 Testando lógica de validação de scores na função transformMatch...\n');

  const testCases = [
    {
      name: 'Scores válidos diferentes (2-1)',
      data: { id: 'test1', score1: 2, score2: 1, completed: true },
      expectedCompleted: true
    },
    {
      name: 'Scores válidos diferentes (1-2)', 
      data: { id: 'test2', score1: 1, score2: 2, completed: true },
      expectedCompleted: true
    },
    {
      name: 'Scores iguais (empate 2-2)',
      data: { id: 'test3', score1: 2, score2: 2, completed: true },
      expectedCompleted: false
    },
    {
      name: 'Scores 0x0',
      data: { id: 'test4', score1: 0, score2: 0, completed: true },
      expectedCompleted: false
    },
    {
      name: 'Score1 válido, score2 zero (1-0)',
      data: { id: 'test5', score1: 1, score2: 0, completed: true },
      expectedCompleted: true
    },
    {
      name: 'Score null/undefined',
      data: { id: 'test6', score1: null, score2: undefined, completed: true },
      expectedCompleted: false
    },
    {
      name: 'Apenas um score definido',
      data: { id: 'test7', score1: 2, score2: null, completed: true },
      expectedCompleted: false
    }
  ];

  testCases.forEach(testCase => {
    try {
      const match = transformMatch(testCase.data);
      const result = match.completed === testCase.expectedCompleted ? '✅ PASS' : '❌ FAIL';
      
      console.log(`${result} ${testCase.name}`);
      console.log(`   Input: score1=${testCase.data.score1}, score2=${testCase.data.score2}, completed=${testCase.data.completed}`);
      console.log(`   Output: completed=${match.completed}, winnerId=${match.winnerId}`);
      console.log(`   Expected: completed=${testCase.expectedCompleted}`);
      
      if (match.completed !== testCase.expectedCompleted) {
        console.log(`   🔍 PROBLEMA IDENTIFICADO: A lógica de validação não está funcionando como esperado!`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ERROR ${testCase.name}: ${error}`);
      console.log('');
    }
  });
}

// Demonstração do problema
function demonstrateProblem() {
  console.log('🔍 DEMONSTRAÇÃO DO PROBLEMA:\n');
  
  console.log('1. updateMatchResults salva uma partida com scores 2-2 como completed: true');
  console.log('2. Mas quando carregada do banco, transformMatch aplicará as regras:');
  
  const problematicMatch = transformMatch({
    id: 'problema-empate',
    score1: 2,
    score2: 2,
    completed: true,
    team1: ['Time A'],
    team2: ['Time B']
  });
  
  console.log('   Resultado:', {
    completed: problematicMatch.completed,
    winnerId: problematicMatch.winnerId
  });
  
  console.log('\n✅ SOLUÇÃO: updateMatchResults agora aplica as mesmas regras antes de salvar!');
}

// Executar testes
testMatchCompletion();
demonstrateProblem();
