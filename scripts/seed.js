#!/usr/bin/env node

const knex = require('knex')
const bcrypt = require('bcryptjs')
const config = require('../config/database')
const fs = require('fs').promises
const path = require('path')

async function seedDatabase () {
  let db = null

  try {
    db = knex(config)

    console.log('Seeding database...')

    // Seed admin user
    await seedAdminUser(db)

    // Seed sample entities
    await seedSampleData(db)

    console.log('Database seeded successfully')

  } catch (error) {
    console.error('Seeding error:', error)
    process.exit(1)
  } finally {
    if (db) {
      await db.destroy()
    }
  }
}

async function seedAdminUser (db) {
  try {
    // Check if admin user already exists
    const existingAdmin = await db('users')
      .select('id')
      .where('email', process.env.ADMIN_EMAIL || 'admin@example.com')
      .first()

    if (existingAdmin) {
      console.log('Admin user already exists')
      return
    }

    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12)
    const now = new Date().toISOString()

    const adminUser = {
      username: 'admin',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: hashedPassword,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'admin',
      status: 'active',
      createdAt: now,
      updatedAt: now
    }

    await db('users').insert(adminUser)
    console.log('Admin user created')

  } catch (error) {
    console.error('Error seeding admin user:', error)
  }
}

async function seedSampleData (db) {
  try {
    // Seed sample users
    await seedUsers(db)

    // Seed data for other entities
    const entitiesPath = path.join(__dirname, '..', 'entities')
    const entityFiles = await fs.readdir(entitiesPath)

    for (const file of entityFiles) {
      if (file.endsWith('.json') && file !== 'User.json') {
        const entityPath = path.join(entitiesPath, file)
        const entityConfig = JSON.parse(await fs.readFile(entityPath, 'utf8'))

        await seedEntityData(db, entityConfig)
      }
    }

  } catch (error) {
    console.error('Error seeding sample data:', error)
  }
}

async function seedUsers (db) {
  try {
    const userCount = await db('users').count('id as count').first()
    if (userCount.count > 1) {
      console.log('Sample users already exist')
      return
    }

    const now = new Date().toISOString()
    const hashedPassword = await bcrypt.hash('password123', 12)

    const sampleUsers = [
      {
        username: 'manager1',
        email: 'manager@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Manager',
        role: 'manager',
        status: 'active',
        createdAt: now,
        updatedAt: now
      },
      {
        username: 'user1',
        email: 'user1@example.com',
        password: hashedPassword,
        firstName: 'Jane',
        lastName: 'User',
        role: 'user',
        status: 'active',
        createdAt: now,
        updatedAt: now
      },
      {
        username: 'user2',
        email: 'user2@example.com',
        password: hashedPassword,
        firstName: 'Bob',
        lastName: 'User',
        role: 'user',
        status: 'active',
        createdAt: now,
        updatedAt: now
      }
    ]

    await db('users').insert(sampleUsers)
    console.log('Sample users created')

  } catch (error) {
    console.error('Error seeding users:', error)
  }
}

async function seedEntityData (db, entityConfig) {
  try {
    const tableName = entityConfig.name.toLowerCase() + 's'

    // Check if table exists
    const tableExists = await db.schema.hasTable(tableName)
    if (!tableExists) {
      console.log(`Table ${tableName} does not exist, skipping seeding`)
      return
    }

    const existingCount = await db(tableName).count('id as count').first()
    if (existingCount.count > 0) {
      console.log(`Sample data for ${entityConfig.name} already exists`)
      return
    }

    // Generate sample data based on entity configuration
    const sampleData = await generateSampleData(entityConfig, db)

    if (sampleData.length > 0) {
      await db(tableName).insert(sampleData)
      console.log(`Sample data created for ${entityConfig.name}`)
    }

  } catch (error) {
    console.error(`Error seeding ${entityConfig.name}:`, error)
  }
}

async function generateSampleData (entityConfig, db) {
  const samples = []
  const now = new Date().toISOString()

  // Generate 3-5 sample records
  const count = Math.floor(Math.random() * 3) + 3

  for (let i = 0; i < count; i++) {
    const sample = {
      createdAt: now,
      updatedAt: now
    }

    // Generate data for each attribute
    for (const [attrName, attrConfig] of Object.entries(entityConfig.attributes)) {
      if (attrName === 'id' || attrName === 'createdAt' || attrName === 'updatedAt') {
        continue
      }

      sample[attrName] = await generateSampleValue(attrName, attrConfig, i, db, entityConfig)
    }

    samples.push(sample)
  }

  return samples
}

async function generateSampleValue (attrName, config, index, db, entityConfig) {
  // Handle foreign key relationships
  if (attrName === 'userId' && entityConfig.relationships?.user) {
    const users = await db('users').select('id').limit(10)
    if (users.length > 0) {
      return users[index % users.length].id
    }
    return 1 // fallback to admin user
  }

  // Use default value if available
  if (config.default !== undefined) {
    return config.default
  }

  // Use enum values if available
  if (config.enum) {
    return config.enum[index % config.enum.length]
  }

  // Generate values based on type
  switch (config.type) {
    case 'string':
    case 'email':
    case 'url':
      if (attrName === 'orderNumber') {
        return `ORD-${Date.now()}-${index + 1}`
      } else if (attrName.toLowerCase().includes('name')) {
        return `Sample ${attrName} ${index + 1}`
      } else if (attrName.toLowerCase().includes('email')) {
        return `sample${index + 1}@example.com`
      } else if (attrName.toLowerCase().includes('url')) {
        return `https://example.com/sample${index + 1}`
      }
      return `Sample ${attrName} ${index + 1}`

    case 'text':
      return `This is a sample ${attrName.toLowerCase()} for record ${index + 1}. It contains some descriptive text.`

    case 'number':
      const min = config.min || 0
      const max = config.max || 1000
      return Math.floor(Math.random() * (max - min + 1)) + min

    case 'integer':
      const intMin = config.min || 1
      const intMax = config.max || 100
      return Math.floor(Math.random() * (intMax - intMin + 1)) + intMin

    case 'boolean':
      return Math.random() > 0.5

    case 'date':
    case 'datetime':
      const date = new Date()
      date.setDate(date.getDate() - Math.floor(Math.random() * 30))
      return date.toISOString()

    case 'json':
      return { sample: true, index: index + 1, data: `Sample JSON data ${index + 1}` }

    default:
      return `Sample value ${index + 1}`
  }
}

// CLI handling
if (require.main === module) {
  seedDatabase()
}

module.exports = { seedDatabase, seedAdminUser }