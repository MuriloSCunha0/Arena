// Teste das funcionalidades avançadas do Beach Tennis
// Arquivo: test_beach_tennis_advanced_features.js

import { 
  generateEliminationPairings, 
  generateEliminationBracketWithByes, 
  hasBye,
  getByeAdvancingTeam 
} from '../src/utils/rankingUtils.js';

// Mock data para teste
const mockQualifiedTeams = [
  {
    teamId: ['player1', 'player2'],
    rank: 1,
    groupNumber: 1,
    stats: { wins: 3, gameDifference: 8, gamesWon: 20, matchesPlayed: 4 }
  },
  {
    teamId: ['player3', 'player4'],
    rank: 2,
    groupNumber: 2,
    stats: { wins: 3, gameDifference: 6, gamesWon: 18, matchesPlayed: 4 }
  },
  {
    teamId: ['player5', 'player6'],
    rank: 3,
    groupNumber: 1,
    stats: { wins: 2, gameDifference: 4, gamesWon: 16, matchesPlayed: 4 }
  },
  {
    teamId: ['player7', 'player8'],
    rank: 4,
    groupNumber: 2,
    stats: { wins: 2, gameDifference: 2, gamesWon: 14, matchesPlayed: 4 }
  },
  {
    teamId: ['player9', 'player10'],
    rank: 5,
    groupNumber: 3,
    stats: { wins: 1, gameDifference: -2, gamesWon: 12, matchesPlayed: 4 }
  }
];

console.log('🎾 Testando funcionalidades avançadas do Beach Tennis');
console.log('=====================================');

// Teste 1: Afunilamento por ranking
console.log('\n1. Teste do afunilamento por ranking:');
const pairings = generateEliminationPairings(mockQualifiedTeams);
console.log('Confrontos gerados:', pairings.map(match => ({
  team1: match.team1,
  team2: match.team2,
  stage: match.stage
})));

// Teste 2: Geração de bracket com BYE
console.log('\n2. Teste de bracket com BYE automático:');
const bracketWithByes = generateEliminationBracketWithByes(mockQualifiedTeams);
console.log('Partidas com BYE:', bracketWithByes.filter(match => hasBye(match)));
console.log('Partidas normais:', bracketWithByes.filter(match => !hasBye(match)));

// Teste 3: Verificação de partidas BYE
console.log('\n3. Teste de verificação BYE:');
bracketWithByes.forEach((match, index) => {
  const isBye = hasBye(match);
  const advancingTeam = getByeAdvancingTeam(match);
  console.log(`Partida ${index + 1}: BYE=${isBye}, Avança=${advancingTeam ? advancingTeam.join(' & ') : 'N/A'}`);
});

console.log('\n✅ Testes concluídos com sucesso!');

export default {
  testEliminationPairings: () => generateEliminationPairings(mockQualifiedTeams),
  testBracketWithByes: () => generateEliminationBracketWithByes(mockQualifiedTeams),
  testByeDetection: (match) => hasBye(match),
  testAdvancingTeam: (match) => getByeAdvancingTeam(match)
};
