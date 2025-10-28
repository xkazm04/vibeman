'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle, RefreshCw } from 'lucide-react';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'warning';
  message: string;
  details?: any;
}

export default function TestStatus() {
  const [tests, setTests] = useState<TestResult[]>([
    { name: 'Ollama', status: 'pending', message: 'Checking...' },
    { name: 'Goals API', status: 'pending', message: 'Checking...' },
    { name: 'LangGraph', status: 'pending', message: 'Checking...' }
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    runTests();
  }, []);

  const runTests = async () => {
    setIsRefreshing(true);
    
    // Test 1: Ollama Connection
    try {
      const ollamaResponse = await fetch('http://localhost:11434/api/tags');
      if (ollamaResponse.ok) {
        const models = await ollamaResponse.json();
        updateTest('Ollama', 'success', `${models.models?.length || 0} models`);
      } else {
        updateTest('Ollama', 'error', 'Not responding');
      }
    } catch (error) {
      updateTest('Ollama', 'error', 'Not running');
    }

    // Test 2: Goals API
    try {
      const goalsResponse = await fetch('/api/goals?projectId=test-project-123');
      if (goalsResponse.ok) {
        const goalsData = await goalsResponse.json();
        updateTest('Goals API', 'success', `${goalsData.goals?.length || 0} goals`);
      } else {
        updateTest('Goals API', 'warning', 'No data');
      }
    } catch (error) {
      updateTest('Goals API', 'error', 'Not accessible');
    }

    // Test 3: LangGraph Orchestrator
    try {
      const langGraphResponse = await fetch('/api/annette/langgraph', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Test message',
          projectId: 'test-project-123'
        })
      });
      
      if (langGraphResponse.ok) {
        updateTest('LangGraph', 'success', 'Working');
      } else {
        updateTest('LangGraph', 'error', 'Failed');
      }
    } catch (error) {
      updateTest('LangGraph', 'error', 'Not accessible');
    }
    
    setIsRefreshing(false);
  };

  const updateTest = (name: string, status: TestResult['status'], message: string, details?: any) => {
    setTests(prev => prev.map(test => 
      test.name === name ? { ...test, status, message, details } : test
    ));
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-400" />;
      case 'warning':
        return <AlertCircle className="w-3 h-3 text-yellow-400" />;
      default:
        return <Clock className="w-3 h-3 text-gray-400 animate-spin" />;
    }
  };

  const getStatusDot = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'bg-green-400';
      case 'error':
        return 'bg-red-400';
      case 'warning':
        return 'bg-yellow-400';
      default:
        return 'bg-gray-400 animate-pulse';
    }
  };

  return (
    <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-300">System Status</h3>
        <button
          onClick={runTests}
          disabled={isRefreshing}
          className="p-1 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`w-3 h-3 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
      
      <div className="space-y-2">
        {tests.map((test) => (
          <div key={test.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${getStatusDot(test.status)}`} />
              <span className="text-gray-300">{test.name}</span>
            </div>
            <span className="text-gray-500">{test.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}