import { NextRequest, NextResponse } from 'next/server';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const QUESTIONS_FILE = join(process.cwd(), 'data', 'test-questions.txt');

export async function GET() {
  try {
    const content = await readFile(QUESTIONS_FILE, 'utf-8');
    const questions = content.split('\n').filter(q => q.trim().length > 0);
    
    return NextResponse.json({
      success: true,
      questions
    });
  } catch (error) {
    console.error('Failed to read test questions:', error);
    
    // Return default questions if file doesn't exist
    return NextResponse.json({
      success: true,
      questions: [
        'What is artificial intelligence?',
        'How does machine learning work?',
        'Can you explain neural networks?',
        'Tell me about natural language processing',
        'Explain the difference between AI and machine learning'
      ]
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { questions } = await request.json();
    
    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { success: false, error: 'Questions must be an array' },
        { status: 400 }
      );
    }

    // Validate questions
    const validQuestions = questions
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one question is required' },
        { status: 400 }
      );
    }

    // Save to file
    const content = validQuestions.join('\n');
    await writeFile(QUESTIONS_FILE, content, 'utf-8');

    return NextResponse.json({
      success: true,
      questions: validQuestions,
      message: 'Questions saved successfully'
    });
  } catch (error) {
    console.error('Failed to save test questions:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save questions' },
      { status: 500 }
    );
  }
}
