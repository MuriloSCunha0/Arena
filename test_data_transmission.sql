-- Criar dados de teste para o evento b9dbfde1-d963-4df0-bda8-367b179ecff9

-- Primeiro, criar alguns participantes para o evento
INSERT INTO participants (name, email, phone, event_id) VALUES
('João Silva', 'joao.silva@email.com', '(11) 99999-1111', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Maria Santos', 'maria.santos@email.com', '(11) 99999-2222', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Pedro Oliveira', 'pedro.oliveira@email.com', '(11) 99999-3333', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Ana Costa', 'ana.costa@email.com', '(11) 99999-4444', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Carlos Ferreira', 'carlos.ferreira@email.com', '(11) 99999-5555', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Luciana Souza', 'luciana.souza@email.com', '(11) 99999-6666', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Roberto Lima', 'roberto.lima@email.com', '(11) 99999-7777', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Fernanda Alves', 'fernanda.alves@email.com', '(11) 99999-8888', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Rafael Martins', 'rafael.martins@email.com', '(11) 99999-9999', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Camila Rocha', 'camila.rocha@email.com', '(11) 99999-0000', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Bruno Nascimento', 'bruno.nascimento@email.com', '(11) 88888-1111', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Juliana Barbosa', 'juliana.barbosa@email.com', '(11) 88888-2222', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Thiago Carvalho', 'thiago.carvalho@email.com', '(11) 88888-3333', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Patricia Dias', 'patricia.dias@email.com', '(11) 88888-4444', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Marcos Ribeiro', 'marcos.ribeiro@email.com', '(11) 88888-5555', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Renata Silva', 'renata.silva@email.com', '(11) 88888-6666', 'b9dbfde1-d963-4df0-bda8-367b179ecff9');

-- Criar dois grupos
INSERT INTO groups (name, event_id) VALUES
('Grupo A', 'b9dbfde1-d963-4df0-bda8-367b179ecff9'),
('Grupo B', 'b9dbfde1-d963-4df0-bda8-367b179ecff9');

-- Vamos pegar os IDs dos participantes e grupos que acabamos de criar
-- e criar algumas partidas com resultados

-- Obter IDs dos participantes (assumindo que são os últimos 16 inseridos)
WITH participants_data AS (
  SELECT id, name, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM participants 
  WHERE event_id = 'b9dbfde1-d963-4df0-bda8-367b179ecff9'
  ORDER BY created_at DESC
  LIMIT 16
),
groups_data AS (
  SELECT id, name
  FROM groups 
  WHERE event_id = 'b9dbfde1-d963-4df0-bda8-367b179ecff9'
)
-- Criar partidas para o Grupo A
INSERT INTO matches (
  event_id, 
  group_id, 
  team1, 
  team2, 
  score1, 
  score2, 
  completed, 
  winnerId,
  match_date
)
SELECT 
  'b9dbfde1-d963-4df0-bda8-367b179ecff9',
  (SELECT id FROM groups_data WHERE name = 'Grupo A'),
  ARRAY[p1.id, p2.id]::text[],
  ARRAY[p3.id, p4.id]::text[],
  CASE WHEN random() > 0.5 THEN 2 ELSE 1 END,
  CASE WHEN random() > 0.5 THEN 1 ELSE 2 END,
  true,
  CASE WHEN random() > 0.5 THEN 'team1' ELSE 'team2' END,
  CURRENT_DATE
FROM 
  (SELECT id FROM participants_data WHERE rn = 1) p1,
  (SELECT id FROM participants_data WHERE rn = 2) p2,
  (SELECT id FROM participants_data WHERE rn = 3) p3,
  (SELECT id FROM participants_data WHERE rn = 4) p4

UNION ALL

SELECT 
  'b9dbfde1-d963-4df0-bda8-367b179ecff9',
  (SELECT id FROM groups_data WHERE name = 'Grupo A'),
  ARRAY[p5.id, p6.id]::text[],
  ARRAY[p7.id, p8.id]::text[],
  CASE WHEN random() > 0.5 THEN 2 ELSE 0 END,
  CASE WHEN random() > 0.5 THEN 1 ELSE 2 END,
  true,
  CASE WHEN random() > 0.5 THEN 'team1' ELSE 'team2' END,
  CURRENT_DATE
FROM 
  (SELECT id FROM participants_data WHERE rn = 5) p5,
  (SELECT id FROM participants_data WHERE rn = 6) p6,
  (SELECT id FROM participants_data WHERE rn = 7) p7,
  (SELECT id FROM participants_data WHERE rn = 8) p8

UNION ALL

-- Criar partidas para o Grupo B
SELECT 
  'b9dbfde1-d963-4df0-bda8-367b179ecff9',
  (SELECT id FROM groups_data WHERE name = 'Grupo B'),
  ARRAY[p9.id, p10.id]::text[],
  ARRAY[p11.id, p12.id]::text[],
  CASE WHEN random() > 0.5 THEN 2 ELSE 1 END,
  CASE WHEN random() > 0.5 THEN 0 ELSE 2 END,
  true,
  CASE WHEN random() > 0.5 THEN 'team1' ELSE 'team2' END,
  CURRENT_DATE
FROM 
  (SELECT id FROM participants_data WHERE rn = 9) p9,
  (SELECT id FROM participants_data WHERE rn = 10) p10,
  (SELECT id FROM participants_data WHERE rn = 11) p11,
  (SELECT id FROM participants_data WHERE rn = 12) p12

UNION ALL

SELECT 
  'b9dbfde1-d963-4df0-bda8-367b179ecff9',
  (SELECT id FROM groups_data WHERE name = 'Grupo B'),
  ARRAY[p13.id, p14.id]::text[],
  ARRAY[p15.id, p16.id]::text[],
  CASE WHEN random() > 0.5 THEN 2 ELSE 1 END,
  CASE WHEN random() > 0.5 THEN 1 ELSE 2 END,
  true,
  CASE WHEN random() > 0.5 THEN 'team1' ELSE 'team2' END,
  CURRENT_DATE
FROM 
  (SELECT id FROM participants_data WHERE rn = 13) p13,
  (SELECT id FROM participants_data WHERE rn = 14) p14,
  (SELECT id FROM participants_data WHERE rn = 15) p15,
  (SELECT id FROM participants_data WHERE rn = 16) p16;
