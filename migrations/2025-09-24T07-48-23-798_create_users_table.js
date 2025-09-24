exports.up = function(knex) {
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
