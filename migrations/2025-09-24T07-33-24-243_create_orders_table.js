exports.up = function(knex) {
  return knex.schema.createTable('orders', function(table) {
    table.increments('id').primary().notNullable()
    table.integer('userId').notNullable()
    table.string('orderNumber', 50).notNullable().unique()
    table.string('status', 255).notNullable().defaultTo('pending')
    table.decimal('total', 10, 2).notNullable()
    table.decimal('subtotal', 10, 2).notNullable()
    table.decimal('tax', 10, 2).notNullable().defaultTo(0)
    table.decimal('shipping', 10, 2).notNullable().defaultTo(0)
    table.text('shippingAddress').notNullable()
    table.text('billingAddress').notNullable()
    table.text('notes').nullable()
    table.datetime('orderDate').notNullable()
    table.datetime('shippedDate').nullable()
    table.datetime('deliveredDate').nullable()
    table.datetime('createdAt').notNullable()
    table.datetime('updatedAt').notNullable()
    table.foreign('userId').references('id').inTable('users')
  })
}

exports.down = function(knex) {
  return knex.schema.dropTable('orders')
}
