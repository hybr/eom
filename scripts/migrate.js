#!/usr/bin/env node

const knex = require('knex')
const config = require('../config/database')
const fs = require('fs').promises
const path = require('path')

async function runMigrations (rollback = false) {
  let db = null

  try {
    // Ensure data directory exists
    const dataDir = path.dirname(config.connection.filename)
    await fs.mkdir(dataDir, { recursive: true })

    // Initialize database connection
    db = knex(config)

    if (rollback) {
      console.log('Rolling back migrations...')
      await db.migrate.rollback()
      console.log('Migrations rolled back successfully')
    } else {
      console.log('Running migrations...')
      const [batchNo, log] = await db.migrate.latest()

      if (log.length === 0) {
        console.log('Already up to date')
      } else {
        console.log(`Batch ${batchNo} run: ${log.length} migrations`)
        log.forEach(migration => console.log(`- ${migration}`))
      }
    }
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  } finally {
    if (db) {
      await db.destroy()
    }
  }
}

async function createInitialMigrations () {
  try {
    // Ensure migrations directory exists
    const migrationsDir = path.join(__dirname, '..', 'migrations')
    await fs.mkdir(migrationsDir, { recursive: true })

    // Create users table migration
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1)
    const usersMigrationPath = path.join(migrationsDir, `${timestamp}_create_users_table.js`)

    const usersMigrationContent = `exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.increments('id').primary()
    table.string('username', 50).notNullable().unique()
    table.string('email', 255).notNullable().unique()
    table.string('password', 255).notNullable()
    table.string('firstName', 100).notNullable()
    table.string('lastName', 100).notNullable()
    table.enum('role', ['admin', 'manager', 'user']).defaultTo('user')
    table.enum('status', ['active', 'inactive', 'suspended']).defaultTo('active')
    table.datetime('lastLogin').nullable()
    table.datetime('passwordChangedAt').nullable()
    table.datetime('createdAt').notNullable()
    table.datetime('updatedAt').notNullable()

    table.index(['email'])
    table.index(['username'])
    table.index(['status'])
    table.index(['role'])
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('users')
}
`

    await fs.writeFile(usersMigrationPath, usersMigrationContent)
    console.log('Created users table migration')

  } catch (error) {
    console.error('Error creating initial migrations:', error)
  }
}

async function generateEntityMigrations () {
  try {
    // Ensure migrations directory exists
    const migrationsDir = path.join(__dirname, '..', 'migrations')
    await fs.mkdir(migrationsDir, { recursive: true })

    const entitiesPath = path.join(__dirname, '..', 'entities')
    const entityFiles = await fs.readdir(entitiesPath)

    for (const file of entityFiles) {
      if (file.endsWith('.json') && file !== 'User.json') {
        const entityPath = path.join(entitiesPath, file)
        const entityConfig = JSON.parse(await fs.readFile(entityPath, 'utf8'))

        const entityName = entityConfig.name
        const tableName = entityName.toLowerCase() + 's'
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1)
        const migrationName = `${timestamp}_create_${tableName}_table`
        const migrationPath = path.join(migrationsDir, `${migrationName}.js`)

        // Check if migration already exists
        try {
          await fs.access(migrationPath)
          console.log(`Migration for ${entityName} already exists`)
          continue
        } catch (error) {
          // Migration doesn't exist, create it
        }

        let migrationContent = `exports.up = function(knex) {\n  return knex.schema.createTable('${tableName}', function(table) {\n`

        // Generate columns from attributes
        for (const [attrName, attrConfig] of Object.entries(entityConfig.attributes)) {
          const column = generateColumnDefinition(attrName, attrConfig)
          migrationContent += `    ${column}\n`
        }

        // Add foreign key constraints if there are relationships
        if (entityConfig.relationships) {
          for (const [relationName, relationConfig] of Object.entries(entityConfig.relationships)) {
            if (relationConfig.type === 'manyToOne' && relationConfig.foreignKey) {
              const targetTable = relationConfig.target.toLowerCase() + 's'
              migrationContent += `    table.foreign('${relationConfig.foreignKey}').references('id').inTable('${targetTable}')\n`
            }
          }
        }

        migrationContent += `  })\n}\n\n`
        migrationContent += `exports.down = function(knex) {\n  return knex.schema.dropTable('${tableName}')\n}\n`

        await fs.writeFile(migrationPath, migrationContent)
        console.log(`Migration created for ${entityName}: ${migrationPath}`)
      }
    }
  } catch (error) {
    console.error('Error generating entity migrations:', error)
  }
}

function generateColumnDefinition (name, config) {
  let column = ''

  switch (config.type) {
    case 'integer':
      if (name === 'id') {
        column = 'table.increments(\'id\').primary()'
      } else {
        column = `table.integer('${name}')`
      }
      break

    case 'string':
    case 'email':
    case 'url':
      const length = config.length || 255
      column = `table.string('${name}', ${length})`
      break

    case 'text':
      column = `table.text('${name}')`
      break

    case 'number':
      column = `table.decimal('${name}', 10, 2)`
      break

    case 'boolean':
      column = `table.boolean('${name}')`
      break

    case 'date':
      column = `table.date('${name}')`
      break

    case 'datetime':
      column = `table.datetime('${name}')`
      break

    case 'json':
      column = `table.json('${name}')`
      break

    default:
      column = `table.string('${name}')`
  }

  // Add constraints
  if (config.required) {
    column += '.notNullable()'
  } else {
    column += '.nullable()'
  }

  if (config.unique && name !== 'id') {
    column += '.unique()'
  }

  if (config.default !== undefined) {
    if (typeof config.default === 'string') {
      column += `.defaultTo('${config.default}')`
    } else {
      column += `.defaultTo(${config.default})`
    }
  }

  if (config.indexed) {
    column += '.index()'
  }

  return column
}

// CLI handling
if (require.main === module) {
  const isRollback = process.argv.includes('--rollback')
  const isInit = process.argv.includes('--init')
  const isGenerate = process.argv.includes('--generate')

  if (isInit) {
    createInitialMigrations().then(() => {
      console.log('Initial migrations created')
    })
  } else if (isGenerate) {
    generateEntityMigrations().then(() => {
      console.log('Entity migrations generated')
    })
  } else {
    runMigrations(isRollback)
  }
}

module.exports = { runMigrations, createInitialMigrations, generateEntityMigrations }