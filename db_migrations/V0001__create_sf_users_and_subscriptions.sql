CREATE TABLE IF NOT EXISTS sf_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sf_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES sf_users(id),
  plan VARCHAR(50) NOT NULL DEFAULT 'trial',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  trial_ends_at TIMESTAMP,
  paid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);