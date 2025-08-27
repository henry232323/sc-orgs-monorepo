/**
 * Create corroboration tables for enhanced reporting system
 * These tables store corroborations (support/dispute/neutral) for organization, alt account, and affiliated people reports
 */

exports.up = function (knex) {
  // Organization report corroborations
  return knex.schema.createTable('organization_report_corroborations', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('report_id').references('id').inTable('organization_reports').onDelete('CASCADE');
    table.uuid('corroborator_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('corroboration_type').notNullable(); // 'agree', 'disagree', 'neutral'
    table.text('comment'); // Optional comment
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Unique constraint to prevent duplicate corroborations
    table.unique(['report_id', 'corroborator_id']);

    // Indexes for performance
    table.index(['report_id']);
    table.index(['corroborator_id']);
    table.index(['corroboration_type']);
  }).then(() => {
    // Alt account report corroborations
    return knex.schema.createTable('alt_account_report_corroborations', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('report_id').references('id').inTable('alt_account_reports').onDelete('CASCADE');
      table.uuid('corroborator_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('corroboration_type').notNullable(); // 'agree', 'disagree', 'neutral'
      table.text('comment'); // Optional comment
      table.timestamp('created_at').defaultTo(knex.fn.now());

      // Unique constraint to prevent duplicate corroborations
      table.unique(['report_id', 'corroborator_id']);

      // Indexes for performance
      table.index(['report_id']);
      table.index(['corroborator_id']);
      table.index(['corroboration_type']);
    });
  }).then(() => {
    // Affiliated people report corroborations
    return knex.schema.createTable('affiliated_people_report_corroborations', table => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.uuid('report_id').references('id').inTable('affiliated_people_reports').onDelete('CASCADE');
      table.uuid('corroborator_id').references('id').inTable('users').onDelete('CASCADE');
      table.string('corroboration_type').notNullable(); // 'agree', 'disagree', 'neutral'
      table.text('comment'); // Optional comment
      table.timestamp('created_at').defaultTo(knex.fn.now());

      // Unique constraint to prevent duplicate corroborations
      table.unique(['report_id', 'corroborator_id']);

      // Indexes for performance
      table.index(['report_id']);
      table.index(['corroborator_id']);
      table.index(['corroboration_type']);
    });
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable('affiliated_people_report_corroborations')
    .then(() => knex.schema.dropTable('alt_account_report_corroborations'))
    .then(() => knex.schema.dropTable('organization_report_corroborations'));
};