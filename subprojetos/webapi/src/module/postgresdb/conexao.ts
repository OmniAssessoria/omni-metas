import pkg from "pg";
import "dotenv/config";

const { Pool } = pkg;

declare global {
    var pgPoolGlobal: InstanceType<typeof Pool> | undefined;
}

const connectionString = `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
const pool = global.pgPoolGlobal || new Pool({
    connectionString: connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10, 
    idleTimeoutMillis: 5000,     
    connectionTimeoutMillis: 10000, 
    allowExitOnIdle: true,       
    maxUses: 1000                
});

if (process.env.NODE_ENV !== 'production') {
    global.pgPoolGlobal = pool;
}

pool.on('error', (err: Error) => {
    console.error('🚨 [PG Pool] Erro ocioso no cliente do Postgres:', err.message);
});

export default pool;