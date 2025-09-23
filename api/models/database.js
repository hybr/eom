import sqlite3 from 'sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const dbPath = join(__dirname, '..', 'database.sqlite')

export const db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
        console.error('Error opening database:', err.message)
    } else {
        console.log('Connected to SQLite database')
        await initializeDatabase()
    }
})

async function initializeDatabase() {
    // Import migrations after database is ready
    const { runMigrations } = await import('./migrations.js')

    // Create basic persons table (original schema)
    db.run(`
        CREATE TABLE IF NOT EXISTS persons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            first_name TEXT NOT NULL,
            last_name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // Create organizations table
    db.run(`
        CREATE TABLE IF NOT EXISTS organizations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // Create person_credentials table
    db.run(`
        CREATE TABLE IF NOT EXISTS person_credentials (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            person_id INTEGER NOT NULL,
            username TEXT UNIQUE NOT NULL COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            password_salt TEXT,
            last_login_at DATETIME,
            failed_attempts INTEGER DEFAULT 0,
            locked_until DATETIME,
            password_changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            must_change_password BOOLEAN DEFAULT 0,
            two_factor_secret TEXT,
            last_otp TEXT,
            is_active BOOLEAN DEFAULT 1,
            last_ip TEXT,
            role_id INTEGER,
            email_verified BOOLEAN DEFAULT 0,
            phone_verified BOOLEAN DEFAULT 0,
            security_question TEXT,
            security_answer_hash TEXT,
            auth_provider TEXT DEFAULT 'local',
            session_token TEXT,
            refresh_token TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (person_id) REFERENCES persons (id) ON DELETE CASCADE
        )
    `)

    console.log('Database tables initialized')

    // Run migrations to update schema
    await runMigrations()
}

// Helper function to promisify database operations
export function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err)
            else resolve(row)
        })
    })
}

export function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
        })
    })
}

export function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function(err) {
            if (err) reject(err)
            else resolve({ id: this.lastID, changes: this.changes })
        })
    })
}