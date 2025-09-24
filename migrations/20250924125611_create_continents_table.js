/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('continents', function(table) {
    table.increments('id').primary()
    table.string('name', 100).notNullable().unique()
    table.string('code', 3).notNullable().unique()
    table.decimal('areaSqKm', 15, 2).notNullable()
    table.bigInteger('population').notNullable()
    table.integer('numberOfCountries').notNullable().defaultTo(0)
    table.string('largestCountry', 100).nullable()
    table.string('smallestCountry', 100).nullable()
    table.string('highestPoint', 100).nullable()
    table.decimal('highestPointElevation', 10, 2).nullable()
    table.string('lowestPoint', 100).nullable()
    table.decimal('lowestPointElevation', 10, 2).nullable()
    table.text('timezoneZones').nullable()
    table.text('languagesMajor').nullable()
    table.datetime('createdAt').notNullable()
    table.datetime('updatedAt').notNullable()

    table.index(['name'])
    table.index(['code'])
    table.index(['areaSqKm'])
    table.index(['population'])
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('continents')
};
