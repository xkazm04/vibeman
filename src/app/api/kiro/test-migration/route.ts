import { NextRequest, NextResponse } from 'next/server';
import { testOllamaMigration } from '@/lib/test-ollama-migration';

export async function POST(request: NextRequest) {
  try {
    console.log('Running Ollama migration test suite...');
    
    const results = await testOllamaMigration();
    
    const passedTests = Object.values(results).filter(Boolean).length;
    const totalTests = Object.keys(results).length;
    const allPassed = passedTests === totalTests;
    
    return NextResponse.json({
      success: true,
      message: allPassed 
        ? 'All tests passed! Universal Ollama client migration is successful.'
        : 'Some tests failed. Check the console for details.',
      results,
      summary: {
        passed: passedTests,
        total: totalTests,
        allPassed
      }
    });
  } catch (error) {
    console.error('Migration test failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Migration test suite failed to run'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Universal Ollama Client Migration Test Suite',
    description: 'POST to this endpoint to run the complete migration test suite',
    tests: [
      'Ollama connection check',
      'Basic generation and event logging',
      'JSON response parsing',
      'Progress tracking callbacks',
      'Error handling'
    ]
  });
}