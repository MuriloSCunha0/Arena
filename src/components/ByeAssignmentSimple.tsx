import React, { useState, useEffect } from 'react';
import { Button } from './ui/Button';
import { UserX, Check, X, AlertTriangle } from 'lucide-react';
import { Match } from '../types';
import { supabase } from '../lib/supabase';
import { useNotificationStore } from './ui/Notification';

interface ByeAssignmentProps {
  eliminationMatches: Match[];
  playerNameMap: Record<string, string>;
  onClose: () => void;
  onByeAssigned: () => void;
}

const ByeAssignmentSimple: React.FC<ByeAssignmentProps> = ({
  eliminationMatches,
  playerNameMap,
  onClose,
  onByeAssigned,
}) => {
  const [loading, setLoading] = useState(false);
  const [availableMatches, setAvailableMatches] = useState<Match[]>([]);
  const { addNotification } = useNotificationStore();

  // Extrair partidas disponíveis para BYE
  useEffect(() => {
    const availableMatches = eliminationMatches.filter(match => 
      !match.completed && 
      match.team1 && 
      match.team2 &&
      match.team1.length > 0 &&
      match.team2.length > 0
    );

    setAvailableMatches(availableMatches);
  }, [eliminationMatches]);

  const handleAssignBye = async (match: Match, winningTeam: 'team1' | 'team2') => {
    setLoading(true);
    try {
      console.log('Iniciando atribuição de BYE:', { 
        matchId: match.id, 
        winningTeam, 
        team1: match.team1, 
        team2: match.team2 
      });

      // Abordagem simplificada: marcar como concluída com o vencedor
      const updateData = {
        status: 'COMPLETED' as const,
        winner_team: winningTeam,
        team1_score: winningTeam === 'team1' ? 1 : 0,
        team2_score: winningTeam === 'team2' ? 1 : 0
      };

      console.log('Dados de atualização:', updateData);

      const { data, error } = await supabase
        .from('matches')
        .update(updateData)
        .eq('id', match.id)
        .select();

      console.log('Resultado:', { data, error });

      if (error) {
        console.error('Erro do Supabase:', error);
        throw new Error(error.message || 'Erro desconhecido do banco');
      }

      const teamName = winningTeam === 'team1' 
        ? (match.team1?.map(id => playerNameMap[id] || id).join(' & ') || 'Equipe 1')
        : (match.team2?.map(id => playerNameMap[id] || id).join(' & ') || 'Equipe 2');

      addNotification({
        type: 'success',
        message: `BYE atribuído com sucesso para ${teamName}! A equipe avança automaticamente.`
      });

      onByeAssigned();
      onClose();
    } catch (error) {
      console.error('Erro completo:', error);
      addNotification({
        type: 'error',
        message: `Erro ao atribuir BYE: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
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
              <p>• A partida será marcada como concluída automaticamente</p>
              <p>• Esta ação só pode ser feita antes das partidas começarem</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de partidas disponíveis */}
      {availableMatches.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">Nenhuma partida disponível</p>
          <p className="text-sm">Todas as partidas já foram iniciadas ou não há eliminatórias criadas.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <h5 className="font-semibold text-gray-800">Partidas Disponíveis para BYE:</h5>
          <div className="space-y-4">
            {availableMatches.map((match) => {
              const team1Name = match.team1?.map(id => playerNameMap[id] || id).join(' & ') || 'Equipe 1';
              const team2Name = match.team2?.map(id => playerNameMap[id] || id).join(' & ') || 'Equipe 2';
              
              return (
                <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="mb-3">
                    <div className="text-sm text-gray-500 mb-2">
                      Rodada {match.round || 1} • Partida #{match.id.slice(-6)}
                    </div>
                    <div className="text-center py-2 text-lg font-medium text-gray-700">
                      {team1Name} <span className="text-gray-400">vs</span> {team2Name}
                    </div>
                  </div>
                  
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignBye(match, 'team1')}
                      disabled={loading}
                      className="bg-green-500 hover:bg-green-600 text-white border-green-500"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      BYE para {team1Name.split(' & ')[0]}
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAssignBye(match, 'team2')}
                      disabled={loading}
                      className="bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      BYE para {team2Name.split(' & ')[0]}
                    </Button>
                  </div>
                </div>
              );
            })}
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

export default ByeAssignmentSimple;
