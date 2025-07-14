# Correção do Schema da Tabela Matches

## Problema Identificado
O erro `Could not find the 'completed' column of 'matches' in the schema cache` ocorreu porque estávamos tentando atualizar uma coluna que não existe no banco de dados.

## Análise do Schema Real
Conforme o DDL fornecido, a tabela `matches` no Supabase tem os seguintes campos:
- `status` (tipo `match_status` ENUM: 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', etc.)
- `team1_ids` e `team2_ids` (arrays de UUIDs)
- `team1_score` e `team2_score` (integers)
- `winner_team` (varchar com valores 'team1', 'team2', 'draw')

## Correções Aplicadas

### 1. Campo de Status
- **Anterior**: `completed: true` (campo inexistente)
- **Corrigido**: `status: 'COMPLETED'` (campo correto do enum)

### 2. Campos de Equipes
- **Anterior**: `team1`, `team2` (nomes incorretos)
- **Corrigido**: `team1_ids`, `team2_ids` (nomes corretos no schema)

### 3. Campos de Pontuação
- **Anterior**: `score1`, `score2` (nomes incorretos)
- **Corrigido**: `team1_score`, `team2_score` (nomes corretos no schema)

### 4. Campo do Vencedor
- **Anterior**: `winnerId` (nome incorreto)
- **Corrigido**: `winner_team` (nome correto no schema)

## Payload Final Corrigido
```typescript
const updateData = {
  team1_ids: winningTeam,     // Array de participantes vencedores
  team2_ids: [],              // Remove a equipe adversária
  status: 'COMPLETED',        // Marca como completada
  team1_score: 1,             // BYE = vitória automática
  team2_score: 0,             // Equipe adversária sem pontos
  winner_team: 'team1'        // Define o vencedor
};
```

## Resultado Esperado
Agora a atribuição de BYE deve funcionar corretamente, atualizando apenas os campos que existem no schema do Supabase.
