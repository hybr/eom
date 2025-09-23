import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DatabaseService {
    constructor(dbPath = null) {
        this.dbPath = dbPath || path.join(process.cwd(), 'data', 'app.db');
        this.db = null;
        this.isInitialized = false;
    }

    initialize() {
        if (this.isInitialized) {
            return;
        }

        // Ensure data directory exists
        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Open database connection
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL');
        this.db.pragma('foreign_keys = ON');

        // Run migrations
        this.runMigrations();

        this.isInitialized = true;
        console.log(`Database initialized at: ${this.dbPath}`);
    }

    runMigrations() {
        // Create migrations table if it doesn't exist
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS migrations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        const migrations = this.getMigrations();
        const executedMigrations = this.getExecutedMigrations();

        migrations.forEach(migration => {
            if (!executedMigrations.includes(migration.name)) {
                console.log(`Running migration: ${migration.name}`);
                this.db.exec(migration.sql);
                this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
                console.log(`Migration completed: ${migration.name}`);
            }
        });
    }

    getMigrations() {
        return [
            {
                name: '001_create_organizations_table',
                sql: `
                    CREATE TABLE organizations (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        website TEXT,
                        address TEXT,
                        contact_email TEXT,
                        contact_phone TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        settings TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        user_ids TEXT,
                        admin_ids TEXT,
                        invitations TEXT
                    );
                `
            },
            {
                name: '002_create_users_table',
                sql: `
                    CREATE TABLE users (
                        id TEXT PRIMARY KEY,
                        username TEXT UNIQUE NOT NULL,
                        email TEXT UNIQUE NOT NULL,
                        first_name TEXT,
                        last_name TEXT,
                        role TEXT DEFAULT 'user',
                        organization_id TEXT,
                        is_active BOOLEAN DEFAULT 1,
                        is_email_verified BOOLEAN DEFAULT 0,
                        password_hash TEXT,
                        salt TEXT,
                        password_reset_token TEXT,
                        password_reset_expires DATETIME,
                        email_verification_token TEXT,
                        email_verification_expires DATETIME,
                        login_attempts INTEGER DEFAULT 0,
                        account_locked_until DATETIME,
                        two_factor_enabled BOOLEAN DEFAULT 0,
                        two_factor_secret TEXT,
                        permissions TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        last_login_at DATETIME,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id)
                    );
                `
            },
            {
                name: '003_create_processes_table',
                sql: `
                    CREATE TABLE processes (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        version TEXT DEFAULT '1.0.0',
                        organization_id TEXT,
                        created_by TEXT,
                        is_template BOOLEAN DEFAULT 1,
                        is_active BOOLEAN DEFAULT 1,
                        nodes TEXT,
                        edges TEXT,
                        variables TEXT,
                        triggers TEXT,
                        settings TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        FOREIGN KEY (created_by) REFERENCES users(id)
                    );
                `
            },
            {
                name: '004_create_projects_table',
                sql: `
                    CREATE TABLE projects (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        description TEXT,
                        process_id TEXT,
                        organization_id TEXT,
                        owner_id TEXT,
                        assigned_users TEXT,
                        status TEXT DEFAULT 'pending',
                        priority TEXT DEFAULT 'medium',
                        variables TEXT,
                        current_node_id TEXT,
                        completed_nodes TEXT,
                        tasks TEXT,
                        execution_history TEXT,
                        metadata TEXT,
                        started_at DATETIME,
                        completed_at DATETIME,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (process_id) REFERENCES processes(id),
                        FOREIGN KEY (organization_id) REFERENCES organizations(id),
                        FOREIGN KEY (owner_id) REFERENCES users(id)
                    );
                `
            },
            {
                name: '005_create_sessions_table',
                sql: `
                    CREATE TABLE sessions (
                        id TEXT PRIMARY KEY,
                        token TEXT UNIQUE NOT NULL,
                        user_id TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        expires_at DATETIME NOT NULL,
                        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
                        FOREIGN KEY (user_id) REFERENCES users(id)
                    );
                `
            },
            {
                name: '006_create_indexes',
                sql: `
                    CREATE INDEX idx_users_username ON users(username);
                    CREATE INDEX idx_users_email ON users(email);
                    CREATE INDEX idx_users_organization_id ON users(organization_id);
                    CREATE INDEX idx_processes_organization_id ON processes(organization_id);
                    CREATE INDEX idx_projects_organization_id ON projects(organization_id);
                    CREATE INDEX idx_projects_owner_id ON projects(owner_id);
                    CREATE INDEX idx_sessions_user_id ON sessions(user_id);
                    CREATE INDEX idx_sessions_token ON sessions(token);
                    CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
                `
            }
        ];
    }

    getExecutedMigrations() {
        try {
            const stmt = this.db.prepare('SELECT name FROM migrations');
            return stmt.all().map(row => row.name);
        } catch (error) {
            return [];
        }
    }

    // Generic CRUD operations
    insert(table, data) {
        const keys = Object.keys(data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
        const stmt = this.db.prepare(sql);
        return stmt.run(...Object.values(data));
    }

    update(table, data, where) {
        const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause}`;
        const stmt = this.db.prepare(sql);
        return stmt.run(...Object.values(data), ...Object.values(where));
    }

    delete(table, where) {
        const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
        const sql = `DELETE FROM ${table} WHERE ${whereClause}`;
        const stmt = this.db.prepare(sql);
        return stmt.run(...Object.values(where));
    }

    findOne(table, where = {}) {
        let sql = `SELECT * FROM ${table}`;
        const values = [];

        if (Object.keys(where).length > 0) {
            const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            values.push(...Object.values(where));
        }

        sql += ' LIMIT 1';
        const stmt = this.db.prepare(sql);
        return stmt.get(...values);
    }

    findMany(table, where = {}, options = {}) {
        let sql = `SELECT * FROM ${table}`;
        const values = [];

        if (Object.keys(where).length > 0) {
            const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            values.push(...Object.values(where));
        }

        if (options.orderBy) {
            sql += ` ORDER BY ${options.orderBy}`;
        }

        if (options.limit) {
            sql += ` LIMIT ${options.limit}`;
        }

        if (options.offset) {
            sql += ` OFFSET ${options.offset}`;
        }

        const stmt = this.db.prepare(sql);
        return stmt.all(...values);
    }

    count(table, where = {}) {
        let sql = `SELECT COUNT(*) as count FROM ${table}`;
        const values = [];

        if (Object.keys(where).length > 0) {
            const whereClause = Object.keys(where).map(key => `${key} = ?`).join(' AND ');
            sql += ` WHERE ${whereClause}`;
            values.push(...Object.values(where));
        }

        const stmt = this.db.prepare(sql);
        const result = stmt.get(...values);
        return result.count;
    }

    // Transaction support
    transaction(fn) {
        const txn = this.db.transaction(fn);
        return txn;
    }

    // Raw query execution
    exec(sql) {
        return this.db.exec(sql);
    }

    prepare(sql) {
        return this.db.prepare(sql);
    }

    // Cleanup operations
    cleanupExpiredSessions() {
        return this.delete('sessions', { 'expires_at < datetime("now")': true });
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }

    // Backup functionality
    backup(backupPath) {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        return this.db.backup(backupPath);
    }
}

// Singleton instance
let instance = null;

export function getDatabase() {
    if (!instance) {
        instance = new DatabaseService();
        instance.initialize();
    }
    return instance;
}

export default DatabaseService;