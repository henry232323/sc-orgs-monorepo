exports.up = function (knex) {
  return knex.schema.alterTable('organizations', table => {
    table.string('discord');
    table.string('location');
    table.string('website');
    table.boolean('is_public').defaultTo(true);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('organizations', table => {
    table.dropColumn('discord');
    table.dropColumn('location');
    table.dropColumn('website');
    table.dropColumn('is_public');
  });
};
