/**
 * Populate RSI handles for all existing users
 * - Users with existing RSI handles keep them
 * - Users without RSI handles get temporary ones based on their user ID
 */

exports.up = function (knex) {
  // Use PostgreSQL-compatible syntax for generating temporary usernames
  return knex.raw(`
    UPDATE users 
    SET rsi_handle = CASE 
      WHEN rsi_handle IS NOT NULL AND rsi_handle != '' THEN rsi_handle
      ELSE 'user_' || SUBSTRING(
        REPLACE(id::text, '-', ''), 1, 8
      )
    END
    WHERE rsi_handle IS NULL OR rsi_handle = '';
  `);
};

exports.down = function (knex) {
  // Revert by setting rsi_handle back to NULL for temporary handles
  return knex.raw(`
    UPDATE users 
    SET rsi_handle = NULL 
    WHERE rsi_handle LIKE 'user_%' AND LENGTH(rsi_handle) = 13;
  `);
};
