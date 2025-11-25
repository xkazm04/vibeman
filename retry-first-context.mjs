/**
 * Retry saving test scenario for Context - Creation & Generation
 */

const testScenarioSteps = [
  {
    type: "navigate",
    url: "http://localhost:3000"
  },
  {
    type: "wait",
    delay: 3000
  },
  {
    type: "click",
    selector: "[data-testid='nav-item-contexts']"
  },
  {
    type: "wait",
    delay: 2000
  },
  {
    type: "click",
    selector: "[data-testid='add-context-btn']"
  },
  {
    type: "wait",
    delay: 1500
  }
];

const testScenarioJson = JSON.stringify(testScenarioSteps);

console.log('Updating context: ctx_1763753774280_pp8l9io3y');
console.log('Test scenario JSON:',testScenarioJson);

async function updateContext() {
  try {
    const response = await fetch('http://localhost:3000/api/contexts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contextId: 'ctx_1763753774280_pp8l9io3y',
        updates: {
          test_scenario: testScenarioJson,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API error: ${errorData.error || response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Test scenario saved successfully!');
    console.log('Result:', result);
  } catch (error) {
    console.error('❌ Failed to save test scenario:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

updateContext();
