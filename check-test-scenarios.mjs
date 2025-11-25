import Database from 'better-sqlite3';

const db = new Database('C:\\Users\\kazda\\kiro\\vibeman\\database\\goals.db');

const contexts = db.prepare(`
  SELECT id, name, test_scenario
  FROM contexts
  WHERE id IN ('ctx_1763753774280_pp8l9io3y', 'ctx_1763753774285_3u2vvbnqf')
`).all();

console.log('Found contexts:', contexts.length);
console.log('');

contexts.forEach(ctx => {
  console.log(`Context: ${ctx.name}`);
  console.log(`ID: ${ctx.id}`);
  console.log(`test_scenario type: ${typeof ctx.test_scenario}`);
  console.log(`test_scenario value: ${ctx.test_scenario}`);
  console.log(`test_scenario length: ${ctx.test_scenario ? ctx.test_scenario.length : 0}`);
  console.log('');
});

db.close();
