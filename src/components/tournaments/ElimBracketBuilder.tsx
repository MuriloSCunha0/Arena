import React, { useState, useEffect } from 'react';
import { Match, GroupRanking, Tournament } from '../../types';
import { calculateOverallGroupStageRankings } from '../../utils/rankingUtils';
import { generateEliminationBracketWithSmartBye } from '../../utils/bracketFix';
import { calculateBeachTennisGroupRankings } from '../../utils/beachTennisRules';
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
    const groupCount = tournament.groupsCount || 0;
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
  }, [qualifiersPerGroup, groupRankings, maxTeams, tournament.groupsCount]);
  
  /**
   * Calculate rankings for all groups using Beach Tennis rules
   */
  const calculateRankings = () => {
    if (!tournament.groupsData || !tournament.matches) {
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
      
      // Calculate rankings for each group using Beach Tennis rules
      const allGroupRankings: GroupRanking[] = [];
      
      // Get group numbers from completed matches
      const groupNumbers = [...new Set(completedGroupMatches.map(m => m.groupNumber))].filter(g => g !== null && g !== undefined);
      
      groupNumbers.forEach(groupNumber => {
        const groupMatches = completedGroupMatches
          .filter(m => m.groupNumber === groupNumber);
        
        if (groupMatches.length > 0) {
          // Use Beach Tennis specific ranking calculation
          const rankings = calculateBeachTennisGroupRankings(groupMatches);
          allGroupRankings.push(...rankings);
        }
      });
      
      setGroupRankings(allGroupRankings);
      setError(null);
      
      // Create initial bracket using Beach Tennis logic
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
   * Build the elimination matches using Beach Tennis smart BYE logic
   */
  const buildEliminationMatches = async () => {
    try {
      setLoading(true);
      
      // Get qualified teams from group rankings
      const qualifiers = getTopTeams(groupRankings, qualifiersPerGroup);
      
      // Calculate overall rankings to determine seeding
      const allGroupMatches = tournament.matches.filter(m => m.stage === 'GROUP' && m.completed);
      const overallRankings = calculateOverallGroupStageRankings(allGroupMatches);
      
      // Filter to only include qualified teams
      const qualifiedOverallRankings = overallRankings.filter(team => 
        qualifiers.some(q => 
          q.teamId.length === team.teamId.length && 
          q.teamId.every((id, i) => id === team.teamId[i])
        )
      );
      
      console.log('🏆 Generating elimination bracket with Beach Tennis BYE logic');
      console.log('📊 Qualified teams:', qualifiedOverallRankings);
      
      // Use smart BYE logic
      const bracketResult = generateEliminationBracketWithSmartBye(qualifiedOverallRankings);
      const elimMatches = bracketResult.matches;
      
      // Set tournament and event IDs for all matches
      elimMatches.forEach(match => {
        match.eventId = tournament.eventId;
        match.tournamentId = tournament.id;
      });
      
      console.log(`✅ Generated ${elimMatches.length} elimination matches with metadata:`, bracketResult.metadata);
      
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
    
    return `Grupo ${team.groupNumber || team.stats.groupNumber || 'N/A'} - ${team.rank}º lugar`;
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
            {tournament.groupsCount && tournament.groupsCount <= 2 && (
              <option value={3}>3 por grupo (1º, 2º e 3º colocados)</option>
            )}
            {tournament.groupsCount && tournament.groupsCount === 1 && (
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
