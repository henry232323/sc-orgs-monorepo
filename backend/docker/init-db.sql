-- Initialize PostgreSQL database for SC-Orgs
-- This script runs when the PostgreSQL container starts for the first time

-- Enable UUID extension for PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable gen_random_uuid function (available in PostgreSQL 13+)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create development database (already created by POSTGRES_DB env var, but ensuring it exists)
-- This is just for documentation purposes
-- CREATE DATABASE sc_orgs_dev;

-- Grant necessary permissions
GRANT ALL PRIVILEGES ON DATABASE sc_orgs_dev TO sc_orgs_user;

-- Set default search path
ALTER DATABASE sc_orgs_dev SET search_path TO public;

-- Create a test database for running tests
CREATE DATABASE sc_orgs_test;
GRANT ALL PRIVILEGES ON DATABASE sc_orgs_test TO sc_orgs_user;
