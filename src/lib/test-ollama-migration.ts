/**
 * Test script to verify the universal Ollama client migration
 * Run this to ensure all systems are working correctly
 */

import { ollamaClient } from './ollama';

// Import eventDb only on server side
let eventDb: any = null;
if (typeof window === 'undefined') {
  eventDb = require('./eventDatabase').eventDb;
}

export async function testOllamaMigration() {
  console.log('🧪 Testing Universal Ollama Client Migration...\n');

  const testProjectId = 'migration-test';
  const results = {
    ollamaConnection: false,
    eventLogging: false,
    jsonParsing: false,
    progressTracking: false,
    errorHandling: false
  };

  try {
    // Test 1: Ollama Connection
    console.log('1️⃣ Testing Ollama connection...');
    const isAvailable = await ollamaClient.checkOllamaAvailability();
    results.ollamaConnection = isAvailable;
    console.log(`   ${isAvailable ? '✅' : '❌'} Ollama ${isAvailable ? 'is available' : 'is not available'}\n`);

    if (!isAvailable) {
      console.log('⚠️  Ollama is not running. Please start Ollama to continue tests.\n');
      return results;
    }

    // Test 2: Basic Generation with Event Logging
    console.log('2️⃣ Testing basic generation and event logging...');
    const beforeEventCount = eventDb ? eventDb.getEventsByProject(testProjectId).length : 0;
    
    const result = await ollamaClient.generate({
      prompt: 'Say "Hello from universal client!" and nothing else.',
      projectId: testProjectId,
      taskType: 'migration_test',
      taskDescription: 'Testing the universal Ollama client'
    });

    const afterEventCount = eventDb ? eventDb.getEventsByProject(testProjectId).length : 0;
    const eventsCreated = afterEventCount > beforeEventCount;
    
    results.eventLogging = eventsCreated && result.success;
    console.log(`   ${result.success ? '✅' : '❌'} Generation ${result.success ? 'successful' : 'failed'}`);
    console.log(`   ${eventsCreated ? '✅' : '❌'} Events ${eventsCreated ? 'logged correctly' : 'not logged'}`);
    
    if (result.success) {
      console.log(`   📝 Response: ${result.response?.substring(0, 50)}...`);
    } else {
      console.log(`   ❌ Error: ${result.error}`);
    }
    console.log();

    // Test 3: JSON Parsing
    console.log('3️⃣ Testing JSON parsing...');
    const jsonResult = await ollamaClient.generate({
      prompt: 'Return only this JSON: {"test": "success", "number": 42}',
      projectId: testProjectId,
      taskType: 'json_test',
      taskDescription: 'Testing JSON parsing'
    });

    if (jsonResult.success && jsonResult.response) {
      const parseResult = ollamaClient.parseJsonResponse(jsonResult.response);
      results.jsonParsing = parseResult.success && parseResult.data?.test === 'success';
      console.log(`   ${results.jsonParsing ? '✅' : '❌'} JSON parsing ${results.jsonParsing ? 'successful' : 'failed'}`);
      if (results.jsonParsing) {
        console.log(`   📊 Parsed data:`, parseResult.data);
      }
    } else {
      console.log(`   ❌ JSON test failed: ${jsonResult.error}`);
    }
    console.log();

    // Test 4: Progress Tracking
    console.log('4️⃣ Testing progress tracking...');
    const progressSteps: string[] = [];
    
    const progressResult = await ollamaClient.generate({
      prompt: 'Count from 1 to 5 and explain each number.',
      projectId: testProjectId,
      taskType: 'progress_test',
      taskDescription: 'Testing progress tracking'
    }, {
      onProgress: (progress, message) => {
        progressSteps.push(`${progress}%: ${message}`);
      }
    });

    results.progressTracking = progressSteps.length > 0 && progressResult.success;
    console.log(`   ${results.progressTracking ? '✅' : '❌'} Progress tracking ${results.progressTracking ? 'working' : 'not working'}`);
    console.log(`   📈 Progress steps captured: ${progressSteps.length}`);
    progressSteps.forEach(step => console.log(`      ${step}`));
    console.log();

    // Test 5: Error Handling
    console.log('5️⃣ Testing error handling...');
    const errorResult = await ollamaClient.generate({
      prompt: 'This is a test prompt',
      model: 'nonexistent-model-12345',
      projectId: testProjectId,
      taskType: 'error_test',
      taskDescription: 'Testing error handling'
    });

    results.errorHandling = !errorResult.success && !!errorResult.error;
    console.log(`   ${results.errorHandling ? '✅' : '❌'} Error handling ${results.errorHandling ? 'working' : 'not working'}`);
    if (errorResult.error) {
      console.log(`   🚨 Error captured: ${errorResult.error.substring(0, 100)}...`);
    }
    console.log();

  } catch (error) {
    console.error('❌ Test suite failed:', error);
  }

  // Summary
  console.log('📊 Test Results Summary:');
  console.log('========================');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });

  const passedTests = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Universal Ollama client migration is successful.');
  } else {
    console.log('⚠️  Some tests failed. Please check the issues above.');
  }

  // Clean up test events
  console.log('\n🧹 Cleaning up test events...');
  const deletedCount = eventDb ? eventDb.deleteEventsByProject(testProjectId) : 0;
  console.log(`   Deleted ${deletedCount} test events`);

  return results;
}

// Export for use in other files
export { ollamaClient };