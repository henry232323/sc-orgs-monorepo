const path = require('path');
require('dotenv').config();

// PostgreSQL-only configuration
const getPostgreSQLConfig = (env) => {
  const dbUrl = env === 'test' 
    ? process.env.TEST_DATABASE_URL 
    : process.env.DATABASE_URL;
    
  if (dbUrl) {
    return {
      client: 'pg',
      connection: dbUrl,
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: path.join(__dirname, 'migrations'),
      },
      seeds: {
        directory: path.join(__dirname, 'seeds'),
      },
    };
  } else {
    return {
      client: 'pg',
      connection: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'sc_orgs_user',
        password: process.env.DB_PASSWORD || 'secure_password',
        database: env === 'test' 
          ? (process.env.TEST_DB_NAME || 'sc_orgs_test')
          : (process.env.DB_NAME || 'sc_orgs_dev'),
      },
      pool: {
        min: 2,
        max: 10
      },
      migrations: {
        directory: path.join(__dirname, 'migrations'),
      },
      seeds: {
        directory: path.join(__dirname, 'seeds'),
      },
    };
  }
};

module.exports = {
  development: getPostgreSQLConfig('development'),
  test: getPostgreSQLConfig('test'),
  production: {
    client: 'pg',
    connection: process.env.DATABASE_URL,
    pool: {
      min: 2,
      max: 20
    },
    migrations: {
      directory: path.join(__dirname, 'migrations'),
    },
    seeds: {
      directory: path.join(__dirname, 'seeds'),
    },
  },
};