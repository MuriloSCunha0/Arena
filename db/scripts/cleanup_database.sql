-- Arena Database Cleanup Script
-- WARNING: This script removes ALL data from the database tables
-- Always create a backup before running this script

-- Disable triggers temporarily to avoid issues during deletion
SET session_replication_role = 'replica';

-- ===== DELETE DATA FROM TABLES (SAFE ORDER) =====

-- Delete financial transactions first (no dependencies)
DELETE FROM financial_transactions;

-- Delete court reservations
DELETE FROM court_reservations;

-- Delete participant-related tables
DELETE FROM participant_eliminators;
DELETE FROM participant_results;

-- Delete tournament matches
DELETE FROM tournament_matches;

-- Delete tournaments
DELETE FROM tournaments;

-- Delete participants
DELETE FROM participants;

-- Delete event-related junction tables
DELETE FROM event_organizers;
DELETE FROM event_courts;

-- Delete events
DELETE FROM events;

-- Delete base tables
DELETE FROM courts;
DELETE FROM organizers;

-- CAUTION: Only delete users data if absolutely needed (Auth will be affected)
-- If you need to keep user authentication, DON'T uncomment this line
-- DELETE FROM users;

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Vacuum the database to reclaim space
VACUUM FULL;

-- Output success message
DO $$
BEGIN
    RAISE NOTICE 'Database cleanup completed successfully.';
END $$;
