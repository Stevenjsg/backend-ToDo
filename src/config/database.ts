import { Pool } from 'pg';
import 'dotenv/config';

// Un "Pool" gestiona múltiples conexiones a la base de datos
// para que no tengas que abrir y cerrar una conexión en cada consulta.
//
// Si existe DATABASE_URL (recomendado en Supabase: usar la cadena del
// connection pooler / Supavisor) se usa esa. En caso contrario se arman los
// parámetros desde variables sueltas. Supabase exige TLS, por eso forzamos SSL.
const ssl = { rejectUnauthorized: false };

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
      max: Number(process.env.DB_POOL_MAX) || 10,
    })
  : new Pool({
      user: process.env.DB_USER,
      host: process.env.DB_HOST,
      database: process.env.DB_DATABASE,
      password: process.env.DB_PASSWORD,
      port: Number(process.env.DB_PORT),
      ssl,
      max: Number(process.env.DB_POOL_MAX) || 10,
    });

console.log('🐘 Conexión con PostgreSQL establecida.');