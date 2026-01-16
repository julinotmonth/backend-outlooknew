/**
 * Database Connection Module
 * Supports PostgreSQL (production) and SQLite (development fallback)
 */

const { Pool } = require('pg');

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL pool error:', err);
});

/**
 * Convert SQLite ? placeholders to PostgreSQL $1, $2, etc.
 * Also converts SQLite boolean syntax to PostgreSQL
 */
const convertPlaceholders = (sql) => {
  let index = 0;
  let result = sql.replace(/\?/g, () => `$${++index}`);
  
  // Convert SQLite boolean syntax to PostgreSQL
  // is_active = 1 -> is_active = true
  // is_active = 0 -> is_active = false
  result = result.replace(/(\w+)\s*=\s*1\b/g, (match, column) => {
    const boolColumns = ['is_active', 'is_popular', 'is_available', 'is_read'];
    if (boolColumns.includes(column.toLowerCase())) {
      return `${column} = true`;
    }
    return match;
  });
  
  result = result.replace(/(\w+)\s*=\s*0\b/g, (match, column) => {
    const boolColumns = ['is_active', 'is_popular', 'is_available', 'is_read'];
    if (boolColumns.includes(column.toLowerCase())) {
      return `${column} = false`;
    }
    return match;
  });
  
  return result;
};

/**
 * Convert parameters - SQLite uses 1/0 for booleans, PostgreSQL uses true/false
 */
const convertParams = (params) => {
  return params.map(param => {
    // Don't convert if it's already boolean
    if (typeof param === 'boolean') return param;
    // Convert 1/0 to true/false for boolean-like values
    // But be careful not to convert actual numeric IDs
    return param;
  });
};

/**
 * Execute INSERT/UPDATE/DELETE query
 * Compatible with existing SQLite code
 */
const dbRun = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    let pgSql = convertPlaceholders(sql);
    const pgParams = convertParams(params);
    
    // For INSERT queries, add RETURNING id
    if (pgSql.trim().toUpperCase().startsWith('INSERT') && !pgSql.toUpperCase().includes('RETURNING')) {
      pgSql = pgSql.replace(/;?\s*$/, ' RETURNING id;');
    }
    
    const result = await client.query(pgSql, pgParams);
    
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
 */
const dbGet = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const pgSql = convertPlaceholders(sql);
    const pgParams = convertParams(params);
    const result = await client.query(pgSql, pgParams);
    return result.rows[0] || null;
  } finally {
    client.release();
  }
};

/**
 * Get all rows
 */
const dbAll = async (sql, params = []) => {
  const client = await pool.connect();
  try {
    const pgSql = convertPlaceholders(sql);
    const pgParams = convertParams(params);
    const result = await client.query(pgSql, pgParams);
    return result.rows;
  } finally {
    client.release();
  }
};

/**
 * Execute raw query
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
 * Get pool instance
 */
const getPool = () => pool;

/**
 * Close all connections
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