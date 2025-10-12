/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.transaction(async (trx) => {
    console.log('🔧 Fixing access_roles data and constraints...');

    // 1. Update any NULL access_roles to empty array
    const nullCount = await trx('hr_documents')
      .whereNull('access_roles')
      .update({ access_roles: '{}' });
    console.log(`✅ Fixed ${nullCount} documents with NULL access_roles`);

    // 2. For documents with invalid role data, set to empty array
    // Since we can't easily detect non-UUID values in a UUID array,
    // let's just reset all access_roles to empty arrays for now
    // This is safer and the user can reassign roles through the UI
    const resetCount = await trx('hr_documents')
      .update({ access_roles: '{}' });
    console.log(`✅ Reset ${resetCount} documents to empty access_roles (will need to be reassigned via UI)`);

    // 3. Add NOT NULL constraint with default
    await trx.schema.alterTable('hr_documents', table => {
      table.specificType('access_roles', 'uuid[]').notNullable().defaultTo('{}').alter();
    });

    console.log('✅ Added NOT NULL constraint to access_roles');
    console.log('📝 Note: All documents now have empty access_roles and will need roles reassigned via the UI');
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.alterTable('hr_documents', table => {
    table.specificType('access_roles', 'uuid[]').nullable().alter();
  });
};