import pkg from "pg";
import "dotenv/config";

const { Pool } = pkg;

// Montamos a string de conexão usando as variáveis do seu .env
// Formato: postgres://usuario:senha@host:porta/banco
const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const pool = new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false }
});

pool.on('error', (err) => {
    console.error('Erro inesperado no cliente do Postgres', err);
    process.exit(-1);
});

export default pool;