import { Pool, types, defaults } from 'pg';

// Timestamps are stored in `timestamp without time zone` columns as UTC. By default pg
// reads and writes them in the server's local zone, which shifts every event time by
// 5h30m on a machine set to IST. Treat them as UTC in both directions.
const TIMESTAMP_OID = 1114;
types.setTypeParser(TIMESTAMP_OID, (value: string) => new Date(value.replace(' ', 'T') + 'Z'));
defaults.parseInputDatesAsUTC = true;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const query = async (text: string, params?: any[]) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (err) {
    console.error('Database Query Error:', err, text, params);
    throw err;
  }
};

const getClient = async () => {
  const client = await pool.connect();
  return client;
};

const db = { query, getClient };
export default db;
