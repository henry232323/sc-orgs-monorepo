exports.up = function (knex) {
  return knex.schema.alterTable('users', table => {
    // Rename discord_avatar to avatar_url to be more generic
    table.renameColumn('discord_avatar', 'avatar_url');
    
    // Add avatar source tracking
    table.enum('avatar_source', ['discord', 'spectrum', 'community_hub', 'default']).defaultTo('discord');
    
    // Add index for avatar source queries
    table.index(['avatar_source']);
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', table => {
    table.dropIndex(['avatar_source']);
    table.dropColumn('avatar_source');
    table.renameColumn('avatar_url', 'discord_avatar');
  });
};
