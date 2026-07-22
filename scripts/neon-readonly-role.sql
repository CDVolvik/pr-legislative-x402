-- ============================================================================
-- pr-legislative-x402 — read-only Neon role for the CivicaPR bills corpus
-- ----------------------------------------------------------------------------
-- Run this ONCE, as the database OWNER, in the CivicaPR Neon project
-- (Neon Console → SQL Editor, or psql against the NON-pooled admin endpoint).
--
-- Goal: the x402 API connects with a role that can SELECT the three tables it
-- serves and NOTHING else — no writes, no other tables, no DDL. Defense in
-- depth: the app code only issues SELECTs, and the credential can only SELECT.
--
-- After running, build DATABASE_URL from the POOLED endpoint (…-pooler…) so it
-- matches the @neondatabase/serverless driver:
--   postgresql://bills_readonly:<PW>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require
-- ============================================================================

-- 1) Create the login role. Replace the password with a strong secret.
--    (Neon: you can also create the role in the Console → Roles and skip this.)
CREATE ROLE bills_readonly WITH LOGIN PASSWORD 'REPLACE_WITH_A_STRONG_PASSWORD';

-- 2) Let it reach the database + schema (adjust db name if not 'neondb').
GRANT CONNECT ON DATABASE neondb TO bills_readonly;
GRANT USAGE  ON SCHEMA public   TO bills_readonly;

-- 3) Grant SELECT on ONLY the tables the API reads. Nothing else.
GRANT SELECT ON TABLE public.bills          TO bills_readonly;
GRANT SELECT ON TABLE public.bill_sponsors  TO bills_readonly;
GRANT SELECT ON TABLE public.bill_actions   TO bills_readonly;

-- 4) Belt-and-suspenders: make sure it can't create objects or auto-inherit
--    grants on tables created in the future.
REVOKE CREATE ON SCHEMA public FROM bills_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM bills_readonly;

-- ============================================================================
-- VERIFY (connect AS bills_readonly, then run these):
--
--   SELECT count(*) FROM bills;                 -- should work
--   INSERT INTO bills(identifier) VALUES ('x'); -- should FAIL: permission denied
--   SELECT * FROM users LIMIT 1;                -- should FAIL if such a table
--                                                  exists and wasn't granted
-- ============================================================================

-- ROLLBACK (if you ever need to remove it):
--   REVOKE ALL ON ALL TABLES IN SCHEMA public FROM bills_readonly;
--   REVOKE ALL ON SCHEMA public FROM bills_readonly;
--   REVOKE ALL ON DATABASE neondb FROM bills_readonly;
--   DROP ROLE bills_readonly;
