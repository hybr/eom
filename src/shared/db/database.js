const knex = require('knex')
const config = require('../../../config/database')
const logger = require('../logging/logger')

let db = null

const initializeDatabase = async () => {
  try {
    db = knex(config)

    // Test connection
    await db.raw('SELECT 1')
    logger.info('Database connection established successfully')

    return db
  } catch (error) {
    logger.error('Failed to connect to database:', error)
    throw error
  }
}

const getDatabase = () => {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.')
  }
  return db
}

const closeDatabase = async () => {
  if (db) {
    await db.destroy()
    db = null
    logger.info('Database connection closed')
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  await closeDatabase()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  await closeDatabase()
  process.exit(0)
})

module.exports = {
  initializeDatabase,
  getDatabase,
  closeDatabase
}