require('dotenv').config();
const { Pool } = require('pg');

async function checkTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check events table
    try {
      const eventsResult = await pool.query('SELECT COUNT(*) FROM events');
      console.log('✅ Events table exists with', eventsResult.rows[0].count, 'records');
    } catch (e) {
      console.log('❌ Events table does not exist');
    }

    // Check event_submissions table
    try {
      const submissionsResult = await pool.query('SELECT COUNT(*) FROM event_submissions');
      console.log('✅ Event_submissions table exists with', submissionsResult.rows[0].count, 'records');
    } catch (e) {
      console.log('❌ Event_submissions table does not exist');
    }

    // Check if the function exists
    try {
      await pool.query('SELECT update_updated_at_column()');
      console.log('✅ Function update_updated_at_column exists');
    } catch (e) {
      console.log('❌ Function does not exist, will create it');

      // Create the function manually
      await pool.query(`
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$ language 'plpgsql';
      `);

      // Create the trigger
      await pool.query(`
        CREATE TRIGGER update_events_updated_at
            BEFORE UPDATE ON events
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
      `);

      console.log('✅ Function and trigger created successfully');
    }

  } finally {
    await pool.end();
  }
}

checkTables().catch(console.error);