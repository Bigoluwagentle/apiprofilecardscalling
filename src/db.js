const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "..", "profiles.db");

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}

function initDb() {
  return new Promise((resolve) => {
    const database = getDb();

    database.exec(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        gender TEXT,
        gender_probability REAL,
        sample_size INTEGER,
        age INTEGER,
        age_group TEXT,
        country_id TEXT,
        country_name TEXT,
        country_probability REAL,
        created_at TEXT NOT NULL
      )
    `);

    const cols = database.pragma("table_info(profiles)").map((c) => c.name);
    if (!cols.includes("country_name")) {
      database.exec("ALTER TABLE profiles ADD COLUMN country_name TEXT");
    }

    database.exec(`
      CREATE INDEX IF NOT EXISTS idx_gender ON profiles(gender);
      CREATE INDEX IF NOT EXISTS idx_age ON profiles(age);
      CREATE INDEX IF NOT EXISTS idx_age_group ON profiles(age_group);
      CREATE INDEX IF NOT EXISTS idx_country_id ON profiles(country_id);
      CREATE INDEX IF NOT EXISTS idx_created_at ON profiles(created_at);
    `);

    resolve();
  });
}

module.exports = { getDb, initDb };