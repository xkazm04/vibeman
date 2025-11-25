import Database from 'better-sqlite3';

const db = new Database('C:\\Users\\kazda\\kiro\\vibeman\\database\\goals.db');

const testScenarioJson = JSON.stringify([
  { type: "navigate", url: "http://localhost:3000" },
  { type: "wait", delay: 3000 },
  { type: "click", selector: "[data-testid='nav-item-contexts']" },
  { type: "wait", delay: 2000 },
  { type: "click", selector: "[data-testid='add-context-btn']" },
  { type: "wait", delay: 1500 }
]);

console.log('Updating directly in database...');
console.log('Context ID: ctx_1763753774280_pp8l9io3y');
console.log('Test scenario:', testScenarioJson);

const stmt = db.prepare(`
  UPDATE contexts
  SET test_scenario = ?, updated_at = ?
  WHERE id = ?
`);

const result = stmt.run(testScenarioJson, new Date().toISOString(), 'ctx_1763753774280_pp8l9io3y');

console.log('Update result:', result);
console.log('Changes:', result.changes);

// Verify
const verifyStmt = db.prepare('SELECT id, name, test_scenario FROM contexts WHERE id = ?');
const updated = verifyStmt.get('ctx_1763753774280_pp8l9io3y');

console.log('\nVerification:');
console.log('Name:', updated.name);
console.log('Test scenario:', updated.test_scenario);
console.log('Length:', updated.test_scenario ? updated.test_scenario.length : 0);

db.close();
