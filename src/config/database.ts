// src/config/database.ts
import knex from 'knex';
import env from './env.config';

export const db = knex({
  client: 'mysql2',
  connection: {
    host: env.DB_HOST,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    charset: 'utf8mb4'
  },
  pool: { min: 0, max: 7 }
});

export default db;