import React, { useState, useEffect } from 'react';
import { Match, GroupRanking, Tournament } from '../../types';
import { calculateGroupRankings } from '../../utils/rankingUtils';
import { Button } from '../ui/Button';
import { calculateBracketSize, createSeededBracket, BracketPosition, getSeedDescription, BracketSeedingOptions } from '../../utils/bracketUtils';
import { Check, RefreshCw, AlertCircle } from 'lucide-react';

interface ElimBracketBuilderProps {
  tournament: Tournament;
  onCreateBracket: (matches: Match[]) => Promise<void>;
  onCancel: () => void;
  maxTeams?: number;
}

export const ElimBracketBuilder: React.FC<ElimBracketBuilderProps> = ({
  tournament,
  onCreateBracket,
  onCancel,
  maxTeams
}) => {
  const [loading, setLoading] = useState(false);
  const [groupRankings, setGroupRankings] = useState<GroupRanking[]>([]);
  const [bracketPositions, setBracketPositions] = useState<BracketPosition[]>([]);
  const [qualifiersPerGroup, setQualifiersPerGroup] = useState(2);
  const [totalQualifiers, setTotalQualifiers] = useState(0);
  const [seedingOptions, setSeedingOptions] = useState<BracketSeedingOptions>({
    avoidSameGroupInFirstRound: true,
    seedingMethod: 'strength',
    balanceBracket: true,
    useSnakeOrder: true
  });
  const [error, setError] = useState<string | null>(null);
  
  // Calculate group rankings on mount
  useEffect(() => {
    calculateRankings();
  }, [tournament]);
  
  // Update total qualifiers when settings change
  useEffect(() => {
    const groupCount = tournament.groups?.length || 0;
    const calculatedTotal = Math.min(
      groupCount * qualifiersPerGroup,
      maxTeams || Number.MAX_SAFE_INTEGER
    );
    setTotalQualifiers(calculatedTotal);
    
    // Update bracket positions when qualifiers count changes
    if (groupRankings.length > 0) {
      const qualifiers = getTopTeams(groupRankings, qualifiersPerGroup);
      createBracket(qualifiers);
    }
  }, [qualifiersPerGroup, groupRankings, maxTeams]);
  
  /**
   * Calculate rankings for all groups
   */
  const calculateRankings = () => {
    if (!tournament.groups || !tournament.matches) {
      setError('Não foram encontrados grupos ou partidas no torneio.');
      return;
    }
    
    try {
      // Get completed group matches
      const completedGroupMatches = tournament.matches
        .filter(m => m.stage === 'GROUP' && m.completed);
      
      if (completedGroupMatches.length === 0) {
        setError('Não há partidas da fase de grupos completadas para gerar o chaveamento.');
        return;
      }
      
      // Calculate rankings for each group
      const allGroupRankings: GroupRanking[] = [];
      
      tournament.groups.forEach(group => {
        const groupMatches = completedGroupMatches
          .filter(m => m.groupNumber === parseInt(group.name.replace(/\D/g, '')));
        
        if (groupMatches.length > 0) {
          const rankings = calculateGroupRankings(groupMatches, true);
          allGroupRankings.push(...rankings);
        }
      });
      
      setGroupRankings(allGroupRankings);
      setError(null);
      
      // Create initial bracket
      const qualifiers = getTopTeams(allGroupRankings, qualifiersPerGroup);
      createBracket(qualifiers);
      
    } catch (err) {
      setError('Erro ao calcular classificações dos grupos: ' + 
        (err instanceof Error ? err.message : 'Erro desconhecido'));
    }
  };
  
  /**
   * Get the top N teams from each group
   */  const getTopTeams = (rankings: GroupRanking[], n: number): GroupRanking[] => {
    // Group by groupNumber
    const teamsByGroup: Map<number, GroupRanking[]> = new Map();
    
    for (const team of rankings) {
      const groupNum = team.stats.groupNumber || 0; // Default to group 0 if undefined
      if (!teamsByGroup.has(groupNum)) {
        teamsByGroup.set(groupNum, []);
      }
      
      teamsByGroup.get(groupNum)!.push(team);
    }
    
    // Get top N from each group
    const qualifiers: GroupRanking[] = [];
      teamsByGroup.forEach((teams) => {
      // Sort by rank within group
      const sortedTeams = [...teams].sort((a, b) => a.rank - b.rank);
      qualifiers.push(...sortedTeams.slice(0, n));
    });
    
    return qualifiers;
  };
  
  /**
   * Create a seeded bracket based on qualified teams
   */
  const createBracket = (qualifiedTeams: GroupRanking[]) => {
    if (qualifiedTeams.length === 0) {
      setError('Não há times qualificados para criar o chaveamento.');
      setBracketPositions([]);
      return;
    }
    
    // Create seeded bracket
    const bracketPos = createSeededBracket(
      qualifiedTeams,
      seedingOptions
    );
    
    setBracketPositions(bracketPos);
  };
  
  /**
   * Regenerate bracket with new options
   */
  const regenerateBracket = () => {
    const qualifiers = getTopTeams(groupRankings, qualifiersPerGroup);
    createBracket(qualifiers);
  };
  
  /**
   * Build the elimination matches based on bracket
   */
  const buildEliminationMatches = async () => {
    try {
      setLoading(true);
      
      const bracketSize = calculateBracketSize(totalQualifiers);
      const elimMatches: Match[] = [];
      
      // First round matches
      for (let i = 0; i < bracketSize / 2; i++) {
        const team1Pos = bracketPositions[i * 2];
        const team2Pos = bracketPositions[i * 2 + 1];
        
        elimMatches.push({
          id: `elim_${tournament.id}_r1_${i}`,
          eventId: tournament.eventId,
          tournamentId: tournament.id,
          round: 1,
          position: i,
          team1: team1Pos.teamId,
          team2: team2Pos.teamId,
          score1: null,
          score2: null,
          winnerId: null,
          completed: false,
          scheduledTime: null,
          stage: 'ELIMINATION',
          groupNumber: null
        });
      }
      
      // Second round and beyond - empty matches to be filled as tournament progresses
      let currentRound = 2;
      let matchesInRound = bracketSize / 4;
      
      while (matchesInRound >= 1) {
        for (let i = 0; i < matchesInRound; i++) {
          elimMatches.push({
            id: `elim_${tournament.id}_r${currentRound}_${i}`,
            eventId: tournament.eventId,
            tournamentId: tournament.id,
            round: currentRound,
            position: i,
            team1: null,
            team2: null,
            score1: null,
            score2: null,
            winnerId: null,
            completed: false,
            scheduledTime: null,
            stage: 'ELIMINATION',
            groupNumber: null
          });
        }
        
        currentRound++;
        matchesInRound /= 2;
      }
      
      // Submit to parent component
      await onCreateBracket(elimMatches);
      
    } catch (error) {
      setError('Erro ao criar chaveamento: ' + 
        (error instanceof Error ? error.message : 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };
  
  /**
   * Get label for a bracket position
   */
  const getBracketPositionLabel = (pos: BracketPosition) => {
    if (!pos.teamId) return 'Bye (Vaga livre)';
    
    const team = groupRankings.find(r => 
      r.teamId.length === pos.teamId?.length && 
      r.teamId.every((id, i) => id === pos.teamId?.[i])
    );
    
    if (!team) return 'Time não identificado';
    
    return `Grupo ${team.stats.groupNumber} - ${team.rank}º lugar`;
  };
  
  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md mb-4">
        <div className="flex items-start">
          <AlertCircle className="text-red-500 mr-2 mt-0.5" size={18} />
          <div>
            <p className="text-red-600 font-medium mb-2">Erro ao criar chaveamento</p>
            <p className="text-red-600">{error}</p>
          </div>
        </div>
        <div className="mt-4">
          <Button onClick={onCancel}>Voltar</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Criar Chaveamento Eliminatório</h2>
      
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p className="text-sm text-yellow-800">
          Crie o chaveamento eliminatório a partir das classificações dos grupos.
          Configure as opções para controlar como as equipes serão organizadas.
        </p>
      </div>
      
      <div className="p-4 border rounded-md space-y-4">
        <h3 className="font-medium">Configurações de Qualificação</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Qualificados por grupo:
          </label>
          <select 
            className="border-gray-300 rounded-md shadow-sm w-full"
            value={qualifiersPerGroup}
            onChange={(e) => setQualifiersPerGroup(parseInt(e.target.value))}
          >
            <option value={1}>1 por grupo (apenas o 1º colocado)</option>
            <option value={2}>2 por grupo (1º e 2º colocados)</option>
            {tournament.groups && tournament.groups.length <= 2 && (
              <option value={3}>3 por grupo (1º, 2º e 3º colocados)</option>
            )}
            {tournament.groups && tournament.groups.length === 1 && (
              <option value={4}>4 por grupo (1º ao 4º colocado)</option>
            )}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Total de qualificados: {totalQualifiers} equipes
          </label>
          <p className="text-sm text-gray-500">
            Tamanho do chaveamento: {calculateBracketSize(totalQualifiers)} vagas 
            (inclui {calculateBracketSize(totalQualifiers) - totalQualifiers} bye)
          </p>
        </div>
      </div>
      
      <div className="p-4 border rounded-md space-y-4">
        <h3 className="font-medium">Configurações de Chaveamento</h3>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="avoidSameGroup"
            className="h-4 w-4 text-blue-600 rounded"
            checked={seedingOptions.avoidSameGroupInFirstRound}
            onChange={(e) => setSeedingOptions(prev => ({
              ...prev,
              avoidSameGroupInFirstRound: e.target.checked
            }))}
          />
          <label htmlFor="avoidSameGroup" className="ml-2 text-sm text-gray-700">
            Evitar confrontos do mesmo grupo na primeira rodada
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Método de distribuição:
          </label>
          <select 
            className="border-gray-300 rounded-md shadow-sm w-full"
            value={seedingOptions.seedingMethod}
            onChange={(e) => setSeedingOptions(prev => ({
              ...prev,
              seedingMethod: e.target.value as 'strength' | 'group'
            }))}
          >
            <option value="strength">Por força (melhor campanha geral)</option>
            <option value="group">Por grupo (cabeças de chave por grupo)</option>
          </select>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="useSnakeOrder"
            className="h-4 w-4 text-blue-600 rounded"
            checked={seedingOptions.useSnakeOrder}
            onChange={(e) => setSeedingOptions(prev => ({
              ...prev,
              useSnakeOrder: e.target.checked
            }))}
          />
          <label htmlFor="useSnakeOrder" className="ml-2 text-sm text-gray-700">
            Usar ordem intercalada para colocações dos grupos
          </label>
        </div>
        
        <div className="pt-2">
          <Button
            onClick={regenerateBracket}
            variant="outline"
            className="flex items-center"
          >
            <RefreshCw size={16} className="mr-1" /> 
            Recalcular Chaveamento
          </Button>
        </div>
      </div>
      
      {bracketPositions.length > 0 && (
        <div className="p-4 border rounded-md">
          <h3 className="font-medium mb-4">Prévia do Chaveamento</h3>
          
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {bracketPositions.map((pos, idx) => (
              <div 
                key={`bracket-pos-${idx}`}
                className={`p-3 rounded-md border ${pos.teamId ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="text-sm font-medium">
                  Posição {idx + 1} {pos.seed && `(${getSeedDescription(pos.seed, bracketPositions.length)})`}
                </div>
                <div className="mt-1 text-sm">
                  {pos.teamId ? getBracketPositionLabel(pos) : 'Vazio (bye)'}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 space-x-3 flex justify-end">
            <Button variant="outline" onClick={onCancel}>
              Cancelar
            </Button>
            <Button
              onClick={buildEliminationMatches}
              loading={loading}
              disabled={loading || bracketPositions.length === 0}
            >
              <Check size={16} className="mr-1" /> 
              Criar Chaveamento
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ElimBracketBuilder;
