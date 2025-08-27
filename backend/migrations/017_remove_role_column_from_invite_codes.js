exports.up = function (knex) {
  return knex.schema.alterTable('invite_codes', table => {
    table.dropColumn('role');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('invite_codes', table => {
    table.string('role').defaultTo('member');
  });
};