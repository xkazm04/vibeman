// Simple test script to verify the Annette API works
// Run this with: node test-api.js

const testLangGraphAPI = async () => {
  try {
    console.log('Testing LangGraph API...');
    
    const response = await fetch('http://localhost:3000/api/annette/langgraph', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'How many goals are in this project?',
        projectId: 'test-project-123'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ LangGraph API Response:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('✅ Test passed! LangGraph orchestrator is working.');
      console.log(`📝 Response: ${result.response}`);
      console.log(`🔧 Tools used: ${result.toolsUsed.length}`);
    } else {
      console.log('❌ Test failed:', result.error);
    }
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
};

const testGoalsAPI = async () => {
  try {
    console.log('Testing Goals API...');
    
    const response = await fetch('http://localhost:3000/api/goals?projectId=test-project-123');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Goals API Response:', JSON.stringify(result, null, 2));
    console.log(`📊 Found ${result.goals?.length || 0} goals`);
  } catch (error) {
    console.error('❌ Goals API error:', error.message);
  }
};

const testOllamaConnection = async () => {
  try {
    console.log('Testing Ollama connection...');
    
    const response = await fetch('http://localhost:11434/api/tags');
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Ollama is running');
    console.log(`📦 Available models: ${result.models?.length || 0}`);
    
    if (result.models) {
      result.models.forEach(model => {
        console.log(`  - ${model.name}`);
      });
    }
  } catch (error) {
    console.error('❌ Ollama connection error:', error.message);
    console.log('💡 Make sure Ollama is running on localhost:11434');
  }
};

// Run all tests
const runTests = async () => {
  console.log('🚀 Starting Annette API Tests\n');
  
  await testOllamaConnection();
  console.log('');
  
  await testGoalsAPI();
  console.log('');
  
  await testLangGraphAPI();
  
  console.log('\n✨ Tests completed!');
};

// Check if running in Node.js environment
if (typeof window === 'undefined') {
  runTests();
} else {
  console.log('This script should be run in Node.js, not in the browser.');
}