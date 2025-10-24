-- Test the database setup
-- Query to check all tables exist
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;

-- Insert test data
INSERT INTO users (id, email, password_hash)
VALUES ('test-user-1', 'test@example.com', 'test-hash');

INSERT INTO user_profiles (id, user_id, business_name, contact_email)
VALUES ('test-profile-1', 'test-user-1', 'Test Business', 'test@business.com');

INSERT INTO companies (id, user_id, name, invoice_prefix, invoice_count)
VALUES ('test-company-1', 'test-user-1', 'Test Company', 'TEST', 0);

-- Query test data
SELECT 'Users:' as table_name, count(*) as count FROM users
UNION ALL
SELECT 'Profiles:', count(*) FROM user_profiles
UNION ALL
SELECT 'Companies:', count(*) FROM companies;