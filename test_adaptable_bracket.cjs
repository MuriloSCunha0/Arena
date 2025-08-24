/**
 * TESTE: Nova lógica adaptável de bracket
 * Testa para 6, 8, 16, 32 duplas
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

// Nova função adaptável
function generateBracketWithByes(sortedTeams, byesNeeded) {
  const matches = [];
  const totalTeams = sortedTeams.length;
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const totalRounds = Math.ceil(Math.log2(bracketSize));
  
  console.log(`🏆 [ADAPTÁVEL] Gerando bracket para ${totalTeams} duplas`);
  console.log(`📊 [ADAPTÁVEL] Bracket size: ${bracketSize}, BYEs: ${byesNeeded}, Rounds: ${totalRounds}`);
  
  // 1. DISTRIBUIR BYES INTELIGENTEMENTE
  const teamsWithByes = sortedTeams.slice(0, byesNeeded);
  const teamsWithoutByes = sortedTeams.slice(byesNeeded);
  
  console.log(`🏆 [BYE] ${teamsWithByes.length} duplas recebem BYE:`);
  teamsWithByes.forEach((team, index) => {
    console.log(`   ${index + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')}`);
  });
  
  console.log(`⚔️ [PRIMEIRA RODADA] ${teamsWithoutByes.length} duplas jogam na primeira rodada:`);
  teamsWithoutByes.forEach((team, index) => {
    console.log(`   ${index + 1}. ${team.rank}º lugar - ${team.teamId.join(' & ')}`);
  });
  
  // 2. GERAR TODAS AS RODADAS DINAMICAMENTE
  let currentRoundTeams = [...teamsWithoutByes]; // Times que jogam na primeira rodada
  let currentPosition = 1;
  
  for (let round = 1; round <= totalRounds; round++) {
    const isFirstRound = round === 1;
    
    // Calcular quantas partidas nesta rodada
    let matchesInRound;
    let teamsInThisRound;
    
    if (isFirstRound) {
      // Primeira rodada: duplas sem BYE
      matchesInRound = Math.floor(currentRoundTeams.length / 2);
      teamsInThisRound = currentRoundTeams.length;
    } else {
      // Rodadas subsequentes: vencedores da rodada anterior + BYEs (se aplicável)
      const winnersFromPreviousRound = Math.floor((teamsInThisRound || 0) / 2);
      
      // Na segunda rodada, adicionar teams com BYE
      if (round === 2 && byesNeeded > 0) {
        teamsInThisRound = winnersFromPreviousRound + byesNeeded;
        matchesInRound = Math.floor(teamsInThisRound / 2);
        console.log(`🔄 [ROUND ${round}] ${winnersFromPreviousRound} vencedores + ${byesNeeded} BYEs = ${teamsInThisRound} times`);
      } else {
        teamsInThisRound = winnersFromPreviousRound;
        matchesInRound = Math.floor(teamsInThisRound / 2);
        
        if (matchesInRound === 0 && teamsInThisRound <= 1) {
          // Situação especial: apenas 1 time restante ou menos
          console.log(`⚠️ [ROUND ${round}] Apenas ${teamsInThisRound} time(s) restante(s), parando`);
          break;
        }
      }
    }
    
    if (matchesInRound <= 0) {
      console.log(`⚠️ [ROUND ${round}] Nenhuma partida necessária, parando`);
      break;
    }
    
    const roundName = getRoundNameForGeneration(round, totalRounds);
    console.log(`🎯 [ROUND ${round}] Criando ${matchesInRound} partida(s) - ${roundName}:`);
    
    // Criar partidas da rodada
    for (let matchIdx = 0; matchIdx < matchesInRound; matchIdx++) {
      let team1 = null;
      let team2 = null;
      let completed = false;
      let winnerId = null;
      let score1 = null;
      let score2 = null;
      
      if (isFirstRound) {
        // Primeira rodada: usar duplas reais
        const team1Index = matchIdx * 2;
        const team2Index = matchIdx * 2 + 1;
        
        if (team1Index < currentRoundTeams.length) {
          team1 = currentRoundTeams[team1Index].teamId;
        }
        if (team2Index < currentRoundTeams.length) {
          team2 = currentRoundTeams[team2Index].teamId;
        }
        
        // Verificar BYE na primeira rodada (time ímpar)
        if (team1 && !team2) {
          completed = true;
          winnerId = 'team1';
          score1 = 1;
          score2 = 0;
          console.log(`     Partida ${matchIdx + 1}: ${team1.join(' & ')} (BYE automático)`);
        } else if (team1 && team2) {
          console.log(`     Partida ${matchIdx + 1}: ${team1.join(' & ')} vs ${team2.join(' & ')}`);
        }
      } else if (round === 2 && byesNeeded > 0) {
        // Segunda rodada: vencedores da primeira + BYEs
        const byeMatchesInThisRound = Math.floor(byesNeeded / 2);
        
        if (matchIdx < byeMatchesInThisRound) {
          // Partidas entre times com BYE
          const bye1Index = matchIdx * 2;
          const bye2Index = matchIdx * 2 + 1;
          
          if (bye1Index < teamsWithByes.length) {
            team1 = teamsWithByes[bye1Index].teamId;
          }
          if (bye2Index < teamsWithByes.length) {
            team2 = teamsWithByes[bye2Index].teamId;
          }
          
          if (team1 && team2) {
            console.log(`     Partida ${matchIdx + 1}: ${team1.join(' & ')} (BYE) vs ${team2.join(' & ')} (BYE)`);
          } else if (team1 && !team2) {
            completed = true;
            winnerId = 'team1';
            score1 = 1;
            score2 = 0;
            console.log(`     Partida ${matchIdx + 1}: ${team1.join(' & ')} (BYE único)`);
          }
        } else {
          // Partidas entre vencedores da primeira rodada ou mistos
          const relativeIndex = matchIdx - byeMatchesInThisRound;
          const remainingByes = byesNeeded % 2; // BYEs ímpares sobram
          
          if (remainingByes > 0 && relativeIndex === 0) {
            // Primeiro match misto: BYE restante vs vencedor
            team1 = teamsWithByes[byeMatchesInThisRound * 2].teamId;
            team2 = [`WINNER_R1_${1}`];
            console.log(`     Partida ${matchIdx + 1}: ${team1.join(' & ')} (BYE) vs Vencedor R1-1`);
          } else {
            // Matches entre vencedores
            const winnerBaseIndex = remainingByes > 0 ? 2 + (relativeIndex - 1) * 2 : 1 + relativeIndex * 2;
            team1 = [`WINNER_R1_${winnerBaseIndex}`];
            team2 = [`WINNER_R1_${winnerBaseIndex + 1}`];
            console.log(`     Partida ${matchIdx + 1}: Vencedor R1-${winnerBaseIndex} vs Vencedor R1-${winnerBaseIndex + 1}`);
          }
        }
      } else {
        // Rodadas subsequentes: usar placeholders
        team1 = [`WINNER_R${round-1}_${matchIdx * 2 + 1}`];
        team2 = [`WINNER_R${round-1}_${matchIdx * 2 + 2}`];
        console.log(`     Partida ${matchIdx + 1}: Vencedor R${round-1}-${matchIdx * 2 + 1} vs Vencedor R${round-1}-${matchIdx * 2 + 2}`);
      }
      
      const match = createMatch(team1, team2, round, currentPosition++);
      match.stage = 'ELIMINATION';
      match.completed = completed;
      match.winnerId = winnerId;
      match.score1 = score1;
      match.score2 = score2;
      
      matches.push(match);
    }
  }
  
  console.log(`🏆 [ADAPTÁVEL] Bracket finalizado: ${matches.length} partidas em ${totalRounds} rodadas`);
  
  // Log resumo por rodada
  const matchesByRound = matches.reduce((acc, match) => {
    acc[match.round] = (acc[match.round] || 0) + 1;
    return acc;
  }, {});
  
  console.log(`📊 [RESUMO] Partidas por rodada:`, matchesByRound);
  
  return { matches };
}

// Função para simular duplas
function createMockTeams(count) {
  const teams = [];
  for (let i = 1; i <= count; i++) {
    teams.push({
      rank: i,
      teamId: [`Jogador${i}A`, `Jogador${i}B`],
      groupNumber: Math.ceil(i / 3)
    });
  }
  return teams;
}

// TESTES PRINCIPAIS
console.log('='.repeat(80));
console.log('TESTE 1: 6 DUPLAS (Beach Tennis clássico)');
console.log('='.repeat(80));

const teams6 = createMockTeams(6);
const bracketSize6 = Math.pow(2, Math.ceil(Math.log2(6))); // 8
const byesNeeded6 = bracketSize6 - 6; // 2
const result6 = generateBracketWithByes(teams6, byesNeeded6);

console.log('\n' + '='.repeat(80));
console.log('TESTE 2: 16 DUPLAS (Torneio médio)');
console.log('='.repeat(80));

const teams16 = createMockTeams(16);
const bracketSize16 = Math.pow(2, Math.ceil(Math.log2(16))); // 16
const byesNeeded16 = bracketSize16 - 16; // 0
const result16 = generateBracketWithByes(teams16, byesNeeded16);

console.log('\n' + '='.repeat(80));
console.log('TESTE 3: 32 DUPLAS (Torneio grande)');
console.log('='.repeat(80));

const teams32 = createMockTeams(32);
const bracketSize32 = Math.pow(2, Math.ceil(Math.log2(32))); // 32
const byesNeeded32 = bracketSize32 - 32; // 0
const result32 = generateBracketWithByes(teams32, byesNeeded32);

console.log('\n' + '='.repeat(80));
console.log('TESTE 4: 10 DUPLAS (Caso irregular)');
console.log('='.repeat(80));

const teams10 = createMockTeams(10);
const bracketSize10 = Math.pow(2, Math.ceil(Math.log2(10))); // 16
const byesNeeded10 = bracketSize10 - 10; // 6
const result10 = generateBracketWithByes(teams10, byesNeeded10);

console.log('\n' + '🎯 RESUMO FINAL:');
console.log(`6 duplas: ${result6.matches.length} partidas`);
console.log(`16 duplas: ${result16.matches.length} partidas`);
console.log(`32 duplas: ${result32.matches.length} partidas`);
console.log(`10 duplas: ${result10.matches.length} partidas`);
