/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('countries', function(table) {
    table.increments('id').primary()
    table.string('name', 100).notNullable()
    table.string('isoCode2', 2).notNullable().unique()
    table.string('isoCode3', 3).notNullable().unique()
    table.integer('continentId').notNullable().references('id').inTable('continents').onDelete('CASCADE')
    table.string('capitalCity', 100).notNullable()
    table.decimal('areaSqKm', 15, 2).notNullable()
    table.bigInteger('population').notNullable()
    table.string('currencyName', 100).nullable()
    table.string('currencyCode', 3).nullable()
    table.string('phoneCode', 10).nullable()
    table.text('officialLanguages').nullable()
    table.text('timezoneZones').nullable()
    table.enum('drivingSide', ['left', 'right']).notNullable().defaultTo('right')
    table.date('independenceDate').nullable()
    table.string('governmentType', 100).nullable()
    table.decimal('gdpNominal', 20, 2).nullable()
    table.string('internetDomain', 10).nullable()
    table.datetime('createdAt').notNullable()
    table.datetime('updatedAt').notNullable()

    // Indexes for performance
    table.index(['name'])
    table.index(['isoCode2'])
    table.index(['isoCode3'])
    table.index(['continentId'])
    table.index(['capitalCity'])
    table.index(['population'])
    table.index(['currencyCode'])

    // Unique constraint for name per continent
    table.unique(['name', 'continentId'])
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('countries')
};
