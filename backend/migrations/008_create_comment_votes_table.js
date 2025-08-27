exports.up = function (knex) {
  return knex.schema.createTable('comment_votes', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table
      .uuid('comment_id')
      .references('id')
      .inTable('comments')
      .onDelete('CASCADE');
    table.uuid('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.enum('vote_type', ['upvote', 'downvote']).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Unique constraint to prevent multiple votes from same user per comment
    table.unique(['comment_id', 'user_id']);

    // Indexes for performance
    table.index(['comment_id']);
    table.index(['user_id']);
    table.index(['vote_type']);
    table.index(['created_at']);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('comment_votes');
};
