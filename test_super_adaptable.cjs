/**
 * 🏆 TESTE SUPER ADAPTÁVEL: 4 a 1000+ participantes
 * ✨ Valida lógica universal para qualquer número de duplas
 */

// Simular função getRoundNameForGeneration
function getRoundNameForGeneration(round, totalRounds) {
  const roundFromEnd = totalRounds - round;
  
  switch (roundFromEnd) {
    case 0: return 'Final';
    case 1: return 'Semifinal';
    case 2: return 'Quartas de Final';
    case 3: return 'Oitavas de Final';
    case 4: return 'Dezesseisavos de Final';
    case 5: return 'Trinta e dois avos de Final';
    case 6: return 'Sessenta e quatro avos de Final';
    case 7: return 'Cento e vinte e oito avos de Final';
    case 8: return 'Duzentos e cinquenta e seis avos de Final';
    case 9: return 'Quinhentos e doze avos de Final';
    default:
      const participants = Math.pow(2, roundFromEnd + 1);
      return `${participants}ª de Final`;
  }
}

// Simular criação de match
function createMatch(team1, team2, round, position) {
  return {
    id: `match_${round}_${position}`,
    team1,
    team2,
    round,
    position,
    stage: 'ELIMINATION',
    completed: false,
    winnerId: null,
    score1: null,
    score2: null
  };
}

// 🔥 SUPER ADAPTÁVEL: Função universal
function generateBracketWithByes(sortedTeams, byesNeeded) {
  const matches = [];
  const totalTeams = sortedTeams.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const totalRounds = Math.ceil(Math.log2(bracketSize));
  
  console.log(`🏆 [SUPER ADAPTÁVEL] Gerando bracket para ${totalTeams} duplas`);
  console.log(`📊 [UNIVERSAL] Bracket size: ${bracketSize}, BYEs: ${byesNeeded}, Total rounds: ${totalRounds}`);
  
  // 1. DISTRIBUIR BYES INTELIGENTEMENTE (melhores duplas recebem BYE)
  const teamsWithByes = sortedTeams.slice(0, byesNeeded);
  const teamsWithoutByes = sortedTeams.slice(byesNeeded);
  
  if (teamsWithByes.length > 0) {
    console.log(`🏆 [BYE] ${teamsWithByes.length} duplas recebem BYE:`);
    teamsWithByes.forEach((team, index) => {
      console.log(`   ${index + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')}`);
    });
  }
  
  console.log(`⚔️ [PRIMEIRA RODADA] ${teamsWithoutByes.length} duplas jogam na primeira rodada:`);
  
  // 2. ALGORITMO UNIVERSAL: Gerar todas as rodadas dinamicamente
  let currentRoundParticipants = teamsWithoutByes.length; // Times que jogam na primeira rodada
  let position = 1;
  
  for (let round = 1; round <= totalRounds; round++) {
    const isFirstRound = round === 1;
    const isSecondRound = round === 2;
    
    // Calcular participantes nesta rodada
    let participantsInThisRound;
    if (isFirstRound) {
      participantsInThisRound = currentRoundParticipants; // Times sem BYE
    } else if (isSecondRound && byesNeeded > 0) {
      // Segunda rodada: vencedores da primeira + times com BYE
      const winnersFromFirstRound = Math.floor(currentRoundParticipants / 2);
      participantsInThisRound = winnersFromFirstRound + byesNeeded;
      console.log(`🔄 [ROUND ${round}] ${winnersFromFirstRound} vencedores R1 + ${byesNeeded} BYEs = ${participantsInThisRound} participantes`);
    } else {
      // Rodadas subsequentes: vencedores da rodada anterior
      participantsInThisRound = Math.floor(currentRoundParticipants / 2);
    }
    
    // Calcular partidas nesta rodada
    const matchesInThisRound = Math.floor(participantsInThisRound / 2);
    
    // Verificar se ainda há partidas para gerar
    if (matchesInThisRound <= 0) {
      console.log(`✅ [ROUND ${round}] Bracket completo - ${participantsInThisRound} participante(s) restante(s)`);
      break;
    }
    
    const roundName = getRoundNameForGeneration(round, totalRounds);
    console.log(`🎯 [ROUND ${round}] ${roundName}: ${matchesInThisRound} partida(s), ${participantsInThisRound} participantes`);
    
    // Gerar partidas da rodada
    for (let matchIdx = 0; matchIdx < matchesInThisRound; matchIdx++) {
      let team1 = null;
      let team2 = null;
      let completed = false;
      let winnerId = null;
      let score1 = null;
      let score2 = null;
      
      if (isFirstRound) {
        // 🔥 PRIMEIRA RODADA: Usar duplas reais
        const team1Index = matchIdx * 2;
        const team2Index = matchIdx * 2 + 1;
        
        if (team1Index < teamsWithoutByes.length) {
          team1 = teamsWithoutByes[team1Index].teamId;
        }
        if (team2Index < teamsWithoutByes.length) {
          team2 = teamsWithoutByes[team2Index].teamId;
        }
        
        // Verificar BYE automático (times ímpares)
        if (team1 && !team2) {
          completed = true;
          winnerId = 'team1';
          score1 = 1;
          score2 = 0;
          console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} (BYE automático)`);
        } else if (team1 && team2) {
          console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} vs ${team2.join(' & ')}`);
        }
        
      } else if (isSecondRound && byesNeeded > 0) {
        // 🔥 SEGUNDA RODADA: Misturar BYEs com vencedores da primeira
        
        // Determinar se esta partida envolve BYEs ou vencedores
        if (matchIdx * 2 < byesNeeded) {
          // Partida entre times com BYE
          const bye1Index = matchIdx * 2;
          const bye2Index = matchIdx * 2 + 1;
          
          if (bye1Index < teamsWithByes.length) {
            team1 = teamsWithByes[bye1Index].teamId;
          }
          if (bye2Index < teamsWithByes.length) {
            team2 = teamsWithByes[bye2Index].teamId;
          }
          
          if (team1 && team2) {
            console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} (BYE) vs ${team2.join(' & ')} (BYE)`);
          } else if (team1 && !team2) {
            // BYE ímpar: avança automaticamente
            completed = true;
            winnerId = 'team1';
            score1 = 1;
            score2 = 0;
            console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} (BYE único)`);
          }
        } else {
          // Partida entre vencedores da primeira rodada ou mista BYE vs vencedor
          const slotIndex = matchIdx * 2;
          const slot1 = slotIndex - byesNeeded;
          const slot2 = slotIndex + 1 - byesNeeded;
          
          // Misturar BYEs restantes com vencedores
          if (slotIndex < byesNeeded && slotIndex + 1 >= byesNeeded) {
            // Partida mista: último BYE vs primeiro vencedor
            team1 = teamsWithByes[slotIndex].teamId;
            team2 = [`WINNER_R1_1`];
            console.log(`     Match ${matchIdx + 1}: ${team1.join(' & ')} (BYE) vs Vencedor R1-1`);
          } else if (slot1 >= 0 && slot2 >= 0) {
            // Partida entre vencedores
            team1 = [`WINNER_R1_${slot1 + 1}`];
            team2 = [`WINNER_R1_${slot2 + 1}`];
            console.log(`     Match ${matchIdx + 1}: Vencedor R1-${slot1 + 1} vs Vencedor R1-${slot2 + 1}`);
          }
        }
        
      } else {
        // 🔥 RODADAS SUBSEQUENTES: Usar placeholders dos vencedores
        team1 = [`WINNER_R${round-1}_${matchIdx * 2 + 1}`];
        team2 = [`WINNER_R${round-1}_${matchIdx * 2 + 2}`];
        console.log(`     Match ${matchIdx + 1}: Vencedor R${round-1}-${matchIdx * 2 + 1} vs Vencedor R${round-1}-${matchIdx * 2 + 2}`);
      }
      
      // Criar partida
      const match = createMatch(team1, team2, round, position++);
      match.stage = 'ELIMINATION';
      match.completed = completed;
      match.winnerId = winnerId;
      match.score1 = score1;
      match.score2 = score2;
      
      matches.push(match);
    }
    
    // Atualizar participantes para próxima rodada
    currentRoundParticipants = participantsInThisRound;
  }
  
  console.log(`🏆 [SUPER ADAPTÁVEL] Bracket finalizado: ${matches.length} partidas em ${totalRounds} rodadas`);
  
  // Resumo detalhado por rodada
  const matchesByRound = matches.reduce((acc, match) => {
    acc[match.round] = (acc[match.round] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`📊 [RESUMO FINAL] Partidas por rodada:`, matchesByRound);
  
  // Validação final
  const expectedTotalMatches = totalTeams - 1; // N teams require N-1 matches to eliminate all but one
  console.log(`✅ [VALIDAÇÃO] Total partidas: ${matches.length}, Esperado: ${expectedTotalMatches}`);
  
  return { matches };
}

// Função para simular duplas
function createMockTeams(count) {
  const teams = [];
  for (let i = 1; i <= count; i++) {
    teams.push({
      rank: i,
      teamId: [`J${i}A`, `J${i}B`],
      groupNumber: Math.ceil(i / 3)
    });
  }
  return teams;
}

// 🔥 TESTES UNIVERSAIS
const testCases = [
  { teams: 4, name: 'MINI TORNEIO' },
  { teams: 6, name: 'BEACH TENNIS CLÁSSICO' },
  { teams: 8, name: 'TORNEIO PERFEITO' },
  { teams: 10, name: 'IRREGULAR PEQUENO' },
  { teams: 16, name: 'TORNEIO MÉDIO' },
  { teams: 20, name: 'IRREGULAR MÉDIO' },
  { teams: 32, name: 'TORNEIO GRANDE' },
  { teams: 50, name: 'IRREGULAR GRANDE' },
  { teams: 64, name: 'TORNEIO CLÁSSICO' },
  { teams: 100, name: 'MEGA TORNEIO' },
  { teams: 128, name: 'TORNEIO ÉPICO' },
  { teams: 256, name: 'TORNEIO LENDÁRIO' },
  { teams: 512, name: 'TORNEIO COLOSSAL' },
  { teams: 1000, name: 'SUPER MEGA TORNEIO' }
];

console.log('🏆'.repeat(80));
console.log('TESTE UNIVERSAL: ADAPTABILIDADE COMPLETA (4 a 1000+ participantes)');
console.log('🏆'.repeat(80));

const results = [];

testCases.forEach(({ teams, name }) => {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🎯 ${name}: ${teams} DUPLAS`);
  console.log(`${'='.repeat(80)}`);
  
  const mockTeams = createMockTeams(teams);
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(teams)));
  const byesNeeded = bracketSize - teams;
  
  const result = generateBracketWithByes(mockTeams, byesNeeded);
  
  results.push({
    teams,
    name,
    matches: result.matches.length,
    expected: teams - 1,
    valid: result.matches.length === teams - 1
  });
});

console.log(`\n${'🎯'.repeat(80)}`);
console.log('RESUMO FINAL: VALIDAÇÃO UNIVERSAL');
console.log(`${'🎯'.repeat(80)}`);

results.forEach(({ teams, name, matches, expected, valid }) => {
  const status = valid ? '✅' : '❌';
  console.log(`${status} ${name}: ${teams} duplas → ${matches} partidas (esperado: ${expected})`);
});

const allValid = results.every(r => r.valid);
console.log(`\n🏆 RESULTADO FINAL: ${allValid ? 'TODOS OS TESTES PASSARAM! 🎉' : 'ALGUNS TESTES FALHARAM! ⚠️'}`);

if (allValid) {
  console.log('\n✨ PARABÉNS! A lógica é 100% ADAPTÁVEL para qualquer número de participantes!');
  console.log('🚀 De 4 a 1000+ duplas: FUNCIONANDO PERFEITAMENTE!');
} else {
  console.log('\n⚠️ Ainda há problemas na adaptabilidade. Verifique os casos que falharam.');
}
