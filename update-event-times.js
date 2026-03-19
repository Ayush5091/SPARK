const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_d7UlwRMxIu8S@ep-steep-meadow-adgefvg3-pooler.c-2.us-east-1.aws.neon.tech/aicte?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function updateEventTimes() {
  try {
    const now = new Date();
    const startTime = new Date(now.getTime() - 30 * 60 * 1000); // Started 30 minutes ago
    const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // Ends in 3 hours

    const result = await pool.query(`
      UPDATE events
      SET start_time = $1,
          end_time = $2,
          status = 'active'
      WHERE name LIKE 'Testing Event%'
      RETURNING id, name, start_time, end_time
    `, [startTime.toISOString(), endTime.toISOString()]);

    console.log('Events updated successfully:');
    result.rows.forEach(row => {
      console.log(`- Event ${row.id}: ${row.name}`);
      console.log(`  Start: ${new Date(row.start_time).toLocaleString()}`);
      console.log(`  End: ${new Date(row.end_time).toLocaleString()}`);
    });

    console.log('\n✅ Events are now ACTIVE and ready for photo submissions!');
  } catch (error) {
    console.error('Error updating events:', error);
  } finally {
    await pool.end();
  }
}

updateEventTimes();