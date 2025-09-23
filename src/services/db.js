import initSqlJs from 'sql.js';
import Person from '../entities/Person.js';
import PersonCredential from '../entities/PersonCredential.js';
import Organization from '../entities/Organization.js';
import OrganizationMember from '../entities/OrganizationMember.js';
import ProcedureTemplate from '../entities/ProcedureTemplate.js';

export default class DatabaseService {
    constructor() {
        this.db = null;
        this.SQL = null;
        this.isInitialized = false;
        this.dbName = 'v4l_multi_org.db';
    }

    async init() {
        try {
            // Initialize SQL.js
            this.SQL = await initSqlJs({
                locateFile: file => `https://sql.js.org/dist/${file}`
            });

            // Load existing database or create new one
            await this.loadDatabase();

            // Run migrations
            await this.runMigrations();

            this.isInitialized = true;
            console.log('Database initialized successfully');

        } catch (error) {
            console.error('Database initialization failed:', error);
            throw error;
        }
    }

    async loadDatabase() {
        try {
            // Try to load from localStorage first (web)
            const savedDb = localStorage.getItem(this.dbName);

            if (savedDb) {
                const dbArray = new Uint8Array(JSON.parse(savedDb));
                this.db = new this.SQL.Database(dbArray);
                console.log('Loaded existing database from localStorage');
            } else {
                // Create new database
                this.db = new this.SQL.Database();
                console.log('Created new database');
            }
        } catch (error) {
            console.error('Error loading database:', error);
            // Fallback to new database
            this.db = new this.SQL.Database();
        }
    }

    async saveDatabase() {
        try {
            const data = this.db.export();
            const buffer = new Uint8Array(data);
            localStorage.setItem(this.dbName, JSON.stringify(Array.from(buffer)));
        } catch (error) {
            console.error('Error saving database:', error);
        }
    }

    async runMigrations() {
        const migrations = [
            {
                version: 1,
                name: 'create_initial_tables',
                up: () => this.migration001_createInitialTables()
            },
            {
                version: 2,
                name: 'add_indexes',
                up: () => this.migration002_addIndexes()
            },
            {
                version: 3,
                name: 'migrate_to_unified_users',
                up: () => this.migration003_migrateToUnifiedUsers()
            }
        ];

        // Create migrations table if it doesn't exist
        this.db.run(`
            CREATE TABLE IF NOT EXISTS migrations (
                version INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Get current version
        const result = this.db.exec('SELECT MAX(version) as version FROM migrations');
        const currentVersion = result.length > 0 && result[0].values.length > 0
            ? result[0].values[0][0] || 0
            : 0;

        // Run pending migrations
        for (const migration of migrations) {
            if (migration.version > currentVersion) {
                console.log(`Running migration ${migration.version}: ${migration.name}`);

                try {
                    await migration.up();

                    // Record migration
                    this.db.run(
                        'INSERT INTO migrations (version, name) VALUES (?, ?)',
                        [migration.version, migration.name]
                    );

                    console.log(`Migration ${migration.version} completed`);
                } catch (error) {
                    console.error(`Migration ${migration.version} failed:`, error);
                    throw error;
                }
            }
        }

        // Save database after migrations
        await this.saveDatabase();
    }

    migration001_createInitialTables() {
        // Create persons table
        const personSchema = Person.schema();
        const personColumns = Object.entries(personSchema.columns)
            .map(([name, type]) => `${name} ${type}`)
            .join(', ');

        this.db.run(`CREATE TABLE IF NOT EXISTS ${personSchema.table} (${personColumns})`);

        // Create person_credentials table
        const credentialSchema = PersonCredential.schema();
        const credentialColumns = Object.entries(credentialSchema.columns)
            .map(([name, type]) => `${name} ${type}`)
            .join(', ');

        this.db.run(`CREATE TABLE IF NOT EXISTS ${credentialSchema.table} (${credentialColumns})`);

        // Create organizations table
        const orgSchema = Organization.schema();
        const orgColumns = Object.entries(orgSchema.columns)
            .map(([name, type]) => `${name} ${type}`)
            .join(', ');

        this.db.run(`CREATE TABLE IF NOT EXISTS ${orgSchema.table} (${orgColumns})`);

        // Create organization_members table
        const memberSchema = OrganizationMember.schema();
        const memberColumns = Object.entries(memberSchema.columns)
            .map(([name, type]) => `${name} ${type}`)
            .join(', ');

        this.db.run(`CREATE TABLE IF NOT EXISTS ${memberSchema.table} (${memberColumns})`);

        // Create procedure_templates table
        const procedureSchema = ProcedureTemplate.schema();
        const procedureColumns = Object.entries(procedureSchema.columns)
            .map(([name, type]) => `${name} ${type}`)
            .join(', ');

        this.db.run(`CREATE TABLE IF NOT EXISTS ${procedureSchema.table} (${procedureColumns})`);

        // Create project_instances table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS project_instances (
                id TEXT PRIMARY KEY,
                organization_id TEXT NOT NULL,
                procedure_template_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'active',
                current_node_id TEXT,
                variables TEXT,
                history TEXT,
                started_by TEXT,
                started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (organization_id) REFERENCES organizations(id),
                FOREIGN KEY (procedure_template_id) REFERENCES procedure_templates(id),
                FOREIGN KEY (started_by) REFERENCES persons(id)
            )
        `);

        // Create task_instances table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS task_instances (
                id TEXT PRIMARY KEY,
                project_instance_id TEXT NOT NULL,
                node_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                status TEXT DEFAULT 'pending',
                assigned_to TEXT,
                claimed_by TEXT,
                variables TEXT,
                result TEXT,
                started_at DATETIME,
                completed_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (project_instance_id) REFERENCES project_instances(id),
                FOREIGN KEY (assigned_to) REFERENCES persons(id),
                FOREIGN KEY (claimed_by) REFERENCES persons(id)
            )
        `);
    }

    migration002_addIndexes() {
        // Add indexes for better performance
        const schemas = [
            Person.schema(),
            PersonCredential.schema(),
            Organization.schema(),
            OrganizationMember.schema(),
            ProcedureTemplate.schema()
        ];

        schemas.forEach(schema => {
            if (schema.indexes) {
                schema.indexes.forEach(indexSql => {
                    try {
                        this.db.run(indexSql);
                    } catch (error) {
                        // Ignore if index already exists
                        if (!error.message.includes('already exists')) {
                            throw error;
                        }
                    }
                });
            }
        });

        // Additional project and task indexes
        this.db.run('CREATE INDEX IF NOT EXISTS idx_project_org_id ON project_instances(organization_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_project_template_id ON project_instances(procedure_template_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_project_status ON project_instances(status)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_task_project_id ON task_instances(project_instance_id)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_task_status ON task_instances(status)');
        this.db.run('CREATE INDEX IF NOT EXISTS idx_task_assigned_to ON task_instances(assigned_to)');
    }

    migration003_migrateToUnifiedUsers() {
        // Create new users table with integrated authentication
        const userSchema = Person.schema();
        const userColumns = Object.entries(userSchema.columns)
            .map(([name, type]) => `${name} ${type}`)
            .join(', ');

        this.db.run(`CREATE TABLE IF NOT EXISTS ${userSchema.table} (${userColumns})`);

        // Migrate existing data from persons and person_credentials if they exist
        try {
            // Check if old tables exist
            const tablesQuery = this.db.exec("SELECT name FROM sqlite_master WHERE type='table' AND (name='persons' OR name='person_credentials')");
            const existingTables = tablesQuery.length > 0 ? tablesQuery[0].values.flat() : [];

            if (existingTables.includes('persons') && existingTables.includes('person_credentials')) {
                // Migrate data from old structure to new unified structure
                const migrateQuery = `
                    INSERT OR IGNORE INTO users (
                        id, username, first_name, last_name, primary_email_address,
                        password_hash, password_salt, is_email_verified,
                        email_verification_token, email_verification_expires,
                        password_reset_token, password_reset_expires,
                        failed_login_attempts, account_locked_until,
                        last_login_at, is_active, role, created_at, updated_at
                    )
                    SELECT
                        p.id,
                        SUBSTR(p.primary_email_address, 1, INSTR(p.primary_email_address, '@') - 1) as username,
                        p.first_name,
                        p.last_name,
                        p.primary_email_address,
                        pc.password_hash,
                        pc.password_salt,
                        pc.is_verified,
                        pc.verification_token,
                        pc.verification_token_expires,
                        pc.reset_token,
                        pc.reset_token_expires,
                        pc.failed_login_attempts,
                        pc.locked_until,
                        pc.last_login_at,
                        1 as is_active,
                        'user' as role,
                        p.created_at,
                        p.updated_at
                    FROM persons p
                    INNER JOIN person_credentials pc ON p.id = pc.person_id
                `;

                this.db.run(migrateQuery);
                console.log('Successfully migrated existing users to new unified structure');
            }
        } catch (error) {
            console.log('No existing user data to migrate or migration already completed');
        }

        // Add indexes for the new users table
        if (userSchema.indexes) {
            userSchema.indexes.forEach(indexSql => {
                try {
                    this.db.run(indexSql);
                } catch (error) {
                    if (!error.message.includes('already exists')) {
                        console.error('Error creating user index:', error);
                    }
                }
            });
        }
    }

    // Generic CRUD operations
    async create(tableName, data) {
        try {
            const columns = Object.keys(data).join(', ');
            const placeholders = Object.keys(data).map(() => '?').join(', ');
            const values = Object.values(data);

            const sql = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`;
            this.db.run(sql, values);

            await this.saveDatabase();
            return data.id;
        } catch (error) {
            console.error(`Error creating record in ${tableName}:`, error);
            throw error;
        }
    }

    async findById(tableName, id) {
        try {
            const sql = `SELECT * FROM ${tableName} WHERE id = ?`;
            const result = this.db.exec(sql, [id]);

            if (result.length > 0 && result[0].values.length > 0) {
                return this.rowToObject(result[0].columns, result[0].values[0]);
            }

            return null;
        } catch (error) {
            console.error(`Error finding record in ${tableName}:`, error);
            throw error;
        }
    }

    async findMany(tableName, where = {}, limit = null, offset = null) {
        try {
            let sql = `SELECT * FROM ${tableName}`;
            const values = [];

            if (Object.keys(where).length > 0) {
                const conditions = Object.keys(where).map(key => {
                    values.push(where[key]);
                    return `${key} = ?`;
                }).join(' AND ');
                sql += ` WHERE ${conditions}`;
            }

            if (limit) {
                sql += ` LIMIT ${limit}`;
                if (offset) {
                    sql += ` OFFSET ${offset}`;
                }
            }

            const result = this.db.exec(sql, values);

            if (result.length > 0) {
                return result[0].values.map(row =>
                    this.rowToObject(result[0].columns, row)
                );
            }

            return [];
        } catch (error) {
            console.error(`Error finding records in ${tableName}:`, error);
            throw error;
        }
    }

    async update(tableName, id, data) {
        try {
            const updates = Object.keys(data)
                .filter(key => key !== 'id')
                .map(key => `${key} = ?`)
                .join(', ');

            const values = Object.keys(data)
                .filter(key => key !== 'id')
                .map(key => data[key]);

            values.push(id);

            const sql = `UPDATE ${tableName} SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
            this.db.run(sql, values);

            await this.saveDatabase();
            return true;
        } catch (error) {
            console.error(`Error updating record in ${tableName}:`, error);
            throw error;
        }
    }

    async delete(tableName, id) {
        try {
            const sql = `DELETE FROM ${tableName} WHERE id = ?`;
            this.db.run(sql, [id]);

            await this.saveDatabase();
            return true;
        } catch (error) {
            console.error(`Error deleting record in ${tableName}:`, error);
            throw error;
        }
    }

    // Entity-specific methods
    async createPerson(person) {
        const data = person.toJSONWithSecrets();
        return await this.create('users', data);
    }

    async createUser(user) {
        const data = user.toJSONWithSecrets();
        return await this.create('users', data);
    }

    async findPersonByEmail(email) {
        const users = await this.findMany('users', { primary_email_address: email });
        return users.length > 0 ? Person.fromJSON(users[0]) : null;
    }

    async findUserByEmail(email) {
        const users = await this.findMany('users', { primary_email_address: email });
        return users.length > 0 ? Person.fromJSON(users[0]) : null;
    }

    async findUserByUsername(username) {
        const users = await this.findMany('users', { username });
        return users.length > 0 ? Person.fromJSON(users[0]) : null;
    }

    async findUserByUsernameOrEmail(usernameOrEmail) {
        // Try email first
        if (usernameOrEmail.includes('@')) {
            return await this.findUserByEmail(usernameOrEmail);
        }
        // Then try username
        return await this.findUserByUsername(usernameOrEmail);
    }

    async createOrganization(organization) {
        const data = organization.toJSON();
        return await this.create('organizations', data);
    }

    async getUserOrganizations(userId) {
        try {
            const sql = `
                SELECT o.* FROM organizations o
                INNER JOIN organization_members om ON o.id = om.organization_id
                WHERE om.person_id = ? AND om.status = 'active'
                ORDER BY o.name
            `;

            const result = this.db.exec(sql, [userId]);

            if (result.length > 0) {
                return result[0].values.map(row =>
                    Organization.fromJSON(this.rowToObject(result[0].columns, row))
                );
            }

            return [];
        } catch (error) {
            console.error('Error getting user organizations:', error);
            throw error;
        }
    }

    async createOrganizationMember(member) {
        const data = member.toJSON();
        // Convert arrays to JSON strings for storage
        data.roles = JSON.stringify(data.roles);
        data.permissions = JSON.stringify(data.permissions);
        return await this.create('organization_members', data);
    }

    async getOrganizationMember(organizationId, personId) {
        const members = await this.findMany('organization_members', {
            organization_id: organizationId,
            person_id: personId
        });

        return members.length > 0 ? OrganizationMember.fromJSON(members[0]) : null;
    }

    // Utility methods
    rowToObject(columns, values) {
        const obj = {};
        columns.forEach((column, index) => {
            obj[column] = values[index];
        });
        return obj;
    }

    async query(sql, params = []) {
        try {
            const result = this.db.exec(sql, params);

            if (result.length > 0) {
                return result[0].values.map(row =>
                    this.rowToObject(result[0].columns, row)
                );
            }

            return [];
        } catch (error) {
            console.error('Database query error:', error);
            throw error;
        }
    }

    async close() {
        if (this.db) {
            await this.saveDatabase();
            this.db.close();
            this.db = null;
            this.isInitialized = false;
        }
    }
}