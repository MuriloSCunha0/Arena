-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';

-- DROP TYPE public."court_status";

CREATE TYPE public."court_status" AS ENUM (
	'AVAILABLE',
	'OCCUPIED',
	'MAINTENANCE',
	'INACTIVE');

-- DROP TYPE public."court_type";

CREATE TYPE public."court_type" AS ENUM (
	'PADEL',
	'BEACH_TENNIS',
	'TENNIS',
	'FUTSAL',
	'VOLLEYBALL',
	'OTHER');

-- DROP TYPE public."event_status";

CREATE TYPE public."event_status" AS ENUM (
	'DRAFT',
	'PUBLISHED',
	'OPEN',
	'CLOSED',
	'IN_PROGRESS',
	'COMPLETED',
	'CANCELLED');

-- DROP TYPE public."event_type";

CREATE TYPE public."event_type" AS ENUM (
	'TOURNAMENT',
	'POOL',
	'FRIENDLY',
	'CHAMPIONSHIP');

-- DROP TYPE public.gtrgm;

CREATE TYPE public.gtrgm (
	INPUT = gtrgm_in,
	OUTPUT = gtrgm_out,
	ALIGNMENT = 4,
	STORAGE = plain,
	CATEGORY = U,
	DELIMITER = ',');

-- DROP TYPE public."invite_status";

CREATE TYPE public."invite_status" AS ENUM (
	'PENDING',
	'ACCEPTED',
	'DECLINED',
	'EXPIRED');

-- DROP TYPE public."match_stage";

CREATE TYPE public."match_stage" AS ENUM (
	'GROUP',
	'ROUND_OF_32',
	'ROUND_OF_16',
	'QUARTER_FINALS',
	'SEMI_FINALS',
	'THIRD_PLACE',
	'FINALS',
	'ELIMINATION');

-- DROP TYPE public."match_status";

CREATE TYPE public."match_status" AS ENUM (
	'SCHEDULED',
	'IN_PROGRESS',
	'COMPLETED',
	'CANCELLED',
	'WALKOVER',
	'FORFEIT');

-- DROP TYPE public."notification_type";

CREATE TYPE public."notification_type" AS ENUM (
	'info',
	'success',
	'warning',
	'error',
	'payment',
	'match',
	'event');

-- DROP TYPE public."payment_method";

CREATE TYPE public."payment_method" AS ENUM (
	'PIX',
	'CREDIT_CARD',
	'DEBIT_CARD',
	'CASH',
	'BANK_TRANSFER',
	'OTHER');

-- DROP TYPE public."payment_status";

CREATE TYPE public."payment_status" AS ENUM (
	'PENDING',
	'CONFIRMED',
	'CANCELLED',
	'REFUNDED',
	'EXPIRED');

-- DROP TYPE public."reservation_status";

CREATE TYPE public."reservation_status" AS ENUM (
	'CONFIRMED',
	'PENDING',
	'CANCELLED');

-- DROP TYPE public."team_formation_type";

CREATE TYPE public."team_formation_type" AS ENUM (
	'FORMED',
	'RANDOM',
	'DRAFT');

-- DROP TYPE public."tournament_format";

CREATE TYPE public."tournament_format" AS ENUM (
	'SINGLE_ELIMINATION',
	'DOUBLE_ELIMINATION',
	'ROUND_ROBIN',
	'SWISS',
	'GROUP_STAGE_ELIMINATION');

-- DROP TYPE public."transaction_type";

CREATE TYPE public."transaction_type" AS ENUM (
	'INCOME',
	'EXPENSE',
	'REFUND',
	'COMMISSION');

-- DROP TYPE public."user_status";

CREATE TYPE public."user_status" AS ENUM (
	'ACTIVE',
	'INACTIVE',
	'SUSPENDED');
-- public.courts definição

-- Drop table

-- DROP TABLE courts;

CREATE TABLE courts (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	description text NULL,
	"location" varchar(255) NOT NULL,
	address jsonb DEFAULT '{}'::jsonb NULL,
	"type" public."court_type" DEFAULT 'BEACH_TENNIS'::court_type NULL,
	surface varchar(100) NULL,
	indoor bool DEFAULT false NULL,
	lighting bool DEFAULT true NULL,
	length_meters numeric(5, 2) NULL,
	width_meters numeric(5, 2) NULL,
	status public."court_status" DEFAULT 'AVAILABLE'::court_status NULL,
	active bool DEFAULT true NULL,
	image_url text NULL,
	images jsonb DEFAULT '[]'::jsonb NULL,
	hourly_rate numeric(10, 2) DEFAULT 0 NULL,
	settings jsonb DEFAULT '{}'::jsonb NULL,
	equipment jsonb DEFAULT '[]'::jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT courts_pkey PRIMARY KEY (id)
);

-- Table Triggers

create trigger update_courts_updated_at before
update
    on
    public.courts for each row execute function update_updated_at_column();


-- public.organizers definição

-- Drop table

-- DROP TABLE organizers;

CREATE TABLE organizers (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	"name" varchar(255) NOT NULL,
	description text NULL,
	phone varchar(20) NOT NULL,
	email varchar(255) NULL,
	website varchar(255) NULL,
	pix_key varchar(255) NULL,
	bank_details jsonb DEFAULT '{}'::jsonb NULL,
	default_commission_rate numeric(5, 2) DEFAULT 10.00 NULL,
	settings jsonb DEFAULT '{}'::jsonb NULL,
	active bool DEFAULT true NULL,
	verified bool DEFAULT false NULL,
	address jsonb DEFAULT '{}'::jsonb NULL,
	logo_url text NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT organizers_commission_valid CHECK (((default_commission_rate >= (0)::numeric) AND (default_commission_rate <= (100)::numeric))),
	CONSTRAINT organizers_pkey PRIMARY KEY (id)
);
CREATE INDEX idx_organizers_active ON public.organizers USING btree (active);
CREATE INDEX idx_organizers_name_trgm ON public.organizers USING gin (name gin_trgm_ops);

-- Table Triggers

create trigger update_organizers_updated_at before
update
    on
    public.organizers for each row execute function update_updated_at_column();


-- public.users definição

-- Drop table

-- DROP TABLE users;

CREATE TABLE users (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	email varchar(255) NOT NULL,
	"password" varchar(255) NULL,
	full_name varchar(255) NOT NULL,
	phone varchar(20) NULL,
	cpf text NULL,
	birth_date date NULL,
	gender varchar(20) NULL,
	address jsonb DEFAULT '{}'::jsonb NULL,
	user_metadata jsonb DEFAULT '{}'::jsonb NULL,
	app_metadata jsonb DEFAULT '{"role": "user"}'::jsonb NULL,
	preferences jsonb DEFAULT '{}'::jsonb NULL,
	tournaments_history jsonb DEFAULT '[]'::jsonb NULL,
	"statistics" jsonb DEFAULT '{}'::jsonb NULL,
	status public."user_status" DEFAULT 'ACTIVE'::user_status NULL,
	email_verified bool DEFAULT false NULL,
	phone_verified bool DEFAULT false NULL,
	last_login timestamptz NULL,
	avatar_url text NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT users_birth_date_valid CHECK (((birth_date IS NULL) OR ((birth_date <= CURRENT_DATE) AND (birth_date >= '1900-01-01'::date)))),
	CONSTRAINT users_cpf_format CHECK (((cpf IS NULL) OR (cpf ~* '^\d{3}\.\d{3}\.\d{3}-\d{2}$'::text))),
	CONSTRAINT users_cpf_key UNIQUE (cpf),
	CONSTRAINT users_email_key UNIQUE (email),
	CONSTRAINT users_email_valid CHECK (((email)::text ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)),
	CONSTRAINT users_phone_format CHECK (((phone IS NULL) OR ((phone)::text ~* '^\(\d{2}\) \d{4,5}-\d{4}$'::text))),
	CONSTRAINT users_pkey PRIMARY KEY (id)
);

-- Table Triggers

create trigger update_users_updated_at before
update
    on
    public.users for each row execute function update_updated_at_column();


-- public.events definição

-- Drop table

-- DROP TABLE events;

CREATE TABLE events (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	title varchar(255) NOT NULL,
	description text NULL,
	"type" public."event_type" NOT NULL,
	"tournament_format" public."tournament_format" DEFAULT 'SINGLE_ELIMINATION'::tournament_format NULL,
	team_formation public."team_formation_type" NOT NULL,
	max_participants int4 NOT NULL,
	min_participants int4 DEFAULT 4 NULL,
	current_participants int4 DEFAULT 0 NULL,
	categories _text DEFAULT '{}'::text[] NULL,
	age_restrictions jsonb DEFAULT '{}'::jsonb NULL,
	skill_level varchar(50) NULL,
	"location" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"time" time NOT NULL,
	end_date date NULL,
	end_time time NULL,
	entry_fee numeric(10, 2) DEFAULT 0 NULL,
	prize_pool numeric(10, 2) DEFAULT 0 NULL,
	prize_distribution jsonb DEFAULT '{}'::jsonb NULL,
	organizer_id uuid NULL,
	organizer_commission_rate numeric(5, 2) NULL,
	court_ids _uuid DEFAULT '{}'::uuid[] NULL,
	rules text NULL,
	additional_info jsonb DEFAULT '{}'::jsonb NULL,
	banner_image_url text NULL,
	images jsonb DEFAULT '[]'::jsonb NULL,
	settings jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT events_commission_valid CHECK (((organizer_commission_rate IS NULL) OR ((organizer_commission_rate >= (0)::numeric) AND (organizer_commission_rate <= (100)::numeric)))),
	CONSTRAINT events_current_participants_valid CHECK (((current_participants >= 0) AND (current_participants <= max_participants))),
	CONSTRAINT events_dates_valid CHECK (((end_date IS NULL) OR (end_date >= date))),
	CONSTRAINT events_entry_fee_valid CHECK ((entry_fee >= (0)::numeric)),
	CONSTRAINT events_participants_positive CHECK (((max_participants > 0) AND (min_participants > 0))),
	CONSTRAINT events_participants_valid CHECK ((max_participants >= min_participants)),
	CONSTRAINT events_pkey PRIMARY KEY (id),
	CONSTRAINT events_prize_pool_valid CHECK ((prize_pool >= (0)::numeric)),
	CONSTRAINT events_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES organizers(id)
);

-- Table Triggers

create trigger update_events_updated_at before
update
    on
    public.events for each row execute function update_updated_at_column();


-- public.files definição

-- Drop table

-- DROP TABLE files;

CREATE TABLE files (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	filename text NOT NULL,
	original_filename text NOT NULL,
	"path" text NOT NULL,
	"size" int8 NOT NULL,
	mimetype text NOT NULL,
	content_type text NULL,
	user_id uuid NULL,
	event_id uuid NULL,
	is_public bool DEFAULT false NULL,
	bucket varchar(100) DEFAULT 'default'::character varying NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT files_pkey PRIMARY KEY (id),
	CONSTRAINT files_size_positive CHECK ((size > 0)),
	CONSTRAINT files_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
	CONSTRAINT files_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table Triggers

create trigger update_files_updated_at before
update
    on
    public.files for each row execute function update_updated_at_column();


-- public.participants definição

-- Drop table

-- DROP TABLE participants;

CREATE TABLE participants (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_id uuid NOT NULL,
	user_id uuid NULL,
	"name" varchar(255) NOT NULL,
	email varchar(255) NULL,
	phone varchar(20) NOT NULL,
	cpf varchar(14) NOT NULL,
	birth_date date NULL,
	partner_id uuid NULL,
	partner_name varchar(255) NULL,
	team_name varchar(255) NULL,
	seed_number int4 NULL,
	category varchar(100) NULL,
	skill_level varchar(50) NULL,
	payment_id varchar(255) NULL,
	payment_date timestamptz NULL,
	payment_amount numeric(10, 2) NULL,
	pix_payment_code text NULL,
	pix_qrcode_url text NULL,
	final_position int4 NULL,
	eliminated_in_round varchar(100) NULL,
	points_scored int4 DEFAULT 0 NULL,
	points_against int4 DEFAULT 0 NULL,
	matches_played int4 DEFAULT 0 NULL,
	matches_won int4 DEFAULT 0 NULL,
	matches_lost int4 DEFAULT 0 NULL,
	sets_won int4 DEFAULT 0 NULL,
	sets_lost int4 DEFAULT 0 NULL,
	registration_notes text NULL,
	medical_notes text NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	registered_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	"payment_status" public."payment_status" DEFAULT 'PENDING'::payment_status NOT NULL,
	"payment_method" public."payment_method" NULL,
	CONSTRAINT participants_cpf_format CHECK (((cpf)::text ~* '^\d{3}\.\d{3}\.\d{3}-\d{2}$'::text)),
	CONSTRAINT participants_event_cpf_unique UNIQUE (event_id, cpf),
	CONSTRAINT participants_event_phone_unique UNIQUE (event_id, phone),
	CONSTRAINT participants_payment_amount_valid CHECK (((payment_amount IS NULL) OR (payment_amount >= (0)::numeric))),
	CONSTRAINT participants_phone_format CHECK (((phone)::text ~* '^\(\d{2}\) \d{4,5}-\d{4}$'::text)),
	CONSTRAINT participants_pkey PRIMARY KEY (id),
	CONSTRAINT participants_position_positive CHECK (((final_position IS NULL) OR (final_position > 0))),
	CONSTRAINT participants_seed_positive CHECK (((seed_number IS NULL) OR (seed_number > 0))),
	CONSTRAINT participants_stats_valid CHECK (((matches_played >= 0) AND (matches_won >= 0) AND (matches_lost >= 0) AND ((matches_won + matches_lost) <= matches_played) AND (sets_won >= 0) AND (sets_lost >= 0) AND (points_scored >= 0) AND (points_against >= 0))),
	CONSTRAINT participants_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
	CONSTRAINT participants_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES participants(id),
	CONSTRAINT participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table Triggers

create trigger update_event_participant_count_trigger after
insert
    or
delete
    on
    public.participants for each row execute function update_event_participant_count();
create trigger update_participants_updated_at before
update
    on
    public.participants for each row execute function update_updated_at_column();


-- public.partner_invites definição

-- Drop table

-- DROP TABLE partner_invites;

CREATE TABLE partner_invites (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	sender_id uuid NOT NULL, -- ID do usuário que enviou o convite
	receiver_id uuid NOT NULL, -- ID do usuário que recebeu o convite
	event_id uuid NOT NULL, -- ID do evento para o qual o convite foi enviado
	status public."invite_status" DEFAULT 'PENDING'::invite_status NOT NULL,
	expires_at timestamptz NOT NULL, -- Data e hora de expiração do convite
	message text NULL, -- Mensagem opcional enviada com o convite
	created_at timestamptz DEFAULT now() NOT NULL,
	updated_at timestamptz DEFAULT now() NOT NULL,
	CONSTRAINT partner_invites_different_users CHECK ((sender_id <> receiver_id)),
	CONSTRAINT partner_invites_expires_future CHECK ((expires_at > created_at)),
	CONSTRAINT partner_invites_pkey PRIMARY KEY (id),
	CONSTRAINT partner_invites_unique_active UNIQUE (sender_id, receiver_id, event_id),
	CONSTRAINT partner_invites_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
	CONSTRAINT partner_invites_receiver_id_fkey FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
	CONSTRAINT partner_invites_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_partner_invites_event ON public.partner_invites USING btree (event_id);
CREATE INDEX idx_partner_invites_expires_at ON public.partner_invites USING btree (expires_at);
CREATE INDEX idx_partner_invites_receiver ON public.partner_invites USING btree (receiver_id);
CREATE INDEX idx_partner_invites_sender ON public.partner_invites USING btree (sender_id);
CREATE INDEX idx_partner_invites_status ON public.partner_invites USING btree (status);
COMMENT ON TABLE public.partner_invites IS 'Tabela para gerenciar convites de dupla entre participantes de eventos';

-- Column comments

COMMENT ON COLUMN public.partner_invites.sender_id IS 'ID do usuário que enviou o convite';
COMMENT ON COLUMN public.partner_invites.receiver_id IS 'ID do usuário que recebeu o convite';
COMMENT ON COLUMN public.partner_invites.event_id IS 'ID do evento para o qual o convite foi enviado';
COMMENT ON COLUMN public.partner_invites.expires_at IS 'Data e hora de expiração do convite';
COMMENT ON COLUMN public.partner_invites.message IS 'Mensagem opcional enviada com o convite';

-- Table Triggers

create trigger update_partner_invites_updated_at before
update
    on
    public.partner_invites for each row execute function update_updated_at_column();


-- public.tournaments definição

-- Drop table

-- DROP TABLE tournaments;

CREATE TABLE tournaments (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_id uuid NOT NULL,
	format public."tournament_format" NOT NULL, -- Formato do torneio seguindo enum tournament_format
	settings jsonb DEFAULT '{"groupSize": 4, "qualifiersPerGroup": 2}'::jsonb NULL,
	status varchar(50) DEFAULT 'CREATED'::character varying NULL,
	total_rounds int4 NULL,
	current_round int4 DEFAULT 0 NULL,
	groups_count int4 DEFAULT 0 NULL,
	groups_data jsonb DEFAULT '{}'::jsonb NULL,
	brackets_data jsonb DEFAULT '{}'::jsonb NULL,
	third_place_match bool DEFAULT true NULL,
	auto_advance bool DEFAULT false NULL,
	started_at timestamptz NULL,
	completed_at timestamptz NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	team_formation public."team_formation_type" DEFAULT 'FORMED'::team_formation_type NULL,
	"type" public."tournament_format" DEFAULT 'GROUP_STAGE_ELIMINATION'::tournament_format NULL,
	matches_data jsonb DEFAULT '[]'::jsonb NULL, -- Array de objetos contendo todas as partidas do torneio
	teams_data jsonb DEFAULT '[]'::jsonb NULL, -- Array de objetos contendo informações das equipes/duplas
	standings_data jsonb DEFAULT '{}'::jsonb NULL, -- Objeto contendo classificações por grupo e geral
	elimination_bracket jsonb DEFAULT '{}'::jsonb NULL, -- Objeto contendo estrutura das eliminatórias
	stage varchar NULL,
	CONSTRAINT tournaments_current_round_valid CHECK (((current_round >= 0) AND ((total_rounds IS NULL) OR (current_round <= total_rounds)))),
	CONSTRAINT tournaments_event_id_key UNIQUE (event_id),
	CONSTRAINT tournaments_groups_valid CHECK ((groups_count >= 0)),
	CONSTRAINT tournaments_pkey PRIMARY KEY (id),
	CONSTRAINT tournaments_rounds_valid CHECK (((total_rounds IS NULL) OR (total_rounds > 0))),
	CONSTRAINT tournaments_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
CREATE INDEX idx_tournaments_matches_data ON public.tournaments USING gin (matches_data);
CREATE INDEX idx_tournaments_standings_data ON public.tournaments USING gin (standings_data);
CREATE INDEX idx_tournaments_team_formation ON public.tournaments USING btree (team_formation);
CREATE INDEX idx_tournaments_teams_data ON public.tournaments USING gin (teams_data);

-- Column comments

COMMENT ON COLUMN public.tournaments.format IS 'Formato do torneio seguindo enum tournament_format';
COMMENT ON COLUMN public.tournaments.matches_data IS 'Array de objetos contendo todas as partidas do torneio';
COMMENT ON COLUMN public.tournaments.teams_data IS 'Array de objetos contendo informações das equipes/duplas';
COMMENT ON COLUMN public.tournaments.standings_data IS 'Objeto contendo classificações por grupo e geral';
COMMENT ON COLUMN public.tournaments.elimination_bracket IS 'Objeto contendo estrutura das eliminatórias';

-- Table Triggers

create trigger update_tournaments_updated_at before
update
    on
    public.tournaments for each row execute function update_updated_at_column();


-- public.event_organizers definição

-- Drop table

-- DROP TABLE event_organizers;

CREATE TABLE event_organizers (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_id uuid NOT NULL,
	user_id uuid NOT NULL,
	"role" varchar(50) DEFAULT 'ASSISTANT'::character varying NULL,
	permissions jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT event_organizers_pkey PRIMARY KEY (id),
	CONSTRAINT event_organizers_unique UNIQUE (event_id, user_id),
	CONSTRAINT event_organizers_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
	CONSTRAINT event_organizers_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_event_organizers_event ON public.event_organizers USING btree (event_id);
CREATE INDEX idx_event_organizers_user ON public.event_organizers USING btree (user_id);

-- Table Triggers

create trigger update_event_organizers_updated_at before
update
    on
    public.event_organizers for each row execute function update_updated_at_column();


-- public.financial_transactions definição

-- Drop table

-- DROP TABLE financial_transactions;

CREATE TABLE financial_transactions (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_id uuid NOT NULL,
	participant_id uuid NULL,
	organizer_id uuid NULL,
	user_id uuid NULL,
	"type" public."transaction_type" NOT NULL,
	amount numeric(10, 2) NOT NULL,
	description text NOT NULL,
	payment_reference varchar(255) NULL,
	pix_key varchar(255) NULL,
	pix_qr_code text NULL,
	transaction_date timestamptz DEFAULT now() NULL,
	due_date timestamptz NULL,
	processed_at timestamptz NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT financial_transactions_pkey PRIMARY KEY (id),
	CONSTRAINT transactions_amount_valid CHECK ((amount <> (0)::numeric)),
	CONSTRAINT transactions_dates_valid CHECK (((due_date IS NULL) OR (due_date >= transaction_date))),
	CONSTRAINT financial_transactions_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
	CONSTRAINT financial_transactions_organizer_id_fkey FOREIGN KEY (organizer_id) REFERENCES organizers(id) ON DELETE SET NULL,
	CONSTRAINT financial_transactions_participant_id_fkey FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE SET NULL,
	CONSTRAINT financial_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table Triggers

create trigger update_transactions_updated_at before
update
    on
    public.financial_transactions for each row execute function update_updated_at_column();


-- public.matches definição

-- Drop table

-- DROP TABLE matches;

CREATE TABLE matches (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	event_id uuid NOT NULL,
	tournament_id uuid NULL,
	court_id uuid NULL,
	team1_ids _uuid NOT NULL,
	team2_ids _uuid NOT NULL,
	winner_team varchar(10) NULL,
	round_number int4 NOT NULL,
	match_number int4 NULL,
	group_number int4 NULL,
	team1_score int4 DEFAULT 0 NULL,
	team2_score int4 DEFAULT 0 NULL,
	sets_data jsonb DEFAULT '[]'::jsonb NULL,
	total_sets int4 DEFAULT 1 NULL,
	status public."match_status" DEFAULT 'SCHEDULED'::match_status NULL,
	scheduled_at timestamptz NULL,
	started_at timestamptz NULL,
	completed_at timestamptz NULL,
	duration_minutes int4 NULL,
	notes text NULL,
	referee varchar(255) NULL,
	metadata jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT matches_duration_valid CHECK (((duration_minutes IS NULL) OR (duration_minutes >= 0))),
	CONSTRAINT matches_pkey PRIMARY KEY (id),
	CONSTRAINT matches_round_positive CHECK ((round_number > 0)),
	CONSTRAINT matches_scores_valid CHECK (((team1_score >= 0) AND (team2_score >= 0))),
	CONSTRAINT matches_sets_valid CHECK ((total_sets > 0)),
	CONSTRAINT matches_teams_different CHECK ((team1_ids <> team2_ids)),
	CONSTRAINT matches_times_valid CHECK ((((started_at IS NULL) OR (scheduled_at IS NULL) OR (started_at >= scheduled_at)) AND ((completed_at IS NULL) OR (started_at IS NULL) OR (completed_at >= started_at)))),
	CONSTRAINT matches_winner_valid CHECK (((winner_team IS NULL) OR ((winner_team)::text = ANY (ARRAY[('team1'::character varying)::text, ('team2'::character varying)::text, ('draw'::character varying)::text])))),
	CONSTRAINT matches_court_id_fkey FOREIGN KEY (court_id) REFERENCES courts(id),
	CONSTRAINT matches_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
	CONSTRAINT matches_tournament_id_fkey FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Table Triggers

create trigger update_matches_updated_at before
update
    on
    public.matches for each row execute function update_updated_at_column();
create trigger update_participant_stats_trigger after
update
    on
    public.matches for each row execute function update_participant_stats();


-- public.notifications definição

-- Drop table

-- DROP TABLE notifications;

CREATE TABLE notifications (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	user_id uuid NULL,
	"type" public."notification_type" NOT NULL,
	title varchar(255) NOT NULL,
	message text NOT NULL,
	event_id uuid NULL,
	match_id uuid NULL,
	read_at timestamptz NULL,
	expires_at timestamptz NULL,
	priority int4 DEFAULT 1 NULL,
	action_url varchar(500) NULL,
	action_data jsonb DEFAULT '{}'::jsonb NULL,
	created_at timestamptz DEFAULT now() NULL,
	CONSTRAINT notifications_pkey PRIMARY KEY (id),
	CONSTRAINT notifications_priority_valid CHECK (((priority >= 1) AND (priority <= 5))),
	CONSTRAINT notifications_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
	CONSTRAINT notifications_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
	CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);


-- public.court_reservations definição

-- Drop table

-- DROP TABLE court_reservations;

CREATE TABLE court_reservations (
	id uuid DEFAULT uuid_generate_v4() NOT NULL,
	court_id uuid NOT NULL,
	event_id uuid NULL,
	match_id uuid NULL,
	user_id uuid NULL,
	title varchar(255) NOT NULL,
	description text NULL,
	start_time timestamptz NOT NULL,
	end_time timestamptz NOT NULL,
	"cost" numeric(10, 2) DEFAULT 0 NULL,
	paid bool DEFAULT false NULL,
	contact_name varchar(255) NULL,
	contact_phone varchar(20) NULL,
	contact_email varchar(255) NULL,
	notes text NULL,
	created_at timestamptz DEFAULT now() NULL,
	updated_at timestamptz DEFAULT now() NULL,
	CONSTRAINT court_reservations_pkey PRIMARY KEY (id),
	CONSTRAINT reservations_cost_valid CHECK ((cost >= (0)::numeric)),
	CONSTRAINT reservations_time_valid CHECK ((end_time > start_time)),
	CONSTRAINT court_reservations_court_id_fkey FOREIGN KEY (court_id) REFERENCES courts(id) ON DELETE CASCADE,
	CONSTRAINT court_reservations_event_id_fkey FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
	CONSTRAINT court_reservations_match_id_fkey FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE SET NULL,
	CONSTRAINT court_reservations_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Table Triggers

create trigger update_reservations_updated_at before
update
    on
    public.court_reservations for each row execute function update_updated_at_column();



-- DROP FUNCTION public.cleanup_expired_invites();

CREATE OR REPLACE FUNCTION public.cleanup_expired_invites()
 RETURNS void
 LANGUAGE plpgsql
AS $function$
BEGIN
    UPDATE partner_invites 
    SET status = 'EXPIRED'::invite_status
    WHERE status = 'PENDING'::invite_status 
    AND expires_at < NOW();
END;
$function$
;

-- DROP FUNCTION public.fix_data_inconsistencies(uuid);

CREATE OR REPLACE FUNCTION public.fix_data_inconsistencies(tournament_uuid uuid DEFAULT NULL::uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    fixes_applied INTEGER := 0;
    result_text TEXT := '';
BEGIN
    -- Corrigir partidas completadas sem winner_id
    UPDATE tournament_matches 
    SET winner_id = CASE 
        WHEN score1 > score2 THEN 'team1'
        WHEN score2 > score1 THEN 'team2'
        ELSE NULL
    END
    WHERE (tournament_uuid IS NULL OR tournament_id = tournament_uuid)
    AND completed = true 
    AND score1 IS NOT NULL 
    AND score2 IS NOT NULL 
    AND winner_id IS NULL;
    
    GET DIAGNOSTICS fixes_applied = ROW_COUNT;
    result_text := result_text || format('Corrigidos %s winner_ids em partidas completadas' || chr(10), fixes_applied);
    
    -- Corrigir partidas com scores mas não completadas
    UPDATE tournament_matches 
    SET completed = true
    WHERE (tournament_uuid IS NULL OR tournament_id = tournament_uuid)
    AND completed = false
    AND score1 IS NOT NULL 
    AND score2 IS NOT NULL;
    
    GET DIAGNOSTICS fixes_applied = ROW_COUNT;
    result_text := result_text || format('Marcadas como completadas %s partidas com scores' || chr(10), fixes_applied);
    
    -- Corrigir current_participants em eventos
    WITH participant_counts AS (
        SELECT 
            event_id,
            COUNT(*) as actual_count
        FROM participants 
        GROUP BY event_id
    )
    UPDATE events 
    SET current_participants = pc.actual_count
    FROM participant_counts pc
    WHERE events.id = pc.event_id 
    AND events.current_participants != pc.actual_count;
    
    GET DIAGNOSTICS fixes_applied = ROW_COUNT;
    result_text := result_text || format('Corrigidos %s contadores de participantes em eventos' || chr(10), fixes_applied);
    
    RETURN result_text || 'Correções aplicadas com sucesso!';
END;
$function$
;

COMMENT ON FUNCTION public.fix_data_inconsistencies(uuid) IS 'Corrige automaticamente inconsistências comuns nos dados de torneios';

-- DROP FUNCTION public.gin_extract_query_trgm(text, internal, int2, internal, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_extract_query_trgm(text, internal, smallint, internal, internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_query_trgm$function$
;

-- DROP FUNCTION public.gin_extract_value_trgm(text, internal);

CREATE OR REPLACE FUNCTION public.gin_extract_value_trgm(text, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_extract_value_trgm$function$
;

-- DROP FUNCTION public.gin_trgm_consistent(internal, int2, text, int4, internal, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_trgm_consistent(internal, smallint, text, integer, internal, internal, internal, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_consistent$function$
;

-- DROP FUNCTION public.gin_trgm_triconsistent(internal, int2, text, int4, internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gin_trgm_triconsistent(internal, smallint, text, integer, internal, internal, internal)
 RETURNS "char"
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gin_trgm_triconsistent$function$
;

-- DROP FUNCTION public.gtrgm_compress(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_compress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_compress$function$
;

-- DROP FUNCTION public.gtrgm_consistent(internal, text, int2, oid, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_consistent(internal, text, smallint, oid, internal)
 RETURNS boolean
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_consistent$function$
;

-- DROP FUNCTION public.gtrgm_decompress(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_decompress(internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_decompress$function$
;

-- DROP FUNCTION public.gtrgm_distance(internal, text, int2, oid, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_distance(internal, text, smallint, oid, internal)
 RETURNS double precision
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_distance$function$
;

-- DROP FUNCTION public.gtrgm_in(cstring);

CREATE OR REPLACE FUNCTION public.gtrgm_in(cstring)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_in$function$
;

-- DROP FUNCTION public.gtrgm_options(internal);

CREATE OR REPLACE FUNCTION public.gtrgm_options(internal)
 RETURNS void
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE
AS '$libdir/pg_trgm', $function$gtrgm_options$function$
;

-- DROP FUNCTION public.gtrgm_out(gtrgm);

CREATE OR REPLACE FUNCTION public.gtrgm_out(gtrgm)
 RETURNS cstring
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_out$function$
;

-- DROP FUNCTION public.gtrgm_penalty(internal, internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_penalty(internal, internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_penalty$function$
;

-- DROP FUNCTION public.gtrgm_picksplit(internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_picksplit(internal, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_picksplit$function$
;

-- DROP FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_same(gtrgm, gtrgm, internal)
 RETURNS internal
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_same$function$
;

-- DROP FUNCTION public.gtrgm_union(internal, internal);

CREATE OR REPLACE FUNCTION public.gtrgm_union(internal, internal)
 RETURNS gtrgm
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$gtrgm_union$function$
;

-- DROP FUNCTION public.maintain_data_consistency();

CREATE OR REPLACE FUNCTION public.maintain_data_consistency()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Para tournament_matches
    IF TG_TABLE_NAME = 'tournament_matches' THEN
        -- Ao completar uma partida, definir winner_id automaticamente
        IF NEW.completed = true AND OLD.completed = false AND NEW.score1 IS NOT NULL AND NEW.score2 IS NOT NULL THEN
            NEW.winner_id := CASE 
                WHEN NEW.score1 > NEW.score2 THEN 'team1'
                WHEN NEW.score2 > NEW.score1 THEN 'team2'
                ELSE NULL
            END;
        END IF;
        
        -- Se scores são definidos, marcar como completada
        IF NEW.score1 IS NOT NULL AND NEW.score2 IS NOT NULL AND NEW.completed = false THEN
            NEW.completed := true;
            NEW.winner_id := CASE 
                WHEN NEW.score1 > NEW.score2 THEN 'team1'
                WHEN NEW.score2 > NEW.score1 THEN 'team2'
                ELSE NULL
            END;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.migrate_matches_to_tournament_matches();

CREATE OR REPLACE FUNCTION public.migrate_matches_to_tournament_matches()
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    match_record RECORD;
    tournament_record RECORD;
BEGIN
    -- Para cada match que não tem correspondente em tournament_matches
    FOR match_record IN 
        SELECT m.* FROM matches m 
        WHERE NOT EXISTS (
            SELECT 1 FROM tournament_matches tm 
            WHERE tm.match_id = m.id
        )
    LOOP
        -- Buscar o torneio correspondente
        SELECT t.* INTO tournament_record 
        FROM tournaments t 
        WHERE t.event_id = match_record.event_id;
        
        IF tournament_record.id IS NOT NULL THEN
            -- Inserir na tabela tournament_matches
            INSERT INTO tournament_matches (
                tournament_id, event_id, round, position, team1, team2,
                score1, score2, winner_id, completed, court_id, scheduled_time,
                stage, group_number, match_id, created_at, updated_at
            ) VALUES (
                tournament_record.id,
                match_record.event_id,
                match_record.round_number,
                COALESCE(match_record.match_number, 0),
                match_record.team1_ids,
                match_record.team2_ids,
                match_record.team1_score,
                match_record.team2_score,
                match_record.winner_team,
                CASE WHEN match_record.status = 'COMPLETED' THEN true ELSE false END,
                match_record.court_id,
                match_record.scheduled_at,
                match_record.stage,
                match_record.group_number,
                match_record.id,
                match_record.created_at,
                match_record.updated_at
            );
        END IF;
    END LOOP;
    
    RETURN 'Migração concluída com sucesso!';
END;
$function$
;

-- DROP FUNCTION public.migrate_tournament_to_jsonb(uuid);

CREATE OR REPLACE FUNCTION public.migrate_tournament_to_jsonb(tournament_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    matches_json jsonb;
    teams_json jsonb;
BEGIN
    -- Migrar partidas para JSONB
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', id,
            'round', round,
            'position', position,
            'team1', team1,
            'team2', team2,
            'score1', score1,
            'score2', score2,
            'winnerId', winner_id,
            'completed', completed,
            'courtId', court_id,
            'scheduledTime', scheduled_time,
            'stage', stage,
            'groupNumber', group_number,
            'createdAt', created_at,
            'updatedAt', updated_at
        )
    ) INTO matches_json
    FROM tournament_matches
    WHERE tournament_id = tournament_uuid;

    -- Extrair equipes únicas
    WITH unique_teams AS (
        SELECT DISTINCT unnest(team1 || team2) as participant_id
        FROM tournament_matches
        WHERE tournament_id = tournament_uuid
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', ut.participant_id,
            'participants', ARRAY[ut.participant_id]
        )
    ) INTO teams_json
    FROM unique_teams ut;

    -- Atualizar torneio com dados JSONB
    UPDATE tournaments 
    SET 
        matches_data = COALESCE(matches_json, '[]'::jsonb),
        teams_data = COALESCE(teams_json, '[]'::jsonb)
    WHERE id = tournament_uuid;

    RAISE NOTICE 'Migração concluída para torneio %', tournament_uuid;
END;
$function$
;

-- DROP FUNCTION public.set_limit(float4);

CREATE OR REPLACE FUNCTION public.set_limit(real)
 RETURNS real
 LANGUAGE c
 STRICT
AS '$libdir/pg_trgm', $function$set_limit$function$
;

-- DROP FUNCTION public.show_limit();

CREATE OR REPLACE FUNCTION public.show_limit()
 RETURNS real
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_limit$function$
;

-- DROP FUNCTION public.show_trgm(text);

CREATE OR REPLACE FUNCTION public.show_trgm(text)
 RETURNS text[]
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$show_trgm$function$
;

-- DROP FUNCTION public.similarity(text, text);

CREATE OR REPLACE FUNCTION public.similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity$function$
;

-- DROP FUNCTION public.similarity_dist(text, text);

CREATE OR REPLACE FUNCTION public.similarity_dist(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_dist$function$
;

-- DROP FUNCTION public.similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$similarity_op$function$
;

-- DROP FUNCTION public.strict_word_similarity(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity$function$
;

-- DROP FUNCTION public.strict_word_similarity_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_commutator_op$function$
;

-- DROP FUNCTION public.strict_word_similarity_dist_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_commutator_op$function$
;

-- DROP FUNCTION public.strict_word_similarity_dist_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_dist_op$function$
;

-- DROP FUNCTION public.strict_word_similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.strict_word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$strict_word_similarity_op$function$
;

-- DROP FUNCTION public.update_event_participant_count();

CREATE OR REPLACE FUNCTION public.update_event_participant_count()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE events 
        SET current_participants = current_participants + 1
        WHERE id = NEW.event_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE events 
        SET current_participants = current_participants - 1
        WHERE id = OLD.event_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$
;

-- DROP FUNCTION public.update_match_score(uuid, int4, int4, text);

CREATE OR REPLACE FUNCTION public.update_match_score(match_id uuid, team1_score integer, team2_score integer, winner text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  updated_match JSON;
  match_exists BOOLEAN := FALSE;
BEGIN
  -- Check if match exists
  SELECT EXISTS(SELECT 1 FROM tournament_matches WHERE id = match_id) INTO match_exists;
  
  IF NOT match_exists THEN
    RAISE EXCEPTION 'Match with ID % not found', match_id;
  END IF;
  
  -- Update the match
  UPDATE tournament_matches 
  SET 
    score1 = team1_score,
    score2 = team2_score,
    winner_id = winner,
    completed = true,
    updated_at = NOW()
  WHERE id = match_id;
  
  -- Check if update was successful
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Failed to update match with ID %', match_id;
  END IF;
  
  -- Get the updated match data
  SELECT row_to_json(t) INTO updated_match
  FROM (
    SELECT 
      id,
      event_id,
      tournament_id,
      round,
      position,
      team1,
      team2,
      score1,
      score2,
      winner_id,
      completed,
      scheduled_time,
      court_id,
      stage,
      group_number,
      created_at,
      updated_at
    FROM tournament_matches 
    WHERE id = match_id
  ) t;
  
  RETURN updated_match;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error updating match: %', SQLERRM;
END;
$function$
;

-- DROP FUNCTION public.update_participant_stats();

CREATE OR REPLACE FUNCTION public.update_participant_stats()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    team1_participant_ids uuid[];
    team2_participant_ids uuid[];
BEGIN
    -- Só atualizar quando a partida for completada
    IF NEW.status = 'COMPLETED' AND (OLD.status IS NULL OR OLD.status != 'COMPLETED') THEN
        
        -- Extrair IDs dos participantes dos arrays
        team1_participant_ids := NEW.team1_ids;
        team2_participant_ids := NEW.team2_ids;
        
        -- Atualizar estatísticas do time 1
        UPDATE participants 
        SET 
            matches_played = matches_played + 1,
            matches_won = matches_won + CASE WHEN NEW.winner_team = 'team1' THEN 1 ELSE 0 END,
            matches_lost = matches_lost + CASE WHEN NEW.winner_team != 'team1' AND NEW.winner_team IS NOT NULL THEN 1 ELSE 0 END,
            points_scored = points_scored + NEW.team1_score,
            points_against = points_against + NEW.team2_score
        WHERE id = ANY(team1_participant_ids);
        
        -- Atualizar estatísticas do time 2
        UPDATE participants 
        SET 
            matches_played = matches_played + 1,
            matches_won = matches_won + CASE WHEN NEW.winner_team = 'team2' THEN 1 ELSE 0 END,
            matches_lost = matches_lost + CASE WHEN NEW.winner_team != 'team2' AND NEW.winner_team IS NOT NULL THEN 1 ELSE 0 END,
            points_scored = points_scored + NEW.team2_score,
            points_against = points_against + NEW.team1_score
        WHERE id = ANY(team2_participant_ids);
        
    END IF;
    
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$
;

-- DROP FUNCTION public.validate_tournament_data_integrity(uuid);

CREATE OR REPLACE FUNCTION public.validate_tournament_data_integrity(tournament_uuid uuid DEFAULT NULL::uuid)
 RETURNS TABLE(table_name text, issue_type text, issue_count integer, description text)
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Verificar partidas com teams inválidos
    RETURN QUERY
    SELECT 
        'tournament_matches'::TEXT,
        'invalid_teams'::TEXT,
        COUNT(*)::INTEGER,
        'Partidas com arrays de teams vazios ou nulos'::TEXT
    FROM tournament_matches tm
    WHERE (tournament_uuid IS NULL OR tm.tournament_id = tournament_uuid)
    AND (array_length(tm.team1, 1) IS NULL OR array_length(tm.team2, 1) IS NULL);
    
    -- Verificar partidas completadas sem scores
    RETURN QUERY
    SELECT 
        'tournament_matches'::TEXT,
        'missing_scores'::TEXT,
        COUNT(*)::INTEGER,
        'Partidas marcadas como completadas mas sem scores'::TEXT
    FROM tournament_matches tm
    WHERE (tournament_uuid IS NULL OR tm.tournament_id = tournament_uuid)
    AND tm.completed = true
    AND (tm.score1 IS NULL OR tm.score2 IS NULL);
    
    -- Verificar partidas com scores mas não completadas
    RETURN QUERY
    SELECT 
        'tournament_matches'::TEXT,
        'incomplete_with_scores'::TEXT,
        COUNT(*)::INTEGER,
        'Partidas com scores mas não marcadas como completadas'::TEXT
    FROM tournament_matches tm
    WHERE (tournament_uuid IS NULL OR tm.tournament_id = tournament_uuid)
    AND tm.completed = false
    AND tm.score1 IS NOT NULL 
    AND tm.score2 IS NOT NULL;
    
    -- Verificar eventos com participantes além do limite
    RETURN QUERY
    SELECT 
        'events'::TEXT,
        'participant_overflow'::TEXT,
        COUNT(*)::INTEGER,
        'Eventos com mais participantes que o máximo permitido'::TEXT
    FROM events e
    WHERE e.current_participants > e.max_participants;
    
    -- Verificar torneios órfãos (sem evento)
    RETURN QUERY
    SELECT 
        'tournaments'::TEXT,
        'orphaned_tournaments'::TEXT,
        COUNT(*)::INTEGER,
        'Torneios sem evento associado'::TEXT
    FROM tournaments t
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = t.event_id);
    
    -- Verificar participantes órfãos (sem evento)
    RETURN QUERY
    SELECT 
        'participants'::TEXT,
        'orphaned_participants'::TEXT,
        COUNT(*)::INTEGER,
        'Participantes sem evento associado'::TEXT
    FROM participants p
    WHERE NOT EXISTS (SELECT 1 FROM events e WHERE e.id = p.event_id);
END;
$function$
;

COMMENT ON FUNCTION public.validate_tournament_data_integrity(uuid) IS 'Valida integridade dos dados de torneios e retorna relatório de problemas encontrados';

-- DROP FUNCTION public.word_similarity(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity$function$
;

-- DROP FUNCTION public.word_similarity_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_commutator_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_commutator_op$function$
;

-- DROP FUNCTION public.word_similarity_dist_commutator_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_dist_commutator_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_commutator_op$function$
;

-- DROP FUNCTION public.word_similarity_dist_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_dist_op(text, text)
 RETURNS real
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_dist_op$function$
;

-- DROP FUNCTION public.word_similarity_op(text, text);

CREATE OR REPLACE FUNCTION public.word_similarity_op(text, text)
 RETURNS boolean
 LANGUAGE c
 STABLE PARALLEL SAFE STRICT
AS '$libdir/pg_trgm', $function$word_similarity_op$function$
;