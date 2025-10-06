/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return Promise.all([
    // Create HR training events table
    knex.schema.createTable('hr_training_events', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('event_id').notNullable();
      table.uuid('organization_id').notNullable();
      table.enum('training_type', ['onboarding', 'skill_development', 'leadership', 'compliance']).notNullable();
      table.json('required_skills').defaultTo('[]');
      table.json('skill_categories').defaultTo('[]');
      table.boolean('completion_certificate').defaultTo(false);
      table.timestamps(true, true);

      // Foreign keys
      table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');
      table.foreign('organization_id').references('id').inTable('organizations').onDelete('CASCADE');

      // Indexes
      table.index(['organization_id', 'training_type']);
      table.index('event_id');
    }),

    // Create HR training event skills table
    knex.schema.createTable('hr_training_event_skills', function(table) {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('event_id').notNullable();
      table.json('skill_categories').defaultTo('[]');
      table.json('required_skills').defaultTo('[]');
      table.timestamps(true, true);

      // Foreign keys
      table.foreign('event_id').references('id').inTable('events').onDelete('CASCADE');

      // Indexes
      table.index('event_id');
    })
  ]);
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return Promise.all([
    knex.schema.dropTableIfExists('hr_training_event_skills'),
    knex.schema.dropTableIfExists('hr_training_events')
  ]);
};