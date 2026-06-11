import { Pool } from 'pg';
import 'dotenv/config';

// Un "Pool" gestiona múltiples conexiones a la base de datos
// para que no tengas que abrir y cerrar una conexión en cada consulta.
//
// Si existe DATABASE_URL (recomendado en Supabase: usar la cadena del
// connection pooler / Supavisor) se usa esa. En caso contrario se arman los
// parámetros desde variables sueltas. Supabase exige TLS, por eso forzamos SSL.
//
// TLS (auditoría QA A-4): si DATABASE_CA_CERT contiene el certificado CA de
// Supabase (PEM, descargable en Dashboard → Settings → Database → SSL),
// validamos la cadena completa (rejectUnauthorized: true). Sin él se cifra
// igualmente pero sin validar el emisor — aceptable solo en desarrollo, por
// eso se avisa por consola en producción.
const caCert = process.env.DATABASE_CA_CERT;
const ssl = caCert
  ? { ca: caCert, rejectUnauthorized: true }
  : { rejectUnauthorized: false };

if (!caCert && process.env.NODE_ENV === 'production') {
  console.warn(
    '⚠️ TLS a la BD sin validar certificado (falta DATABASE_CA_CERT). ' +
      'Descarga el CA en Supabase → Settings → Database → SSL y configúralo.'
  );
}

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