CREATE TABLE IF NOT EXISTS users (
 id VARCHAR(36) PRIMARY KEY, email VARCHAR(254) NOT NULL, name VARCHAR(80) NOT NULL,
 password_hash VARCHAR(255) NOT NULL, timezone VARCHAR(80) NOT NULL, verified_at DATETIME NULL,
 created_at DATETIME NOT NULL, UNIQUE KEY users_email_unique (email)
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash VARCHAR(64) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, csrf VARCHAR(64) NOT NULL,
 expires_at DATETIME NOT NULL, INDEX sessions_user_idx (user_id), INDEX sessions_expiry_idx (expires_at)
);
CREATE TABLE IF NOT EXISTS auth_tokens (
 token_hash VARCHAR(64) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, kind VARCHAR(16) NOT NULL,
 expires_at DATETIME NOT NULL, INDEX auth_tokens_user_idx (user_id)
);
CREATE TABLE IF NOT EXISTS plans (
 id VARCHAR(36) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, week_start VARCHAR(10) NOT NULL,
 preferences JSON NOT NULL, revision INT NOT NULL, updated_at DATETIME NOT NULL,
 UNIQUE KEY plans_user_week_unique (user_id, week_start)
);
CREATE TABLE IF NOT EXISTS activities (
 id VARCHAR(36) NOT NULL, plan_id VARCHAR(36) NOT NULL, title VARCHAR(160) NOT NULL,
 instructions TEXT NOT NULL, topic VARCHAR(40) NOT NULL, kind VARCHAR(16) NOT NULL,
 local_start VARCHAR(16) NOT NULL, duration INT NOT NULL, PRIMARY KEY (plan_id, id), INDEX activities_plan_idx (plan_id)
);
CREATE TABLE IF NOT EXISTS templates (
 id VARCHAR(36) PRIMARY KEY, topic VARCHAR(40) NOT NULL, title VARCHAR(160) NOT NULL, instructions TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 bucket_key VARCHAR(64) PRIMARY KEY, hits INT NOT NULL, expires_at DATETIME NOT NULL,
 INDEX rate_limits_expiry_idx (expires_at)
);
