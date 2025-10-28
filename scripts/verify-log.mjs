import Database from 'better-sqlite3';

const db = new Database('C:\\Users\\kazda\\kiro\\vibeman\\database\\goals.db');

try {
  const row = db.prepare('SELECT * FROM implementation_log ORDER BY created_at DESC LIMIT 1').get();
  console.log('\n✓ Latest Implementation Log Entry:');
  console.log('  ID:', row.id);
  console.log('  Title:', row.title);
  console.log('  Requirement:', row.requirement_name);
  console.log('  Created:', row.created_at);
  console.log('  Tested:', row.tested ? 'Yes' : 'No');
  console.log('\n  Overview:');
  console.log('  ', row.overview.substring(0, 200) + '...');
} catch (error) {
  console.error('✗ Error:', error.message);
  process.exit(1);
} finally {
  db.close();
}
