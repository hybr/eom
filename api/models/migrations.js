import { db, dbRun, dbGet } from './database.js'

// Migration tracking table
export async function initMigrationTable() {
    await dbRun(`
        CREATE TABLE IF NOT EXISTS migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)
}

// Check if migration has been executed
export async function migrationExists(name) {
    const result = await dbGet('SELECT id FROM migrations WHERE name = ?', [name])
    return !!result
}

// Record migration as executed
export async function recordMigration(name) {
    await dbRun('INSERT INTO migrations (name) VALUES (?)', [name])
}

// Migration 001: Add new fields to persons table
export async function migration_001_add_person_fields() {
    const migrationName = '001_add_person_fields'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Check if columns already exist before adding them
    const tableInfo = await new Promise((resolve, reject) => {
        db.all("PRAGMA table_info(persons)", (err, rows) => {
            if (err) reject(err)
            else resolve(rows)
        })
    })

    const existingColumns = tableInfo.map(col => col.name)
    const columnsToAdd = [
        { name: 'name_prefix', sql: 'ALTER TABLE persons ADD COLUMN name_prefix TEXT' },
        { name: 'middle_name', sql: 'ALTER TABLE persons ADD COLUMN middle_name TEXT' },
        { name: 'name_suffix', sql: 'ALTER TABLE persons ADD COLUMN name_suffix TEXT' },
        { name: 'date_of_birth', sql: 'ALTER TABLE persons ADD COLUMN date_of_birth DATE' },
        { name: 'primary_phone_number', sql: 'ALTER TABLE persons ADD COLUMN primary_phone_number TEXT' },
        { name: 'primary_email_address', sql: 'ALTER TABLE persons ADD COLUMN primary_email_address TEXT' }
    ]

    for (const column of columnsToAdd) {
        if (!existingColumns.includes(column.name)) {
            console.log(`Adding column: ${column.name}`)
            await dbRun(column.sql)
        } else {
            console.log(`Column ${column.name} already exists, skipping...`)
        }
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully`)
}

// Migration 002: Create continent table and seed data
export async function migration_002_create_continent_table() {
    const migrationName = '002_create_continent_table'

    if (await migrationExists(migrationName)) {
        console.log(`Migration ${migrationName} already executed, skipping...`)
        return
    }

    console.log(`Executing migration: ${migrationName}`)

    // Create continent table
    await dbRun(`
        CREATE TABLE IF NOT EXISTS continents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            is_active BOOLEAN DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `)

    // Seed continent data
    const continents = [
        { code: 'AF', name: 'Africa', description: '54 countries, second-largest continent by land area.' },
        { code: 'AN', name: 'Antarctica', description: 'Southernmost continent, largely uninhabited, no permanent residents.' },
        { code: 'AS', name: 'Asia', description: 'Largest continent by area and population.' },
        { code: 'EU', name: 'Europe', description: 'Home to the European Union and many diverse countries.' },
        { code: 'NA', name: 'North America', description: 'Includes USA, Canada, Mexico, and Central America.' },
        { code: 'OC', name: 'Oceania', description: 'Includes Australia, New Zealand, and Pacific island nations.' },
        { code: 'SA', name: 'South America', description: '12 sovereign states, includes Brazil, Argentina, and Chile.' }
    ]

    for (const continent of continents) {
        // Check if continent already exists
        const existing = await dbGet('SELECT id FROM continents WHERE code = ?', [continent.code])

        if (!existing) {
            console.log(`Seeding continent: ${continent.name}`)
            await dbRun(`
                INSERT INTO continents (code, name, description)
                VALUES (?, ?, ?)
            `, [continent.code, continent.name, continent.description])
        } else {
            console.log(`Continent ${continent.name} already exists, skipping...`)
        }
    }

    await recordMigration(migrationName)
    console.log(`Migration ${migrationName} completed successfully`)
}

// Run all pending migrations
export async function runMigrations() {
    await initMigrationTable()
    await migration_001_add_person_fields()
    await migration_002_create_continent_table()
    console.log('All migrations completed')
}