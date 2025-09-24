#!/usr/bin/env node

const fs = require('fs').promises
const path = require('path')
const Ajv = require('ajv')

async function generateEntity (entityName) {
  try {
    const entityPath = path.join(__dirname, '..', 'entities', `${entityName}.json`)

    // Check if entity exists
    try {
      await fs.access(entityPath)
      console.log(`Entity ${entityName} already exists at ${entityPath}`)
      return
    } catch (error) {
      // Entity doesn't exist, continue
    }

    // Create basic entity template
    const entityTemplate = {
      name: entityName,
      displayName: entityName,
      description: `${entityName} entity`,
      attributes: {
        id: {
          type: 'integer',
          required: true,
          unique: true,
          displayName: 'ID',
          ui: {
            hidden: true
          }
        },
        name: {
          type: 'string',
          required: true,
          length: 255,
          displayName: 'Name',
          ui: {
            widget: 'text',
            placeholder: 'Enter name'
          }
        },
        description: {
          type: 'text',
          displayName: 'Description',
          ui: {
            widget: 'textarea',
            placeholder: 'Enter description'
          }
        },
        status: {
          type: 'string',
          required: true,
          enum: ['active', 'inactive'],
          default: 'active',
          displayName: 'Status',
          ui: {
            widget: 'select'
          }
        },
        createdAt: {
          type: 'datetime',
          required: true,
          displayName: 'Created At',
          ui: {
            readonly: true,
            hidden: true
          }
        },
        updatedAt: {
          type: 'datetime',
          required: true,
          displayName: 'Updated At',
          ui: {
            readonly: true,
            hidden: true
          }
        }
      },
      methods: {
        activate: {
          action: 'custom',
          displayName: `Activate ${entityName}`,
          description: `Activate this ${entityName.toLowerCase()}`,
          validation: {
            rules: ["status != 'active'"]
          },
          ui: {
            button: {
              text: 'Activate',
              icon: 'fas fa-check-circle',
              class: 'btn-success'
            },
            position: 'both'
          }
        },
        deactivate: {
          action: 'custom',
          displayName: `Deactivate ${entityName}`,
          description: `Deactivate this ${entityName.toLowerCase()}`,
          validation: {
            rules: ["status == 'active'"]
          },
          ui: {
            button: {
              text: 'Deactivate',
              icon: 'fas fa-ban',
              class: 'btn-warning',
              confirm: true,
              confirmMessage: `Are you sure you want to deactivate this ${entityName.toLowerCase()}?`
            },
            position: 'both'
          }
        }
      },
      permissions: {
        create: ['admin', 'manager'],
        read: ['admin', 'manager', 'user'],
        update: ['admin', 'manager'],
        delete: ['admin']
      },
      ui: {
        listView: {
          columns: ['id', 'name', 'status', 'createdAt'],
          sortable: ['name', 'status', 'createdAt'],
          searchable: ['name'],
          filterable: ['status']
        },
        formView: {
          layout: 'single-column',
          sections: [
            {
              title: 'Basic Information',
              fields: ['name', 'description', 'status']
            }
          ]
        }
      }
    }

    // Write entity file
    await fs.writeFile(entityPath, JSON.stringify(entityTemplate, null, 2))
    console.log(`Entity ${entityName} created successfully at ${entityPath}`)

    // Generate migration
    await generateMigration(entityName, entityTemplate)

  } catch (error) {
    console.error('Error generating entity:', error)
    process.exit(1)
  }
}

async function generateMigration (entityName, entityConfig) {
  // Ensure migrations directory exists
  const migrationsDir = path.join(__dirname, '..', 'migrations')
  await fs.mkdir(migrationsDir, { recursive: true })

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -1)
  const migrationName = `${timestamp}_create_${entityName.toLowerCase()}s_table`
  const migrationPath = path.join(migrationsDir, `${migrationName}.js`)

  const tableName = entityName.toLowerCase() + 's'

  let migrationContent = `exports.up = function(knex) {\n  return knex.schema.createTable('${tableName}', function(table) {\n`

  // Generate columns from attributes
  for (const [attrName, attrConfig] of Object.entries(entityConfig.attributes)) {
    const column = generateColumnDefinition(attrName, attrConfig)
    migrationContent += `    ${column}\n`
  }

  migrationContent += `  })\n}\n\n`
  migrationContent += `exports.down = function(knex) {\n  return knex.schema.dropTable('${tableName}')\n}\n`

  await fs.writeFile(migrationPath, migrationContent)
  console.log(`Migration created: ${migrationPath}`)
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

  if (config.unique) {
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
  const entityName = process.argv[2]

  if (!entityName) {
    console.error('Usage: node generate-entity.js <EntityName>')
    process.exit(1)
  }

  generateEntity(entityName)
}

module.exports = { generateEntity, generateMigration }