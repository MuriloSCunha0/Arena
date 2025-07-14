# Prompt Detalhado - Implementação de Funcionalidades Avançadas Beach Tennis

## 🎯 OBJETIVO
Implementar funcionalidades avançadas para torneios de Beach Tennis no sistema Arena, incluindo afunilamento por ranking, visualizações melhoradas, sistema BYE e edição de chaveamento.

## 🚀 FUNCIONALIDADES A IMPLEMENTAR

### 1. **Afunilamento de Confronto por Ranking**
- 1º colocado geral vs último colocado
- 2º colocado vs penúltimo
- Evitar confrontos de duplas do mesmo grupo na primeira rodada

### 2. **Ranking por Grupo Melhorado**
- Visualização clara dos rankings de cada grupo
- Indicação visual dos classificados
- Critérios de Beach Tennis bem definidos

### 3. **Ranking na Fase Eliminatória**
- Status de cada dupla (ativa, eliminada, campeã)
- Histórico de eliminação por rodada
- Progresso visual das duplas

### 4. **Sistema BYE Inteligente**
- BYE automático para duplas melhor rankeadas quando número ímpar
- Visualização especial para partidas BYE
- Lógica de avanço automático

### 5. **Tela de Vencedor**
- Celebração visual para os campeões
- Estatísticas completas da dupla vencedora
- Design comemorativo

### 6. **Editor de Chaveamento**
- Edição de confrontos da primeira rodada eliminatória
- Atribuição manual de BYE
- Troca de posições entre duplas

---

## 📁 ESTRUTURA DE ARQUIVOS

```
src/
├── components/
│   ├── GroupRankings.tsx (NOVO)
│   ├── EliminationRankings.tsx (NOVO)
│   ├── TournamentWinner.tsx (NOVO)
│   ├── BracketEditor.tsx (NOVO)
│   └── events/
│       └── TournamentBracket.tsx (MODIFICAR)
├── utils/
│   └── rankingUtils.ts (MODIFICAR)
└── types/
    └── index.ts (VERIFICAR)
```

---

## 🔧 PASSO A PASSO DE IMPLEMENTAÇÃO

### **ETAPA 1: Funções Auxiliares no rankingUtils.ts**

**Localização:** `src/utils/rankingUtils.ts`

**Ações:**
1. Adicionar função de afunilamento por ranking
2. Implementar geração de bracket com BYE automático
3. Criar função para verificar partidas BYE

**Código a adicionar:**

```typescript
/**
 * Gera confrontos eliminatórios com afunilamento por ranking
 * 1º vs último, 2º vs penúltimo, evitando mesmo grupo na primeira rodada
 */
export function generateEliminationPairings(qualifiedTeams: OverallRanking[]): Match[] {
  const matches: Match[] = [];
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const used = new Set<number>();
  
  for (let i = 0; i < Math.floor(sortedTeams.length / 2); i++) {
    if (used.has(i)) continue;
    
    const bestTeam = sortedTeams[i];
    let worstTeamIndex = sortedTeams.length - 1 - i;
    
    // Procurar pior time disponível de grupo diferente
    while (worstTeamIndex > i && (
      used.has(worstTeamIndex) || 
      sortedTeams[worstTeamIndex].groupNumber === bestTeam.groupNumber
    )) {
      worstTeamIndex--;
    }
    
    if (worstTeamIndex <= i) {
      // Fallback: próximo disponível
      worstTeamIndex = i + 1;
      while (worstTeamIndex < sortedTeams.length && used.has(worstTeamIndex)) {
        worstTeamIndex++;
      }
    }
    
    if (worstTeamIndex < sortedTeams.length) {
      const worstTeam = sortedTeams[worstTeamIndex];
      
      matches.push({
        id: generateUUID(),
        team1: bestTeam.teamId,
        team2: worstTeam.teamId,
        score1: null,
        score2: null,
        completed: false,
        round: 1,
        groupNumber: null,
        winnerId: null,
        stage: 'ELIMINATION',
        eventId: '', // Será preenchido pelo contexto
        tournamentId: '', // Será preenchido pelo contexto
        position: matches.length + 1,
        scheduledTime: null
      });
      
      used.add(i);
      used.add(worstTeamIndex);
    }
  }
  
  return matches;
}

/**
 * Gera bracket eliminatório com BYE automático
 * BYEs vão para as duplas melhor rankeadas quando número ímpar
 */
export function generateEliminationBracketWithByes(qualifiedTeams: OverallRanking[]): Match[] {
  const sortedTeams = [...qualifiedTeams].sort((a, b) => a.rank - b.rank);
  const totalTeams = sortedTeams.length;
  
  // Calcular próxima potência de 2
  const nextPowerOf2 = Math.pow(2, Math.ceil(Math.log2(totalTeams)));
  const byesNeeded = nextPowerOf2 - totalTeams;
  
  const matches: Match[] = [];
  const teamsWithByes = sortedTeams.slice(0, byesNeeded);
  const teamsWithoutByes = sortedTeams.slice(byesNeeded);
  
  // Criar partidas BYE para melhores duplas
  teamsWithByes.forEach((team, index) => {
    matches.push({
      id: generateUUID(),
      team1: team.teamId,
      team2: null, // BYE
      score1: null,
      score2: null,
      completed: true,
      round: 1,
      groupNumber: null,
      winnerId: 'team1',
      stage: 'ELIMINATION',
      eventId: '',
      tournamentId: '',
      position: index + 1,
      scheduledTime: null
    });
  });
  
  // Gerar confrontos para duplas restantes
  const regularPairings = generateEliminationPairings(teamsWithoutByes);
  matches.push(...regularPairings);
  
  return matches;
}

/**
 * Verifica se uma partida é BYE
 */
export function hasBye(match: Match): boolean {
  return match.team2 === null;
}

/**
 * Obtém o nome da dupla que avança em partida BYE
 */
export function getByeAdvancingTeam(match: Match): string[] | null {
  if (!hasBye(match)) return null;
  return match.team1;
}
```

---

### **ETAPA 2: Componente GroupRankings.tsx**

**Localização:** `src/components/GroupRankings.tsx`

**Objetivo:** Exibir rankings de grupos com indicação visual dos classificados

**Código completo:**

```tsx
import React from 'react';
import { Trophy, Medal, Award, Star, Crown } from 'lucide-react';
import { GroupRanking } from '../types';

interface GroupRankingsProps {
  groupRankings: Record<number, GroupRanking[]>;
  playerNameMap?: Record<string, string>;
  isGroupStageComplete: boolean;
  qualifiersPerGroup?: number;
}

const GroupRankings: React.FC<GroupRankingsProps> = ({
  groupRankings,
  playerNameMap = {},
  isGroupStageComplete,
  qualifiersPerGroup = 2
}) => {
  const getRankIcon = (position: number) => {
    switch (position) {
      case 1: return <Crown className="w-5 h-5 text-yellow-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Award className="w-5 h-5 text-amber-600" />;
      default: return <Star className="w-4 h-4 text-gray-300" />;
    }
  };

  const getRankColor = (position: number, isQualified: boolean) => {
    if (isQualified) {
      return position === 1 
        ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300'
        : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300';
    }
    return 'bg-gray-50 border-gray-200';
  };

  const getTeamDisplayName = (teamId: string[]) => {
    return teamId
      .map(id => playerNameMap[id] || `Player ${id}`)
      .join(' / ');
  };

  return (
    <div className="space-y-6">
      {/* Legend */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          Critérios de Classificação Beach Tennis
        </h3>
        <div className="text-sm text-blue-700 space-y-1">
          <div>1. <strong>Saldo de Games</strong> (games ganhos - games perdidos)</div>
          <div>2. <strong>Total de Games Ganhos</strong></div>
          <div>3. <strong>Confronto Direto</strong> (em caso de empate)</div>
          <div>4. <strong>Menor Número de Games Perdidos</strong></div>
        </div>
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.entries(groupRankings).map(([groupNumber, rankings]) => (
          <div key={groupNumber} className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-t-lg">
              <h3 className="font-bold text-lg">Grupo {groupNumber}</h3>
            </div>
            <div className="p-4 space-y-3">
              {rankings.map((team, index) => {
                const position = index + 1;
                const isQualified = position <= qualifiersPerGroup;
                
                return (
                  <div
                    key={team.teamId.join('|')}
                    className={`p-3 rounded-lg border-2 ${getRankColor(position, isQualified)}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getRankIcon(position)}
                      <span className="font-semibold">{position}º</span>
                      {isQualified && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">
                          CLASSIFICADO
                        </span>
                      )}
                    </div>
                    <div className="font-medium text-gray-900 mb-2">
                      {getTeamDisplayName(team.teamId)}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex justify-between">
                        <span>Saldo:</span>
                        <span className={team.stats.gameDifference > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {team.stats.gameDifference > 0 ? '+' : ''}{team.stats.gameDifference}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Vitórias:</span>
                        <span className="font-medium text-blue-600">{team.stats.wins}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GroupRankings;
```

---

### **ETAPA 3: Componente EliminationRankings.tsx**

**Localização:** `src/components/EliminationRankings.tsx`

**Objetivo:** Mostrar status das duplas na fase eliminatória

**Código completo:**

```tsx
import React from 'react';
import { Trophy, AlertCircle, Clock, Crown, Target } from 'lucide-react';
import { OverallRanking, Match } from '../types';

interface EliminationRankingsProps {
  qualifiedTeams: OverallRanking[];
  eliminationMatches: Match[];
  playerNameMap?: Record<string, string>;
}

type TeamStatus = 'champion' | 'active' | 'eliminated' | 'qualified';

const EliminationRankings: React.FC<EliminationRankingsProps> = ({
  qualifiedTeams,
  eliminationMatches,
  playerNameMap = {}
}) => {
  const getTeamDisplayName = (teamId: string[]) => {
    return teamId
      .map(id => playerNameMap[id] || `Player ${id}`)
      .join(' / ');
  };

  const getTeamStatus = (team: OverallRanking): { status: TeamStatus; position: string } => {
    const teamKey = team.teamId.join('|');
    
    // Verificar se é campeão (ganhou a final)
    const finalMatch = eliminationMatches.find(match => 
      match.stage === 'FINALS' && match.completed && match.winnerId === 'team1' && 
      match.team1?.join('|') === teamKey
    ) || eliminationMatches.find(match => 
      match.stage === 'FINALS' && match.completed && match.winnerId === 'team2' && 
      match.team2?.join('|') === teamKey
    );

    if (finalMatch) {
      return { status: 'champion', position: 'Campeão' };
    }

    // Verificar se foi eliminado
    const eliminatedMatch = eliminationMatches.find(match => 
      match.completed && 
      ((match.team1?.join('|') === teamKey && match.winnerId === 'team2') ||
       (match.team2?.join('|') === teamKey && match.winnerId === 'team1'))
    );

    if (eliminatedMatch) {
      const roundName = getRoundName(eliminatedMatch.round || 1);
      return { status: 'eliminated', position: `Eliminado nas ${roundName}` };
    }

    // Verificar se tem partida pendente
    const pendingMatch = eliminationMatches.find(match => 
      !match.completed && 
      (match.team1?.join('|') === teamKey || match.team2?.join('|') === teamKey)
    );

    if (pendingMatch) {
      const roundName = getRoundName(pendingMatch.round || 1);
      return { status: 'active', position: `Ativo nas ${roundName}` };
    }

    return { status: 'qualified', position: 'Aguardando primeiro jogo' };
  };

  const getRoundName = (round: number): string => {
    switch (round) {
      case 1: return 'Primeira Rodada';
      case 2: return 'Segunda Rodada';
      case 3: return 'Quartas de Final';
      case 4: return 'Semifinal';
      case 5: return 'Final';
      default: return `${round}ª Rodada`;
    }
  };

  const getStatusIcon = (status: TeamStatus) => {
    switch (status) {
      case 'champion': return <Crown className="w-5 h-5 text-yellow-500" />;
      case 'active': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'eliminated': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'qualified': return <Target className="w-5 h-5 text-green-500" />;
    }
  };

  const getStatusColor = (status: TeamStatus) => {
    switch (status) {
      case 'champion': return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300';
      case 'active': return 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300';
      case 'eliminated': return 'bg-gradient-to-r from-red-50 to-red-100 border-red-300';
      case 'qualified': return 'bg-gradient-to-r from-green-50 to-green-100 border-green-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-6 rounded-lg">
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Trophy className="w-7 h-7" />
          Status da Eliminatória
        </h2>
      </div>

      <div className="space-y-4">
        {qualifiedTeams
          .sort((a, b) => a.rank - b.rank)
          .map((team) => {
            const statusInfo = getTeamStatus(team);
            
            return (
              <div
                key={team.teamId.join('|')}
                className={`p-4 rounded-lg border-2 ${getStatusColor(statusInfo.status)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-700 text-white rounded-full flex items-center justify-center text-sm font-bold">
                      {team.rank}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900">
                        {getTeamDisplayName(team.teamId)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Grupo {team.groupNumber} • {team.rank}º colocado geral
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(statusInfo.status)}
                    <span className="font-medium">{statusInfo.position}</span>
                  </div>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
};

export default EliminationRankings;
```

---

### **ETAPA 4: Componente TournamentWinner.tsx**

**Localização:** `src/components/TournamentWinner.tsx`

**Objetivo:** Tela de celebração para os vencedores

**Código completo:**

```tsx
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
```

---

### **ETAPA 5: Componente BracketEditor.tsx**

**Localização:** `src/components/BracketEditor.tsx`

**Objetivo:** Editor para chaveamento das eliminatórias

**Código completo:**

```tsx
import React, { useState } from 'react';
import { Edit3, UserX, RotateCcw, Users, Save, X, AlertTriangle } from 'lucide-react';
import { Match, OverallRanking } from '../types';

interface BracketEditorProps {
  matches: Match[];
  availableTeams: OverallRanking[];
  playerNameMap?: Record<string, string>;
  onSave: (updatedMatches: Match[]) => void;
  onClose: () => void;
}

const BracketEditor: React.FC<BracketEditorProps> = ({
  matches,
  availableTeams,
  playerNameMap = {},
  onSave,
  onClose
}) => {
  const [editedMatches, setEditedMatches] = useState<Match[]>([...matches]);
  const [showTeamSelector, setShowTeamSelector] = useState<{
    matchId: string;
    slot: 'team1' | 'team2';
  } | null>(null);

  const getTeamDisplayName = (teamId: string[] | null) => {
    if (!teamId) return 'BYE';
    return teamId
      .map(id => playerNameMap[id] || `Player ${id}`)
      .join(' / ');
  };

  const editableMatches = matches.filter(match => 
    match.stage === 'ELIMINATION' && match.round === 1
  );

  const assignBye = (matchId: string, teamSlot: 'team1' | 'team2') => {
    setEditedMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        const otherSlot = teamSlot === 'team1' ? 'team2' : 'team1';
        const winningTeamSlot = match[otherSlot] ? otherSlot : null;
        
        return {
          ...match,
          [teamSlot]: null,
          completed: true,
          winnerId: winningTeamSlot,
        };
      }
      return match;
    }));
  };

  const swapTeams = (matchId: string) => {
    setEditedMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          team1: match.team2,
          team2: match.team1,
        };
      }
      return match;
    }));
  };

  const replaceTeam = (matchId: string, slot: 'team1' | 'team2', newTeam: OverallRanking | null) => {
    setEditedMatches(prev => prev.map(match => {
      if (match.id === matchId) {
        return {
          ...match,
          [slot]: newTeam ? newTeam.teamId : null,
          completed: false,
          winnerId: null,
        };
      }
      return match;
    }));
    setShowTeamSelector(null);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-6 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-3">
                <Edit3 className="w-7 h-7" />
                Editor de Chaveamento
              </h2>
              <p className="text-indigo-100 mt-1">
                Edite os confrontos da primeira rodada eliminatória
              </p>
            </div>
            <button onClick={onClose} className="p-2 rounded-full bg-white/20 hover:bg-white/30">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <div className="font-medium mb-1">Instruções:</div>
                <ul className="space-y-1 text-blue-700">
                  <li>• Apenas confrontos da primeira rodada podem ser editados</li>
                  <li>• Use "Trocar Posições" para inverter as duplas</li>
                  <li>• "Atribuir BYE" remove uma dupla e avança a outra</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {editableMatches.map((match, index) => (
              <div key={match.id} className="p-4 rounded-lg border-2 border-gray-200 bg-white">
                <div className="font-semibold text-gray-800 mb-3">
                  Confronto {index + 1}
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="font-medium">{getTeamDisplayName(match.team1)}</div>
                    <button
                      onClick={() => assignBye(match.id, 'team1')}
                      className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                      title="Atribuir BYE"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="text-center text-gray-400 text-sm font-medium">VS</div>
                  
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="font-medium">{getTeamDisplayName(match.team2)}</div>
                    <button
                      onClick={() => assignBye(match.id, 'team2')}
                      className="p-1 text-purple-600 hover:bg-purple-100 rounded"
                      title="Atribuir BYE"
                    >
                      <UserX className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => swapTeams(match.id)}
                  className="w-full px-3 py-2 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Trocar Posições
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => onSave(editedMatches)}
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600"
            >
              <Save className="w-5 h-5" />
              Salvar Alterações
            </button>
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BracketEditor;
```

---

### **ETAPA 6: Modificações no TournamentBracket.tsx**

**Localização:** `src/components/events/TournamentBracket.tsx`

**Ações:**

1. **Adicionar imports dos novos componentes:**

```typescript
// Adicionar após os imports existentes
import GroupRankings from '../GroupRankings';
import EliminationRankings from '../EliminationRankings';
import TournamentWinner from '../TournamentWinner';
import BracketEditor from '../BracketEditor';
import { 
  generateEliminationPairings, 
  generateEliminationBracketWithByes, 
  hasBye 
} from '../../utils/rankingUtils';
```

2. **Adicionar novos estados:**

```typescript
// Adicionar após os estados existentes
const [showGroupRankingsEnhanced, setShowGroupRankingsEnhanced] = useState(false);
const [showEliminationRankings, setShowEliminationRankings] = useState(false);
const [showWinnerCeremony, setShowWinnerCeremony] = useState(false);
const [showBracketEditor, setShowBracketEditor] = useState(false);
const [tournamentWinner, setTournamentWinner] = useState<OverallRanking | null>(null);
const [finalMatch, setFinalMatch] = useState<Match | null>(null);
```

3. **Adicionar botões de ação:**

```typescript
// Adicionar na seção de botões
<Button
  onClick={() => setShowGroupRankingsEnhanced(true)}
  className="bg-green-500 hover:bg-green-600 text-white"
>
  <Trophy className="w-4 h-4 mr-2" />
  Rankings Melhorados
</Button>

<Button
  onClick={() => setShowEliminationRankings(true)}
  className="bg-purple-500 hover:bg-purple-600 text-white"
>
  <List className="w-4 h-4 mr-2" />
  Status Eliminatória
</Button>

<Button
  onClick={() => setShowBracketEditor(true)}
  className="bg-indigo-500 hover:bg-indigo-600 text-white"
>
  <Edit3 className="w-4 h-4 mr-2" />
  Editar Chaveamento
</Button>
```

4. **Adicionar lógica de detecção do vencedor:**

```typescript
// Adicionar useEffect para detectar vencedor
useEffect(() => {
  if (eliminationMatches.length > 0 && overallGroupRankings.length > 0) {
    const finalMatch = eliminationMatches.find(match => 
      match.stage === 'FINALS' && match.completed
    );
    
    if (finalMatch && finalMatch.winnerId) {
      const winnerTeamId = finalMatch.winnerId === 'team1' ? finalMatch.team1 : finalMatch.team2;
      if (winnerTeamId) {
        const winner = overallGroupRankings.find(team => 
          team.teamId.join('|') === winnerTeamId.join('|')
        );
        
        if (winner && !tournamentWinner) {
          setTournamentWinner(winner);
          setFinalMatch(finalMatch);
          setShowWinnerCeremony(true);
        }
      }
    }
  }
}, [eliminationMatches, overallGroupRankings, tournamentWinner]);
```

5. **Adicionar visualização BYE no MatchCard:**

```typescript
// Modificar o componente MatchCard existente
const MatchCard: React.FC<MatchCardProps> = ({ 
  teamA, 
  teamB, 
  scoreA, 
  scoreB, 
  winner, 
  onClick, 
  highlighted, 
  byeMatch, 
  // ... outros props
}) => {
  if (byeMatch) {
    return (
      <div className="border-2 border-indigo-300 bg-indigo-50/70 rounded-lg p-3">
        <div className="text-indigo-700 font-medium text-center mb-2">
          <UserX className="w-4 h-4 inline mr-1" />
          BYE
        </div>
        {teamA && (
          <div className="text-indigo-800 font-medium text-center">
            <div>{teamA}</div>
            <div className="text-xs">avança automaticamente</div>
          </div>
        )}
      </div>
    );
  }
  
  // ... resto do componente MatchCard existente
};
```

6. **Adicionar modais no JSX:**

```typescript
// Adicionar antes do fechamento do componente
{showGroupRankingsEnhanced && (
  <Modal onClose={() => setShowGroupRankingsEnhanced(false)}>
    <GroupRankings
      groupRankings={groupRankings}
      playerNameMap={playerNameMap}
      isGroupStageComplete={groupStageCompleted}
      qualifiersPerGroup={2}
    />
  </Modal>
)}

{showEliminationRankings && (
  <Modal onClose={() => setShowEliminationRankings(false)}>
    <EliminationRankings
      qualifiedTeams={overallGroupRankings}
      eliminationMatches={eliminationMatches}
      playerNameMap={playerNameMap}
    />
  </Modal>
)}

{showWinnerCeremony && tournamentWinner && (
  <TournamentWinner
    winner={tournamentWinner}
    finalMatch={finalMatch}
    playerNameMap={playerNameMap}
    onClose={() => setShowWinnerCeremony(false)}
  />
)}

{showBracketEditor && (
  <BracketEditor
    matches={eliminationMatches}
    availableTeams={overallGroupRankings}
    playerNameMap={playerNameMap}
    onSave={(updatedMatches) => {
      // Implementar salvamento das alterações
      setShowBracketEditor(false);
    }}
    onClose={() => setShowBracketEditor(false)}
  />
)}
```

---

## 🎯 ORDEM DE IMPLEMENTAÇÃO RECOMENDADA

1. **Primeiro:** Implementar funções em `rankingUtils.ts`
2. **Segundo:** Criar componente `GroupRankings.tsx`
3. **Terceiro:** Criar componente `EliminationRankings.tsx`
4. **Quarto:** Criar componente `TournamentWinner.tsx`
5. **Quinto:** Criar componente `BracketEditor.tsx`
6. **Sexto:** Modificar `TournamentBracket.tsx` com integração

---

## 🧪 TESTES NECESSÁRIOS

- **Torneios com número ímpar de duplas** (testear BYE)
- **Afunilamento de ranking** (1º vs último, etc.)
- **Detecção automática de vencedor**
- **Edição de chaveamento**
- **Responsividade em dispositivos móveis**

---

## 📝 OBSERVAÇÕES IMPORTANTES

- Manter compatibilidade com sistema existente
- Usar tipos TypeScript corretamente
- Seguir padrões de design já estabelecidos
- Implementar tratamento de erros adequado
- Adicionar loading states quando necessário
- Garantir acessibilidade (aria-labels, etc.)

Este prompt fornece a base completa para implementar todas as funcionalidades solicitadas de forma organizada e profissional.
