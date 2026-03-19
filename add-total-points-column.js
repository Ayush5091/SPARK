const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_d7UlwRMxIu8S@ep-steep-meadow-adgefvg3-pooler.c-2.us-east-1.aws.neon.tech/aicte?sslmode=require',
  ssl: {
    rejectUnauthorized: false
  }
});

async function addTotalPointsColumn() {
  try {
    console.log('🔧 Adding total_points column to students table...');

    // Add the total_points column
    await pool.query(`
      ALTER TABLE students
      ADD COLUMN IF NOT EXISTS total_points INTEGER DEFAULT 0
    `);

    console.log('✅ total_points column added successfully');

    // Update existing students to calculate their current points from submissions
    console.log('📊 Calculating existing points from submissions...');

    const result = await pool.query(`
      UPDATE students
      SET total_points = COALESCE((
        SELECT SUM(e.points)
        FROM event_submissions es
        JOIN events e ON es.event_id = e.id
        WHERE es.student_id = students.id
        AND es.status = 'verified'
      ), 0)
    `);

    console.log(`📈 Updated ${result.rowCount} student records with calculated points`);

    // Show updated student points
    const studentsResult = await pool.query(`
      SELECT id, name, total_points
      FROM students
      ORDER BY total_points DESC
    `);

    console.log('🎯 Current student points:');
    studentsResult.rows.forEach(student => {
      console.log(`- ${student.name}: ${student.total_points} points`);
    });

    console.log('\n✅ Database migration completed successfully!');
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    await pool.end();
  }
}

addTotalPointsColumn();