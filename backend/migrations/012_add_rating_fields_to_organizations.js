exports.up = function (knex) {
  return knex.schema.alterTable('organizations', table => {
    table.decimal('average_rating', 3, 2).defaultTo(0); // 0.00 to 5.00
    table.integer('total_ratings').defaultTo(0);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('organizations', table => {
    table.dropColumn('average_rating');
    table.dropColumn('total_ratings');
  });
};
