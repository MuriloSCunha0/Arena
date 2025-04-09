# Code Review Checklist

## Prevenção de Erros Comuns

### Chamadas de API e Funções de Store

- [ ] A função está sendo importada corretamente da store?
- [ ] O nome da função corresponde exatamente ao que está definido na store?
- [ ] As funções assíncronas estão sendo tratadas com try/catch ou .catch()?
- [ ] Os parâmetros passados para as funções estão corretos?

### Uso do React Hooks

- [ ] Todos os hooks do React são chamados no topo do componente?
- [ ] Dependências do useEffect estão completas?
- [ ] Funções usadas dentro do useEffect estão incluídas nas dependências?

### TypeScript & Tipagem

- [ ] Os tipos estão sendo usados corretamente?
- [ ] Propriedades opcionais estão sendo verificadas antes de uso?
- [ ] As tipagens estão atualizadas com a implementação das stores?

### Estado e Reatividade

- [ ] As atualizações de estado estão sendo feitas corretamente (sem mutações diretas)?
- [ ] Estados derivados estão sendo calculados com useMemo quando apropriado?
- [ ] As atualizações de estado assíncronas consideram possíveis race conditions?

### Padrões de Código

- [ ] Nomes consistentes para funções similares (ex: fetchAll vs getAll)?
- [ ] Tratamento de erros consistente em todo o aplicativo?
- [ ] Feedback visual para o usuário em operações assíncronas?
