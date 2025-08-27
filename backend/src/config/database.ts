import knex from 'knex';

// Use require for the knexfile since it's CommonJS
const path = require('path');
const knexConfig = require(path.join(__dirname, '../../knexfile.js'));

const environment = process.env.NODE_ENV || 'development';
const config = knexConfig[environment];

if (!config) {
  throw new Error(
    `Database configuration not found for environment: ${environment}`
  );
}

const db = knex(config);

export default db;
