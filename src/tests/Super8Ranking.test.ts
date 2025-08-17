import { calculateSuper8IndividualRanking, generateSuper8Matches } from '../../utils/rankingUtils';

describe('Super 8 Ranking', () => {
  it('should calculate individual ranking correctly for Super 8 matches', () => {
    // Simula 4 participantes (A, B, C, D)
    const participants = ['A', 'B', 'C', 'D'];
    const matches = generateSuper8Matches(participants);
    // Simula resultados: cada dupla joga uma vez, cada partida tem placar diferente
    // Exemplo: A+B vs C+D (6x4), A+C vs B+D (3x6), A+D vs B+C (7x5)
    matches[0].team1 = ['A', 'B']; matches[0].team2 = ['C', 'D']; matches[0].score1 = 6; matches[0].score2 = 4; matches[0].completed = true;
    matches[1].team1 = ['A', 'C']; matches[1].team2 = ['B', 'D']; matches[1].score1 = 3; matches[1].score2 = 6; matches[1].completed = true;
    matches[2].team1 = ['A', 'D']; matches[2].team2 = ['B', 'C']; matches[2].score1 = 7; matches[2].score2 = 5; matches[2].completed = true;
    const ranking = calculateSuper8IndividualRanking(matches);
    // Esperado: cada jogador tem vitórias, derrotas, saldo, etc
    expect(ranking).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: 'A', wins: 2, losses: 1 }),
        expect.objectContaining({ playerId: 'B', wins: 1, losses: 2 }),
        expect.objectContaining({ playerId: 'C', wins: 0, losses: 3 }),
        expect.objectContaining({ playerId: 'D', wins: 2, losses: 1 })
      ])
    );
  });
});
