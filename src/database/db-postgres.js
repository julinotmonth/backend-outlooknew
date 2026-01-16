const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000, // How long a client is allowed to remain idle
  connectionTimeoutMillis: 2000, // How long to wait for connection
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

// Promisified database methods (compatible with existing code)

/**
 * Execute INSERT/UPDATE/DELETE query
 * @param {string} sql - SQL query with $1, $2, etc. placeholders
 * @param {array} params - Parameters array
 * @returns {object} - { lastID, changes, rows }
 */
const dbRun = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    // Convert ? placeholders to $1, $2, etc. for PostgreSQL
    const pgSql = convertPlaceholders(sql);
    
    // For INSERT queries, add RETURNING id to get the inserted ID
    let finalSql = pgSql;
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      finalSql = pgSql.replace(/;?\s*$/, ' RETURNING id;');
    }
    
    const result = await client.query(finalSql, params);
    
    return {
      lastID: result.rows[0]?.id || 0,
      changes: result.rowCount || 0,
      rows: result.rows
    };
  } finally {
    client.release();
  }
};

/**
 * Get single row
 * @param {string} sql - SQL query
 * @param {array} params - Parameters array
 * @returns {object|null} - Single row or null
 */
const dbGet = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const pgSql = convertPlaceholders(sql);
    const result = await client.query(pgSql, params);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

/**
 * Get all rows
 * @param {string} sql - SQL query
 * @param {array} params - Parameters array
 * @returns {array} - Array of rows
 */
const dbAll = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const pgSql = convertPlaceholders(sql);
    const result = await client.query(pgSql, params);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Execute raw query (for migrations, etc.)
 * @param {string} sql - Raw SQL query
 * @param {array} params - Parameters array
 * @returns {object} - Query result
 */
const dbQuery = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
};

/**
 * Get pool instance for advanced operations
 * @returns {Pool} - PostgreSQL pool instance
 */
const getPool = () => pool;

/**
 * Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
 * @param {string} sql - SQL with ? placeholders
 * @returns {string} - SQL with $1, $2, etc. placeholders
 */
const convertPlaceholders = (sql) => {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
};

/**
 * Close all connections (for graceful shutdown)
 */
const closePool = async () => {
  await pool.end();
  console.log('PostgreSQL pool closed');
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await closePool();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closePool();
  process.exit(0);
});

module.exports = {
  dbRun,
  dbGet,
  dbAll,
  dbQuery,
  getPool,
  closePool,
  pool
};
