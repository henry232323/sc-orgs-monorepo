const crypto = require('crypto');

/**
 * Generates a unique, deterministic username from a user ID
 * This is a copy of the function from utils/username.ts for use in migration
 */
function generateUsernameFromId(userId) {
  try {
    // Create a hash of the user ID for a shorter, deterministic result
    const hash = crypto.createHash('sha256').update(userId).digest('hex');
    
    // Take first 8 characters for readability while maintaining uniqueness
    const shortHash = hash.substring(0, 8);
    
    // Format as user_XXXXXXXX
    return `user_${shortHash}`;
  } catch (error) {
    // Fallback to a simple format if hashing fails
    const fallback = userId.replace(/-/g, '').substring(0, 8);
    return `user_${fallback}`;
  }
}

exports.up = async function (knex) {
  // This migration is no longer needed since discord_username column was removed
  // in migration 024_remove_discord_username.js
  // The functionality was replaced by using rsi_handle for display names
  console.log('Skipping username update migration - discord_username column no longer exists');
};

exports.down = async function (knex) {
  // This migration cannot be easily reversed since we don't store the original Discord usernames
  // The down migration would need to re-fetch Discord usernames, which is not practical
  console.log('Warning: This migration cannot be automatically reversed.');
  console.log('Original Discord usernames have been replaced with generated usernames.');
  console.log('To reverse, you would need to manually restore usernames or re-authenticate users.');
};