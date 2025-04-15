-- Script para gerar eventos de teste para a Arena
-- Executa este script no Supabase SQL Editor

-- Limpeza para evitar duplicação em testes repetidos (opcional)
-- DELETE FROM events WHERE title LIKE 'Evento Teste%';

-- Definir variáveis de tempo para eventos futuros
DO $$
DECLARE
  -- Criar IDs para eventos e quadras
  court_id_1 uuid := '11111111-1111-1111-1111-111111111111';
  court_id_2 uuid := '22222222-2222-2222-2222-222222222222';
  court_id_3 uuid := '33333333-3333-3333-3333-333333333333';
  
  -- Datas - começando pelo próximo mês para garantir eventos futuros
  next_month_date date := (now() + interval '1 month')::date;
  two_months_date date := (now() + interval '2 months')::date;
  three_months_date date := (now() + interval '3 months')::date;
BEGIN
  
  -- Primeiro, garantir que temos algumas quadras de teste
  -- Adaptado para funcionar com seu esquema de banco de dados
  INSERT INTO courts (id, name, location, indoor, active, image_url, description, created_at, updated_at)
  VALUES
    (court_id_1, 'Quadra Principal', 'Arena Conexão', FALSE, TRUE, 'https://picsum.photos/800/600', 'Quadra oficial para torneios - Saibro', now(), now()),
    (court_id_2, 'Quadra 2', 'Arena Conexão', FALSE, TRUE, 'https://picsum.photos/800/601', 'Quadra secundária - Grama sintética', now(), now()),
    (court_id_3, 'Quadra Indoor', 'Arena Conexão', TRUE, TRUE, 'https://picsum.photos/800/602', 'Quadra coberta - Madeira', now(), now())
  ON CONFLICT (id) DO NOTHING;
  
  -- Agora inserir os eventos com todas as informações necessárias
  
  -- Evento 1: Torneio de duplas formadas
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 1 - Torneio Beach Tennis Verão', 
    'Um grande evento de beach tennis para celebrar o verão! Venha participar do maior torneio da temporada com premiações especiais.',
    'Arena Conexão', next_month_date, '09:00', 150.00, 32,
    'R$ 3.000 em premiação (1º lugar: R$ 1.500, 2º lugar: R$ 1.000, 3º lugar: R$ 500)',
    '1. Partidas melhor de 3 sets
2. Tie-break em todos os sets
3. Regras oficiais da Federação Internacional
4. Tolerância de 15 minutos de atraso
5. Cada dupla deve trazer uma lata de bolas nova',
    'https://picsum.photos/1200/600',
    'FORMED',
    ARRAY['Masculino Pro', 'Feminino Pro', 'Misto Avançado'],
    now(), now(),
    ARRAY[court_id_1, court_id_2]
  );
  
  -- Evento 2: Torneio com duplas aleatórias
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 2 - Torneio Sorteio de Duplas', 
    'Venha participar de um torneio diferente onde as duplas são formadas na hora por sorteio! Não precisa ter parceiro.',
    'Arena Conexão', next_month_date, '14:00', 80.00, 24,
    'Troféus para 1º, 2º e 3º lugares + Brindes dos patrocinadores',
    '1. Duplas sorteadas antes do início
2. Formato de grupos seguido de eliminação
3. Partidas em formato reduzido (um set até 6 games)
4. Obrigatório uso de viseira ou boné',
    'https://picsum.photos/1200/601',
    'RANDOM',
    ARRAY['Categoria Única', 'Nível intermediário'],
    now(), now(),
    ARRAY[court_id_2, court_id_3]
  );
  
  -- Evento 3: Bolão
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'POOL', 'Evento Teste 3 - Bolão Beneficente', 
    'Bolão beneficente com toda a arrecadação destinada à reforma da escola municipal. Venha jogar e ajudar!',
    'Arena Conexão', two_months_date, '18:30', 100.00, 20,
    'Medalhas para todos os participantes + Certificado de participação',
    '1. Formato de todos contra todos
2. Contagem progressiva de pontos
3. Tempo limite de 2 horas
4. Cada participante joga pelo menos 3 partidas
5. Arrecadação 100% destinada à caridade',
    'https://picsum.photos/1200/602',
    'RANDOM',
    ARRAY['Aberto', 'Categoria Única'],
    now(), now(),
    ARRAY[court_id_1]
  );
  
  -- Evento 4: Torneio grande categoria feminina
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 4 - Copa Feminina de Beach Tennis', 
    'O maior torneio feminino da temporada! Várias categorias e premiação especial.',
    'Arena Conexão', two_months_date, '08:30', 120.00, 48,
    'Premiação total de R$ 5.000 dividida entre as categorias + Kits esportivos',
    '1. Categorias: Pro, A, B e C
2. Sistema de eliminação simples
3. Partidas melhor de 3 sets
4. Arbitragem oficial em todas as quadras
5. Transmissão ao vivo das finais',
    'https://picsum.photos/1200/603',
    'FORMED',
    ARRAY['Feminino Pro', 'Feminino A', 'Feminino B', 'Feminino C'],
    now(), now(),
    ARRAY[court_id_1, court_id_2, court_id_3]
  );
  
  -- Evento 5: Torneio com categoria específica
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 5 - Torneio 40+ Beach Tennis', 
    'Torneio exclusivo para atletas com mais de 40 anos. Venha competir em sua faixa etária!',
    'Arena Conexão', three_months_date, '09:00', 90.00, 32,
    'Troféus para os vencedores + Vale-compras em loja esportiva',
    '1. Exclusivo para maiores de 40 anos
2. Documento de identificação obrigatório
3. Sistema misto: fase de grupos + eliminatórias
4. Partidas em melhor de 3 sets, com super tie-break no terceiro',
    'https://picsum.photos/1200/604',
    'FORMED',
    ARRAY['Masculino 40+', 'Feminino 40+', 'Misto 40+'],
    now(), now(),
    ARRAY[court_id_2]
  );
  
  -- Evento 6: Torneio relâmpago
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 6 - Torneio Relâmpago Noturno', 
    'Torneio compacto para ser concluído em uma única noite! Partidas rápidas e muita ação.',
    'Arena Conexão', three_months_date, '19:00', 60.00, 16,
    'R$ 1.000 para a dupla campeã',
    '1. Partidas em formato único de 1 set até 6 games
2. Decisão por tie-break em caso de 5-5
3. Tempo máximo de 5 minutos entre partidas
4. Obrigatório confirmar presença até 18:30',
    'https://picsum.photos/1200/605',
    'FORMED',
    ARRAY['Categoria Open'],
    now(), now(),
    ARRAY[court_id_1, court_id_3]
  );
  
  -- Evento 7: Clínica de Beach Tennis com torneio
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'POOL', 'Evento Teste 7 - Clínica + Mini Torneio', 
    'Comece o dia aprendendo técnicas com profissionais e termine competindo em um mini torneio!',
    'Arena Conexão', three_months_date, '08:00', 200.00, 24,
    'Raquete profissional para o campeão + Aulas gratuitas',
    '1. Clínica técnica das 8:00 às 12:00
2. Almoço incluso no local
3. Mini torneio das 13:00 às 18:00
4. Sistema de grupos com jogos curtos
5. Análise técnica individual ao final',
    'https://picsum.photos/1200/606',
    'RANDOM',
    ARRAY['Iniciantes', 'Intermediários'],
    now(), now(),
    ARRAY[court_id_2, court_id_3]
  );
  
  -- Evento 8: Torneio inclusivo
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 8 - Torneio Para-Beach Tennis', 
    'Torneio inclusivo com categorias adaptadas. Venha fazer parte deste momento especial!',
    'Arena Conexão', three_months_date, '10:00', 0.00, 32,
    'Troféus e medalhas para todos + Kits esportivos',
    '1. Torneio adaptado para atletas com deficiência
2. Regras específicas por categoria
3. Sistema de pontuação adaptado
4. Auxiliares disponíveis em quadra
5. Inscrições gratuitas',
    'https://picsum.photos/1200/607',
    'FORMED',
    ARRAY['Cadeirantes', 'Amputados', 'Deficiência Visual', 'Categoria Unificada'],
    now(), now(),
    ARRAY[court_id_1, court_id_3]
  );
  
  -- Evento 9: Torneio Juvenil
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 9 - Torneio Juvenil Revelação', 
    'Competição especial para jovens atletas mostrarem seu talento. Categorias por idade.',
    'Arena Conexão', next_month_date, '13:00', 50.00, 40,
    'Medalhas e troféus + Kit esportivo completo para os campeões',
    '1. Categorias por faixa etária: Sub-14, Sub-16 e Sub-18
2. Comprovação de idade obrigatória
3. Sistema de grupos + eliminatórias
4. Acompanhamento técnico disponível
5. Presença dos pais obrigatória para menores de 16 anos',
    'https://picsum.photos/1200/608',
    'FORMED',
    ARRAY['Sub-14', 'Sub-16', 'Sub-18'],
    now(), now(),
    ARRAY[court_id_1, court_id_2]
  );
  
  -- Evento 10: Torneio de Duplas Mistas
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 10 - Torneio Duplas Mistas Premium', 
    'Exclusivo para duplas mistas! Torneio especial com estrutura premium e transmissão ao vivo.',
    'Arena Conexão Premium', two_months_date, '10:00', 180.00, 24,
    'R$ 4.000 em premiação + Contrato com patrocinador esportivo para os campeões',
    '1. Exclusivo para duplas mistas (homem e mulher)
2. Formato eliminatório com repescagem
3. Partidas em melhor de 3 sets
4. Quadras e estrutura premium
5. Transmissão ao vivo de todas as partidas',
    'https://picsum.photos/1200/609',
    'FORMED',
    ARRAY['Misto Pro', 'Misto A', 'Misto B'],
    now(), now(),
    ARRAY[court_id_1, court_id_2]
  );
  
  -- Evento 11: Torneio Empresarial
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 11 - Copa Empresarial', 
    'Torneio entre empresas da região. Cada empresa pode inscrever até 4 duplas representantes.',
    'Arena Conexão', two_months_date, '14:30', 300.00, 32,
    'Troféu corporativo + Banner permanente na arena + R$ 3.000 para a empresa campeã',
    '1. Cada empresa pode inscrever até 4 duplas
2. Jogadores devem comprovar vínculo com a empresa
3. Sistema de pontuação por empresa
4. Uniformes padronizados obrigatórios
5. Espaço para networking após o evento',
    'https://picsum.photos/1200/610',
    'FORMED',
    ARRAY['Categoria Corporativa'],
    now(), now(),
    ARRAY[court_id_1, court_id_2, court_id_3]
  );
  
  -- Evento 12: Festival Beach Tennis
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'POOL', 'Evento Teste 12 - Festival Beach Tennis Weekend', 
    'Um final de semana inteiro dedicado ao beach tennis! Jogos amistosos, clínicas, competições e muito mais.',
    'Arena Conexão - Complexo Completo', three_months_date, '08:00', 250.00, 60,
    'Diversos prêmios ao longo do evento + Sorteio de equipamentos esportivos',
    '1. Programação de 2 dias completos
2. Inclui alimentação e camiseta do evento
3. Diversas atividades simultâneas
4. Sistema de rotação de quadras e parceiros
5. Presença de atletas profissionais confirmada',
    'https://picsum.photos/1200/611',
    'RANDOM',
    ARRAY['Livre', 'Todos os níveis'],
    now(), now(),
    ARRAY[court_id_1, court_id_2, court_id_3]
  );
  
  -- Evento 13: Torneio de Iniciantes
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 13 - Primeiro Saque: Torneio para Iniciantes', 
    'Evento exclusivo para quem está começando no beach tennis. Ambiente acolhedor e suporte técnico durante todo o torneio.',
    'Arena Conexão', next_month_date, '16:00', 40.00, 24,
    'Medalhas de participação + Vouchers para aulas particulares',
    '1. Restrito para atletas com menos de 1 ano de prática
2. Regras adaptadas para iniciantes
3. Dicas técnicas durante as partidas
4. Raquetes disponíveis para empréstimo
5. Ambiente não competitivo e foco no aprendizado',
    'https://picsum.photos/1200/612',
    'RANDOM',
    ARRAY['Iniciantes'],
    now(), now(),
    ARRAY[court_id_3]
  );
  
  -- Evento 14: Torneio Noturno
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 14 - Night Session: Torneio sob as Estrelas', 
    'Experiência única de beach tennis noturno com iluminação especial e ambiente festivo.',
    'Arena Conexão Noturna', two_months_date, '19:30', 100.00, 24,
    'R$ 2.000 em dinheiro + Brindes exclusivos',
    '1. Partidas exclusivamente noturnas
2. Bolas especiais com LED
3. Sistema de eliminação dupla
4. After party com DJ inclusa no valor
5. Categorias mistas obrigatórias',
    'https://picsum.photos/1200/613',
    'FORMED',
    ARRAY['Misto Open', 'Misto B'],
    now(), now(),
    ARRAY[court_id_1, court_id_3]
  );
  
  -- Evento 15: Camp Day
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'POOL', 'Evento Teste 15 - Beach Tennis Camp Day', 
    'Um dia inteiro de imersão em beach tennis com jogos, aulas técnicas e preparação física com profissionais.',
    'Arena Conexão', three_months_date, '07:30', 220.00, 30,
    'Material técnico completo + Análise técnica individual em vídeo',
    '1. Programação completa das 7:30 às 18:00
2. Café da manhã e almoço inclusos
3. Divisão por grupos de nível técnico
4. Rotação de atividades a cada hora
5. Certificado de participação',
    'https://picsum.photos/1200/614',
    'RANDOM',
    ARRAY['Iniciantes', 'Intermediários', 'Avançados'],
    now(), now(),
    ARRAY[court_id_2, court_id_3]
  );
  
  -- Evento 16: Torneio de Veteranos
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 16 - Torneio Veteranos 50+', 
    'Torneio especial para atletas acima de 50 anos que ainda mostram sua energia nas quadras!',
    'Arena Conexão', two_months_date, '09:30', 70.00, 28,
    'Troféus personalizados + Jantar de confraternização',
    '1. Exclusivo para atletas acima de 50 anos
2. Sistema misto de grupos + eliminatórias
3. Partidas em um set prolongado (até 9 games)
4. Presença de equipe médica durante todo o evento
5. Intervalo especial para descanso entre partidas',
    'https://picsum.photos/1200/615',
    'FORMED',
    ARRAY['Masculino 50+', 'Feminino 50+', 'Misto 50+'],
    now(), now(),
    ARRAY[court_id_2]
  );
  
  -- Evento 17: Torneio Pais e Filhos
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 17 - Torneio Família na Arena: Pais e Filhos', 
    'Evento especial para duplas formadas por pais/mães e filhos(as). Uma oportunidade de fortalecer laços familiares!',
    'Arena Conexão', next_month_date, '10:00', 60.00, 32,
    'Troféus para todas as duplas + Album fotográfico digital do evento',
    '1. Duplas formadas obrigatoriamente por familiar direto
2. Categorias por idade dos filhos
3. Sistema adaptado para equilíbrio das partidas
4. Ambiente recreativo e comemorativo
5. Atividades extras para toda a família',
    'https://picsum.photos/1200/616',
    'FORMED',
    ARRAY['Filhos até 12 anos', 'Filhos 13-17 anos', 'Filhos adultos'],
    now(), now(),
    ARRAY[court_id_1, court_id_2]
  );
  
  -- Evento 18: Torneio Beneficente
  INSERT INTO events (
    id, type, title, description, location, date, time, price, max_participants, 
    prize, rules, banner_image_url, team_formation, categories, created_at, updated_at, court_ids
  ) VALUES (
    uuid_generate_v4(), 'TOURNAMENT', 'Evento Teste 18 - Torneio Solidário: Jogue por uma Causa', 
    'Toda a renda deste evento será destinada ao Hospital Infantil da cidade. Venha jogar e ajudar!',
    'Arena Conexão', three_months_date, '08:00', 100.00, 48,
    'Medalhas comemorativas + Certificado de participação solidária',
    '1. 100% da renda destinada à caridade
2. Sistema de grupos com todos jogando pelo menos 3 partidas
3. Categorias mistas para maior integração
4. Presença de representantes da instituição beneficiada
5. Cerimônia de entrega da doação ao final',
    'https://picsum.photos/1200/617',
    'RANDOM',
    ARRAY['Categoria Única Solidária'],
    now(), now(),
    ARRAY[court_id_1, court_id_2, court_id_3]
  );
  
END $$;
