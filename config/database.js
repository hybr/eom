const path = require('path')
require('dotenv').config()

const config = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'eom.db')
    },
    migrations: {
      directory: path.join(__dirname, '..', 'migrations')
    },
    seeds: {
      directory: path.join(__dirname, '..', 'seeds')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb)
      }
    }
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: process.env.TEST_DATABASE_URL || path.join(__dirname, '..', 'data', 'eom_test.db')
    },
    migrations: {
      directory: path.join(__dirname, '..', 'migrations')
    },
    useNullAsDefault: true,
    pool: {
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb)
      }
    }
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: process.env.DATABASE_URL || path.join(__dirname, '..', 'data', 'eom.db')
    },
    migrations: {
      directory: path.join(__dirname, '..', 'migrations')
    },
    useNullAsDefault: true,
    pool: {
      min: 1,
      max: 10,
      afterCreate: (conn, cb) => {
        conn.run('PRAGMA foreign_keys = ON', cb)
      }
    }
  }
}

module.exports = config[process.env.NODE_ENV || 'development']