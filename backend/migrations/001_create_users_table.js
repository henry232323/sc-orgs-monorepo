exports.up = function (knex) {
  return knex.schema.createTable('users', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('discord_id').unique().notNullable();
    table.string('discord_username').notNullable();
    table.string('discord_discriminator');
    table.string('discord_avatar');
    table.string('discord_email');
    table.string('rsi_handle').unique();
    table.string('spectrum_id').unique();
    table.boolean('is_rsi_verified').defaultTo(false);
    table.string('verification_code').unique();
    table.timestamp('verification_code_expires_at');
    table.boolean('is_active').defaultTo(true);
    table.timestamp('last_login_at');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index(['discord_id']);
    table.index(['rsi_handle']);
    table.index(['spectrum_id']);
    table.index(['is_rsi_verified']);
    table.index(['is_active']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('users');
};
