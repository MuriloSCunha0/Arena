-- Sample Data for Arena Database

-- Generate UUIDs for linking records (replace with actual generated UUIDs if needed)
DO $$
DECLARE
    user1_id UUID := uuid_generate_v4();
    user2_id UUID := uuid_generate_v4();
    organizer1_id UUID := uuid_generate_v4();
    organizer2_id UUID := uuid_generate_v4();
    court1_id UUID := uuid_generate_v4();
    court2_id UUID := uuid_generate_v4();
    court3_id UUID := uuid_generate_v4();
    event1_id UUID := uuid_generate_v4(); -- Beach Tennis Tournament
    event2_id UUID := uuid_generate_v4(); -- Padel Pool
    participant1_id UUID := uuid_generate_v4();
    participant2_id UUID := uuid_generate_v4();
    participant3_id UUID := uuid_generate_v4();
    participant4_id UUID := uuid_generate_v4();
    participant5_id UUID := uuid_generate_v4();
    participant6_id UUID := uuid_generate_v4();
    -- Additional Participants
    participant7_id UUID := uuid_generate_v4();
    participant8_id UUID := uuid_generate_v4();
    participant9_id UUID := uuid_generate_v4();
    participant10_id UUID := uuid_generate_v4();
    participant11_id UUID := uuid_generate_v4();
    participant12_id UUID := uuid_generate_v4();
    participant13_id UUID := uuid_generate_v4();
    participant14_id UUID := uuid_generate_v4();
    participant15_id UUID := uuid_generate_v4();
    participant16_id UUID := uuid_generate_v4();
    -- End Additional Participants
    tournament1_id UUID := uuid_generate_v4();
    match1_id UUID := uuid_generate_v4();
    match2_id UUID := uuid_generate_v4();
    reservation1_id UUID := uuid_generate_v4();
    reservation2_id UUID := uuid_generate_v4();
    transaction1_id UUID := uuid_generate_v4();
    transaction2_id UUID := uuid_generate_v4();
    transaction3_id UUID := uuid_generate_v4();
BEGIN

-- USERS
INSERT INTO users (id, email, user_metadata, app_metadata) VALUES
(user1_id, 'admin@arena.com', '{"name": "Admin User"}', '{"roles": ["admin"]}'),
(user2_id, 'organizer_user@arena.com', '{"name": "Organizer User"}', '{"roles": ["organizer"]}');

-- ORGANIZERS
INSERT INTO organizers (id, name, phone, email, pix_key, default_commission_rate) VALUES
(organizer1_id, 'Arena Sports Club', '11987654321', 'contact@arenasc.com', 'pix@arenasc.com', 15.00),
(organizer2_id, 'Beach Point Events', '21912345678', 'events@beachpoint.com', 'cnpj-12345678000199', 12.50);

-- COURTS
INSERT INTO courts (id, name, location, type, status, surface, indoor, image_url, description) VALUES
(court1_id, 'Quadra Central', 'Arena Sports Club - Setor A', 'BEACH_TENNIS', 'AVAILABLE', 'Areia Fina', FALSE, 'https://example.com/court1.jpg', 'Quadra principal para Beach Tennis.'),
(court2_id, 'Quadra Padel 1', 'Arena Sports Club - Setor B', 'PADEL', 'AVAILABLE', 'Sintético', TRUE, 'https://example.com/court2.jpg', 'Quadra coberta de Padel.'),
(court3_id, 'Quadra Praia Sol', 'Beach Point Events - Orla', 'BEACH_TENNIS', 'MAINTENANCE', 'Areia Grossa', FALSE, 'https://example.com/court3.jpg', 'Quadra de Beach Tennis com vista para o mar.');

-- EVENTS
INSERT INTO events (id, type, title, description, location, date, time, price, max_participants, prize, rules, banner_image_url, team_formation, categories, court_ids, organizer_id, organizer_commission_rate, status) VALUES
(event1_id, 'TOURNAMENT', '1º Torneio Aberto de Beach Tennis', 'Grande torneio de Beach Tennis amador.', 'Arena Sports Club', '2025-05-15', '09:00:00', 50.00, 64, 'Troféus + Brindes', 'Regras oficiais FPT.', 'https://example.com/banner_bt.jpg', 'FORMED', ARRAY['Masculino A', 'Feminino B', 'Mista C'], ARRAY[court1_id, court3_id], organizer1_id, 15.00, 'SCHEDULED'),
(event2_id, 'POOL', 'Pool Play Padel Iniciante', 'Jogo amistoso formato Pool Play para iniciantes.', 'Arena Sports Club', '2025-05-20', '19:00:00', 30.00, 16, 'Medalhas', 'Jogo em sets curtos.', 'https://example.com/banner_padel.jpg', 'RANDOM', ARRAY['Iniciante'], ARRAY[court2_id], organizer1_id, NULL, 'SCHEDULED');

-- EVENT-COURTS RELATIONSHIP
INSERT INTO event_courts (event_id, court_id) VALUES
(event1_id, court1_id),
(event1_id, court3_id), -- Assuming Beach Point court can be used by Arena SC event
(event2_id, court2_id);

-- EVENT ORGANIZERS
INSERT INTO event_organizers (event_id, user_id, role) VALUES
(event1_id, user2_id, 'ORGANIZER'),
(event2_id, user2_id, 'ASSISTANT');

-- PARTICIPANTS
INSERT INTO participants (id, event_id, name, cpf, phone, email, birth_date, partner_id, partner_name, payment_status, payment_method, payment_id, payment_date) VALUES
-- Event 1 (Beach Tennis - Formed Teams)
(participant1_id, event1_id, 'Carlos Silva', '111.111.111-11', '11999990001', 'carlos.silva@email.com', '1990-05-10', NULL, 'Ana Pereira', 'CONFIRMED', 'PIX', 'PAY123', NOW() - INTERVAL '1 day'),
(participant2_id, event1_id, 'Ana Pereira', '222.222.222-22', '11999990002', 'ana.pereira@email.com', '1992-08-20', NULL, 'Carlos Silva', 'CONFIRMED', 'PIX', 'PAY123', NOW() - INTERVAL '1 day'),
(participant3_id, event1_id, 'Bruno Costa', '333.333.333-33', '21988880003', 'bruno.costa@email.com', '1988-11-30', NULL, 'Fernanda Lima', 'PENDING', NULL, NULL, NULL),
(participant4_id, event1_id, 'Fernanda Lima', '444.444.444-44', '21988880004', 'fernanda.lima@email.com', '1995-02-15', NULL, 'Bruno Costa', 'PENDING', NULL, NULL, NULL),
(participant7_id, event1_id, 'Gabriel Souza', '777.777.777-77', '11977770007', 'gabriel.souza@email.com', '1991-03-12', NULL, 'Laura Martins', 'CONFIRMED', 'CARD', 'PAY789', NOW() - INTERVAL '2 days'),
(participant8_id, event1_id, 'Laura Martins', '888.888.888-88', '11977770008', 'laura.martins@email.com', '1993-09-25', NULL, 'Gabriel Souza', 'CONFIRMED', 'CARD', 'PAY789', NOW() - INTERVAL '2 days'),
(participant9_id, event1_id, 'Pedro Almeida', '999.999.999-99', '31966660009', 'pedro.almeida@email.com', '1985-12-01', NULL, 'Juliana Santos', 'PENDING', NULL, NULL, NULL),
(participant10_id, event1_id, 'Juliana Santos', '101.010.101-01', '31966660010', 'juliana.santos@email.com', '1987-06-18', NULL, 'Pedro Almeida', 'PENDING', NULL, NULL, NULL),
-- Event 2 (Padel Pool - Random Teams)
(participant5_id, event2_id, 'Ricardo Alves', '555.555.555-55', '31977770005', 'ricardo.alves@email.com', '1998-07-25', NULL, NULL, 'CONFIRMED', 'CARD', 'PAY456', NOW() - INTERVAL '2 hours'),
(participant6_id, event2_id, 'Sofia Mendes', '666.666.666-66', '31977770006', 'sofia.mendes@email.com', '2000-01-12', NULL, NULL, 'PENDING', NULL, NULL, NULL),
(participant11_id, event2_id, 'Marcos Oliveira', '112.233.445-56', '41955550011', 'marcos.oliveira@email.com', '1996-04-03', NULL, NULL, 'CONFIRMED', 'PIX', 'PAYABC', NOW() - INTERVAL '1 hour'),
(participant12_id, event2_id, 'Camila Ribeiro', '123.456.789-00', '41955550012', 'camila.ribeiro@email.com', '1999-10-15', NULL, NULL, 'CONFIRMED', 'PIX', 'PAYDEF', NOW() - INTERVAL '30 minutes'),
(participant13_id, event2_id, 'Lucas Ferreira', '987.654.321-01', '51944440013', 'lucas.ferreira@email.com', '1997-08-08', NULL, NULL, 'PENDING', NULL, NULL, NULL),
(participant14_id, event2_id, 'Beatriz Goncalves', '192.837.465-02', '51944440014', 'beatriz.goncalves@email.com', '2001-02-28', NULL, NULL, 'PENDING', NULL, NULL, NULL),
(participant15_id, event2_id, 'Thiago Azevedo', '555.666.777-88', '61933330015', 'thiago.azevedo@email.com', '1994-11-11', NULL, NULL, 'CONFIRMED', 'CASH', 'PAYGHI', NOW() - INTERVAL '5 hours'),
(participant16_id, event2_id, 'Isabela Correia', '111.222.333-44', '61933330016', 'isabela.correia@email.com', '1998-05-22', NULL, NULL, 'PENDING', NULL, NULL, NULL);

-- Update partner_id for participants after creation
UPDATE participants SET partner_id = participant2_id WHERE id = participant1_id;
UPDATE participants SET partner_id = participant1_id WHERE id = participant2_id;
UPDATE participants SET partner_id = participant4_id WHERE id = participant3_id;
UPDATE participants SET partner_id = participant3_id WHERE id = participant4_id;
UPDATE participants SET partner_id = participant8_id WHERE id = participant7_id;
UPDATE participants SET partner_id = participant7_id WHERE id = participant8_id;
UPDATE participants SET partner_id = participant10_id WHERE id = participant9_id;
UPDATE participants SET partner_id = participant9_id WHERE id = participant10_id;

-- TOURNAMENTS
INSERT INTO tournaments (id, event_id, status, settings, type, team_formation) VALUES
(tournament1_id, event1_id, 'CREATED', '{"groupSize": 4, "qualifiersPerGroup": 2, "eliminationFormat": "single"}', 'TOURNAMENT', 'FORMED');

-- TOURNAMENT MATCHES (Example Match)
-- Note: team1/team2 arrays contain participant IDs. For formed teams, both partners should be in the array.
INSERT INTO tournament_matches (id, tournament_id, event_id, stage, group_number, round, position, team1, team2, scheduled_time, court_id) VALUES
(match1_id, tournament1_id, event1_id, 'GROUP', 1, 1, 1, ARRAY[participant1_id, participant2_id], ARRAY[participant7_id, participant8_id], '2025-05-15 09:30:00', court1_id),
(match2_id, tournament1_id, event1_id, 'GROUP', 1, 1, 2, ARRAY[participant3_id, participant4_id], ARRAY[participant9_id, participant10_id], '2025-05-15 09:30:00', court3_id); -- Placeholder teams

-- COURT RESERVATIONS (Link to matches)
INSERT INTO court_reservations (id, court_id, event_id, match_id, title, start_time, end_time, status) VALUES
(reservation1_id, court1_id, event1_id, match1_id, 'Torneio BT - Grupo 1 - Jogo 1', '2025-05-15 09:30:00', '2025-05-15 10:30:00', 'CONFIRMED'),
(reservation2_id, court3_id, event1_id, match2_id, 'Torneio BT - Grupo 1 - Jogo 2', '2025-05-15 09:30:00', '2025-05-15 10:30:00', 'CONFIRMED');

-- Update tournament_matches with court_reservation_id
UPDATE tournament_matches SET court_reservation_id = reservation1_id WHERE id = match1_id;
UPDATE tournament_matches SET court_reservation_id = reservation2_id WHERE id = match2_id;

-- PARTICIPANT RESULTS (Example Result)
INSERT INTO participant_results (participant_id, tournament_id, event_id, position, stage, points, notes) VALUES
(participant1_id, tournament1_id, event1_id, NULL, 'GROUP', NULL, 'Aguardando início'),
(participant2_id, tournament1_id, event1_id, NULL, 'GROUP', NULL, 'Aguardando início'),
(participant7_id, tournament1_id, event1_id, NULL, 'GROUP', NULL, 'Aguardando início'),
(participant8_id, tournament1_id, event1_id, NULL, 'GROUP', NULL, 'Aguardando início');

-- FINANCIAL TRANSACTIONS
INSERT INTO financial_transactions (id, event_id, participant_id, amount, type, description, payment_method, status) VALUES
(transaction1_id, event1_id, participant1_id, 50.00, 'INCOME', 'Inscrição Torneio BT - Carlos Silva', 'PIX', 'CONFIRMED'),
(transaction2_id, event1_id, participant2_id, 50.00, 'INCOME', 'Inscrição Torneio BT - Ana Pereira', 'PIX', 'CONFIRMED'),
(transaction3_id, event2_id, participant5_id, 30.00, 'INCOME', 'Inscrição Pool Padel - Ricardo Alves', 'CARD', 'CONFIRMED'),
-- Additional Transactions for new participants
(uuid_generate_v4(), event1_id, participant7_id, 50.00, 'INCOME', 'Inscrição Torneio BT - Gabriel Souza', 'CARD', 'CONFIRMED'),
(uuid_generate_v4(), event1_id, participant8_id, 50.00, 'INCOME', 'Inscrição Torneio BT - Laura Martins', 'CARD', 'CONFIRMED'),
(uuid_generate_v4(), event2_id, participant11_id, 30.00, 'INCOME', 'Inscrição Pool Padel - Marcos Oliveira', 'PIX', 'CONFIRMED'),
(uuid_generate_v4(), event2_id, participant12_id, 30.00, 'INCOME', 'Inscrição Pool Padel - Camila Ribeiro', 'PIX', 'CONFIRMED'),
(uuid_generate_v4(), event2_id, participant15_id, 30.00, 'INCOME', 'Inscrição Pool Padel - Thiago Azevedo', 'CASH', 'CONFIRMED'),
-- Expenses
(uuid_generate_v4(), event1_id, NULL, -150.00, 'EXPENSE', 'Compra de Bolas Wilson', 'CASH', 'CONFIRMED'),
(uuid_generate_v4(), event1_id, NULL, -300.00, 'EXPENSE', 'Premiação Troféus', 'PIX', 'CONFIRMED');

END $$;