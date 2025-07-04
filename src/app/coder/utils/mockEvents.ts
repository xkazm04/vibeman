import { EventLogEntry } from '../../../types';

export const generateMockEvent = (): EventLogEntry => {
  const types: EventLogEntry['type'][] = ['info', 'warning', 'error', 'success'];
  const titles = [
    'Component Analysis Started',
    'Code Optimization Complete',
    'Test Suite Executed',
    'Deployment Initiated',
    'Error Detected',
    'Performance Improved'
  ];
  const descriptions = [
    'Developer agent analyzing Button.tsx for optimization opportunities',
    'Mastermind agent coordinating cross-component refactoring',
    'Tester agent running comprehensive test coverage analysis',
    'Artist agent updating design system tokens',
    'Critical error in state management detected',
    'Successfully optimized render performance by 34%'
  ];
  
  return {
    id: Math.random().toString(36).substr(2, 9),
    title: titles[Math.floor(Math.random() * titles.length)],
    description: descriptions[Math.floor(Math.random() * descriptions.length)],
    type: types[Math.floor(Math.random() * types.length)],
    timestamp: new Date()
  };
}; 