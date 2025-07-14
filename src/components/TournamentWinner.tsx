import React from 'react';
import { Crown, Trophy, Star, X, Sparkles } from 'lucide-react';
import { OverallRanking, Match } from '../types';

interface TournamentWinnerProps {
  winner: OverallRanking;
  finalMatch: Match | null;
  playerNameMap?: Record<string, string>;
  onClose: () => void;
}

const TournamentWinner: React.FC<TournamentWinnerProps> = ({
  winner,
  finalMatch,
  playerNameMap = {},
  onClose
}) => {
  const getPlayerDisplayName = (playerId: string) => {
    return playerNameMap[playerId] || `Player ${playerId}`;
  };

  const getPlayerInitials = (playerId: string) => {
    const name = getPlayerDisplayName(playerId);
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getTeamDisplayName = (teamId: string[]) => {
    return teamId
      .map(id => getPlayerDisplayName(id))
      .join(' / ');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header Celebração */}
        <div className="relative bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 text-white p-8 rounded-t-2xl overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-4 left-4 animate-pulse">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="absolute top-8 right-8 animate-pulse delay-300">
              <Star className="w-8 h-8" />
            </div>
            <div className="absolute bottom-4 left-1/4 animate-pulse delay-700">
              <Trophy className="w-6 h-6" />
            </div>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="relative text-center">
            <Crown className="w-16 h-16 mx-auto animate-bounce text-yellow-200 mb-4" />
            <h1 className="text-4xl font-bold mb-2 animate-pulse">
              🏆 CAMPEÃO! 🏆
            </h1>
            <p className="text-yellow-100 text-lg">
              Parabéns pelo excelente desempenho!
            </p>
          </div>
        </div>

        {/* Detalhes do Vencedor */}
        <div className="p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {getTeamDisplayName(winner.teamId)}
            </h2>
            <div className="text-lg text-gray-600">
              Grupo {winner.groupNumber} • Classificação Geral: {winner.rank}º
            </div>
          </div>

          {/* Cards dos Jogadores */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {winner.teamId.map((playerId, index) => (
              <div
                key={playerId}
                className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border-2 border-yellow-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
                    {getPlayerInitials(playerId)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800">
                      {getPlayerDisplayName(playerId)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Jogador {index + 1}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Estatísticas */}
          <div className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-semibold text-gray-800 mb-4">Estatísticas do Torneio</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{winner.stats.wins}</div>
                <div className="text-sm text-gray-600">Vitórias</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${winner.stats.gameDifference > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {winner.stats.gameDifference > 0 ? '+' : ''}{winner.stats.gameDifference}
                </div>
                <div className="text-sm text-gray-600">Saldo de Games</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{winner.stats.gamesWon}</div>
                <div className="text-sm text-gray-600">Games Ganhos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{winner.stats.matchesPlayed}</div>
                <div className="text-sm text-gray-600">Jogos Disputados</div>
              </div>
            </div>
          </div>

          {/* Resultado da Final */}
          {finalMatch && (
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-800 mb-4">Resultado da Final</h3>
              <div className="text-center">
                <div className="text-lg font-medium text-gray-800">
                  {finalMatch.score1} × {finalMatch.score2}
                </div>
                <div className="text-sm text-gray-600 mt-2">Partida Final • Beach Tennis</div>
              </div>
            </div>
          )}

          <div className="text-center pt-4">
            <button
              onClick={onClose}
              className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            >
              Fechar Cerimônia
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TournamentWinner;
