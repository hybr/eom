const config = require('./config/database')

module.exports = {
  development: config,
  test: {
    ...config,
    connection: {
      filename: process.env.TEST_DATABASE_URL || './data/eom_test.db'
    }
  },
  production: config
}