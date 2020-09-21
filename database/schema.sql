DROP DATABASE IF EXISTS covid19;

CREATE DATABASE covid19;

GRANT ALL PRIVILEGES ON DATABASE covid19 TO postgres;

\c covid19;

CREATE UNLOGGED TABLE phone_numbers (
  country_code VARCHAR(3) NOT NULL CONSTRAINT check_country_code CHECK (country_code != '0' AND country_code ~* '^\d{1,3}$'),
  identification_code VARCHAR(4) NOT NULL CONSTRAINT check_identification_code CHECK (identification_code ~* '^\d{1,4}$'),
  subscriber_number VARCHAR(11) NOT NULL CONSTRAINT check_phone_number CHECK (subscriber_number ~* '^\d{1,11}$'),
  e164_format VARCHAR(16) PRIMARY KEY CONSTRAINT check_e164_format CHECK (e164_format ~* '^\+\d{3,15}$'),
  -- confirmation_code VARCHAR(255) NOT NULL CONSTRAINT check_confirmation_code CHECK (confirmation_code ~* '^[a-zA-Z0-9]+$'),
  subscription_status VARCHAR(10) NOT NULL CONSTRAINT check_registration_status CHECK (subscription_status ~* '^(pending|subscribed)$')
);

-- CREATE INDEX phone_numbers_confirmation_code_idx ON phone_numbers (confirmation_code);
