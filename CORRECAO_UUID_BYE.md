# Correção de Erro UUID na Atribuição de BYE

## Problema Identificado
O erro `invalid input syntax for type uuid: "beach_tennis_elimination_1"` ocorria porque o sistema tentava buscar partidas na tabela `matches` usando IDs customizados (formato string) em vez de UUIDs válidos.

## Diagnóstico da Arquitetura
Após investigação, descobriu-se que:

1. **Tabela `matches` vs JSONB**: O sistema não usa a tabela `matches` separada, mas sim o campo `matches_data` (JSONB) na tabela `tournaments`
2. **IDs customizados**: As partidas são criadas com IDs no formato `beach_tennis_elimination_1` em memória
3. **Desconexão**: O `ByeAssignment` tentava acessar diretamente a tabela `matches` que não contém esses dados

## Solução Implementada

### 1. Atualização do ByeAssignment.tsx
- **Removido**: Acesso direto ao Supabase e tabela `matches`
- **Adicionado**: Uso do `TournamentService.updateMatchInTournament()`
- **Simplificado**: Lógica de atualização usando o serviço apropriado

### 2. Correções Específicas

#### Antes (com erro):
```typescript
// Tentativa de buscar na tabela matches com ID inválido
const { data: existingMatch, error: fetchError } = await supabase
  .from('matches')
  .select('*')
  .eq('id', team.matchId)  // ID string não é UUID válido
  .single();

// Update direto no Supabase com campos incorretos
const { data, error } = await supabase
  .from('matches')
  .update(updateData)
  .eq('id', team.matchId);
```

#### Depois (corrigido):
```typescript
// Trabalha apenas com dados em memória
const match = eliminationMatches.find(m => m.id === team.matchId);

// Usa o serviço correto que atualiza o JSONB
await TournamentService.updateMatchInTournament(tournamentId, match.id, {
  team1: winningTeam,
  team2: [],
  score1: 1,
  score2: 0,
  winnerId: 'team1',
  completed: true
});
```

### 3. Adição de Props
- **tournamentId**: Adicionado como prop obrigatória para permitir a atualização correta
- **Passagem no TournamentBracket**: Atualizado para passar `tournament?.id`

## Fluxo Correto Agora

1. **Busca local**: Encontra a partida nos dados em memória (`eliminationMatches`)
2. **Identificação**: Determina qual equipe recebe o BYE
3. **Atualização via serviço**: Usa `TournamentService.updateMatchInTournament()` 
4. **Persistência JSONB**: O serviço atualiza o campo `matches_data` na tabela `tournaments`
5. **Recarregamento**: Interface é atualizada após a operação

## Benefícios da Correção

- ✅ **Compatibilidade**: Funciona com a arquitetura real do sistema (JSONB)
- ✅ **Performance**: Não faz consultas desnecessárias ao banco
- ✅ **Consistência**: Usa os mesmos serviços que outras funcionalidades
- ✅ **Manutenibilidade**: Centraliza lógica de atualização de partidas
- ✅ **Robustez**: Elimina problemas de UUID vs string ID

## Teste Recomendado

1. Abrir a tela de eliminatórias
2. Clicar no botão "Atribuir BYE"
3. Selecionar uma equipe para receber BYE
4. Verificar se a operação é concluída sem erro
5. Confirmar se a partida é atualizada corretamente no torneio
