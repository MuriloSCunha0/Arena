import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { UserX, Users, Check, X } from 'lucide-react';
import { Match } from '../types';
import { TournamentService } from '../services/TournamentService';
import { useNotificationStore } from './ui/Notification';

interface ByeAssignmentProps {
  eliminationMatches: Match[];
  playerNameMap: Record<string, string>;
  onClose: () => void;
  onByeAssigned: (byeTeams: string[][]) => void;
  tournamentId: string; // Adicionar tournamentId como prop
}

const ByeAssignment: React.FC<ByeAssignmentProps> = ({
  eliminationMatches,
  playerNameMap,
  onClose,
  onByeAssigned,
  tournamentId,
}) => {
  const [loading, setLoading] = useState(false);
  const [availableTeams, setAvailableTeams] = useState<{ teamId: string[], teamName: string, matchId: string, round: number }[]>([]);
  const { addNotification } = useNotificationStore();

  // Extrair equipes disponíveis das partidas da eliminatória que ainda não começaram
  useEffect(() => {
    const teams: { teamId: string[], teamName: string, matchId: string, round: number }[] = [];
    
    // Buscar partidas que ainda não começaram e têm ambas as equipes
    const availableMatches = eliminationMatches.filter(match => 
      !match.completed && 
      match.team1 && 
      match.team2 &&
      match.team1.length > 0 &&
      match.team2.length > 0
    );

    availableMatches.forEach(match => {
      if (match.team1) {
        const team1Name = match.team1.map(id => playerNameMap[id] || id).join(' & ');
        teams.push({
          teamId: match.team1,
          teamName: team1Name,
          matchId: match.id,
          round: match.round || 1
        });
      }
      
      if (match.team2) {
        const team2Name = match.team2.map(id => playerNameMap[id] || id).join(' & ');
        teams.push({
          teamId: match.team2,
          teamName: team2Name,
          matchId: match.id,
          round: match.round || 1
        });
      }
    });

    setAvailableTeams(teams);
  }, [eliminationMatches, playerNameMap]);

  const handleAssignBye = async (team: { teamId: string[], teamName: string, matchId: string, round: number }) => {
    setLoading(true);
    try {
      console.log('Iniciando atribuição de BYE:', { 
        matchId: team.matchId, 
        teamId: team.teamId, 
        teamName: team.teamName
      });

      // Encontrar a partida específica nos dados locais
      const match = eliminationMatches.find(m => m.id === team.matchId);
      if (!match) {
        throw new Error('Partida não encontrada nos dados locais');
      }

      console.log('Partida encontrada:', match);

      // Determinar qual equipe receberá o BYE
      let winningTeam: string[] | null = null;
      let losingTeam: string[] | null = null;

      if (match.team1 && match.team1.join(',') === team.teamId.join(',')) {
        winningTeam = match.team1;
        losingTeam = match.team2;
      } else if (match.team2 && match.team2.join(',') === team.teamId.join(',')) {
        winningTeam = match.team2;
        losingTeam = match.team1;
      }

      if (!winningTeam) {
        throw new Error('Equipe não encontrada na partida');
      }

      console.log('Equipe vencedora (BYE):', winningTeam);
      console.log('Equipe removida:', losingTeam);

      // Usar o serviço de torneio para atualizar a partida
      // Em vez de acessar diretamente a tabela matches, vamos usar o serviço
      await TournamentService.updateMatchInTournament(tournamentId, match.id, {
        team1: winningTeam,
        team2: [], // Remove a equipe adversária
        score1: 1,  // BYE = vitória automática
        score2: 0,
        winnerId: 'team1',
        completed: true
      });

      addNotification({
        type: 'success',
        message: `BYE atribuído com sucesso para ${team.teamName}! A equipe avança automaticamente para a próxima fase.`
      });

      // Fechar modal primeiro
      onClose();
      
      // Depois chamar o callback para atualizar os dados
      onByeAssigned([winningTeam]);
    } catch (error) {
      console.error('Erro completo ao atribuir BYE:', error);
      addNotification({
        type: 'error',
        message: `Erro ao atribuir BYE: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header explicativo */}
      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
        <div className="flex items-start gap-3">
          <UserX className="w-6 h-6 text-orange-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-orange-800 mb-2">Atribuição Manual de BYE</h4>
            <div className="text-sm text-orange-700 space-y-1">
              <p>• Selecione uma equipe para receber BYE (avanço automático)</p>
              <p>• A equipe adversária será removida automaticamente</p>
              <p>• Esta ação só pode ser feita antes das partidas começarem</p>
              <p>• O BYE resulta em vitória automática (1 x 0)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de equipes disponíveis */}
      {availableTeams.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">Nenhuma equipe disponível</p>
          <p className="text-sm">Todas as partidas já foram iniciadas ou não há eliminatórias criadas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h5 className="font-semibold text-gray-800">Equipes Disponíveis para BYE:</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTeams.map((team, index) => (
              <div key={`${team.matchId}-${index}`} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{team.teamName}</div>
                      <div className="text-sm text-gray-500">
                        Rodada {team.round} • Partida #{team.matchId.slice(-6)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAssignBye(team)}
                    disabled={loading}
                    className="bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Dar BYE
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botões de ação */}
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <Button variant="outline" onClick={onClose} disabled={loading}>
          <X className="w-4 h-4 mr-1" />
          Cancelar
        </Button>
      </div>
    </div>
  );
};

export default ByeAssignment;
