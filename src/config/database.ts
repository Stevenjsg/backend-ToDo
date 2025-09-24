import { Pool } from 'pg';
import 'dotenv/config';

// Un "Pool" gestiona múltiples conexiones a la base de datos
// para que no tengas que abrir y cerrar una conexión en cada consulta.
export const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: Number(process.env.DB_PORT),
});

console.log('🐘 Conexión con PostgreSQL establecida.');