/**
 * Remove discord_username and discord_discriminator columns
 * We only need discord_id for authentication and rsi_handle for display
 */

exports.up = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.dropColumn('discord_username');
    table.dropColumn('discord_discriminator');
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', function (table) {
    table.string('discord_username');
    table.string('discord_discriminator');
  });
};
