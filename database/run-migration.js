const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Try different connection configurations
  const configs = [
    // Production config (with SSL)
    {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    },
    // Development config (without SSL)
    {
      connectionString: process.env.DATABASE_URL,
      ssl: false
    },
    // Local config fallback
    {
      host: 'localhost',
      port: 5432,
      database: process.env.DB_NAME || 'aictewcaching',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'password',
      ssl: false
    }
  ];

  let pool = null;
  let configUsed = null;

  // Try each config until one works
  for (const config of configs) {
    try {
      console.log('🔗 Attempting database connection...');
      pool = new Pool(config);
      await pool.query('SELECT NOW()'); // Test connection
      configUsed = config;
      console.log('✅ Database connected successfully!');
      break;
    } catch (error) {
      console.log('❌ Connection failed:', error.message);
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
    }
  }

  if (!pool) {
    console.error('❌ Could not connect to database with any configuration');
    console.log('ℹ️  Make sure DATABASE_URL is set or PostgreSQL is running locally');
    process.exit(1);
  }

  try {
    console.log('🔨 Running photo verification migration...');

    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'photo-verification-migration.sql'), 'utf8');

    // Split into individual statements (rough split on semicolon followed by newline)
    const statements = migrationSQL.split(';\n').filter(stmt => stmt.trim() !== '');

    for (const statement of statements) {
      const trimmedStatement = statement.trim();
      if (trimmedStatement) {
        try {
          await pool.query(trimmedStatement);
          console.log('✅ Executed:', trimmedStatement.substring(0, 60) + '...');
        } catch (error) {
          // Ignore "already exists" errors for idempotence
          if (error.message.includes('already exists') ||
              error.message.includes('duplicate key') ||
              error.message.includes('does not exist')) {
            console.log('ℹ️  Skipped (already exists):', trimmedStatement.substring(0, 60) + '...');
          } else {
            throw error;
          }
        }
      }
    }

    console.log('🎉 Migration completed successfully!');

    // Check if events were created
    const result = await pool.query('SELECT COUNT(*) FROM events');
    console.log(`📊 Total events in database: ${result.rows[0].count}`);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  runMigration();
}

module.exports = { runMigration };