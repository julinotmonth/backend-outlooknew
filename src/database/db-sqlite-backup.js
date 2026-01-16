/**
 * SQLite Database Connection Module (BACKUP)
 * Use this file if you want to rollback to SQLite
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '..', '..', 'database', 'outlook.db');
const dbDir = path.dirname(dbPath);

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

// Initialize database
const initDb = async () => {
  if (db) return db;
  
  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
    console.log('✅ Connected to existing SQLite database');
  } else {
    db = new SQL.Database();
    console.log('✅ Created new SQLite database');
  }
  
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
  
  return db;
};

// Save database to file
const saveDb = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// Auto-save every 5 seconds
setInterval(saveDb, 5000);

// Save on exit
process.on('exit', saveDb);
process.on('SIGINT', () => { saveDb(); process.exit(); });
process.on('SIGTERM', () => { saveDb(); process.exit(); });

// Promisified database methods
const dbRun = async (sql, params = []) => {
  await initDb();
  try {
    db.run(sql, params);
    const result = db.exec("SELECT last_insert_rowid() as lastID, changes() as changes");
    const lastID = result[0]?.values[0]?.[0] || 0;
    const changes = result[0]?.values[0]?.[1] || 0;
    saveDb();
    return { lastID, changes };
  } catch (err) {
    throw err;
  }
};

const dbGet = async (sql, params = []) => {
  await initDb();
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (err) {
    throw err;
  }
};

const dbAll = async (sql, params = []) => {
  await initDb();
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  } catch (err) {
    throw err;
  }
};

const getDb = async () => {
  return await initDb();
};

module.exports = { dbRun, dbGet, dbAll, getDb, saveDb, initDb };
