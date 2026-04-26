const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 1000) {
      console.warn('Slow query detected:', { text, duration });
    }
    return res;
  } catch (error) {
    console.error('Database error:', error.message);
    throw error;
  }
}

async function initializeSchema() {
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      subscription_tier VARCHAR(50) DEFAULT 'basic',
      picks_used INTEGER DEFAULT 0,
      picks_reset_at TIMESTAMP DEFAULT NOW(),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS pick_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      game_id VARCHAR(255),
      sport VARCHAR(100),
      recommendation TEXT,
      confidence INTEGER,
      result VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS subscription_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      tier VARCHAR(50),
      product_id VARCHAR(255),
      transaction_id VARCHAR(255),
      platform VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_pick_history_user ON pick_history(user_id);
  `;

  try {
    await pool.query(schema);
    console.log('Database schema initialized');
  } catch (error) {
    console.error('Schema init error:', error.message);
  }
}

initializeSchema();

module.exports = { query, pool };
