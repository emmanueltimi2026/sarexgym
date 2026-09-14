import pg from 'pg';
const { Pool } = pg;

export function createDatabase(connectionString, options = {}) {
  const sslMode=options.sslMode||'disable';
  const ssl=sslMode==='disable'?false:sslMode==='no-verify'?{rejectUnauthorized:false}:options.ca?{rejectUnauthorized:true,ca:options.ca}:{rejectUnauthorized:true};
  const pool = new Pool({ connectionString, ssl, max: options.max || 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 10_000, keepAlive:true });
  pool.on('error', error => console.error(JSON.stringify({ level: 'error', event: 'database_pool_error', message: error.message })));
  return {
    query: (text, params) => pool.query(text, params),
    async transaction(work, isolation = 'READ COMMITTED') {
      const client = await pool.connect();
      try {
        await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
        const result = await work(client);
        await client.query('COMMIT');
        return result;
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally { client.release(); }
    },
    close: () => pool.end()
  };
}
