# Changelog - Arena

## 23/05/2025 - Atualizações

### Melhorias e correções

1. **Padronização de mensagens de erro**
   - Todas as mensagens de erro do sistema agora estão padronizadas em português
   - Mensagens de console também foram traduzidas para facilitar a depuração

2. **Modificação na exibição de participantes**
   - A lista de participantes na dashboard de administração agora exibe apenas usuários com app_metadata.role === "user"
   - Isso garante que administradores e organizadores não apareçam na lista de participantes
   - Implementado filtro por PostgreSQL usando queries com operadores OR para suportar diferentes formatos de metadados:
     - app_metadata.role === "user" 
     - app_metadata.roles contém "user"
   - **CORREÇÃO:** Corrigida sintaxe PostgreSQL para consultas JSON usando PostgREST (app_metadata->>role.eq.user,app_metadata->roles.cs.["user"])

### Como testar as alterações

1. **Mensagens de erro em português**
   - Provoque erros intencionais (por exemplo, desconectando do banco de dados) para verificar se as mensagens aparecem em português
   
2. **Filtro de participantes**
   - Faça login como administrador e acesse a página de participantes
   - Verifique se apenas usuários comuns (não admins/organizadores) aparecem na lista
   - Crie um usuário administrador e confirme que ele não aparece na lista de participantes
