/**
 * Unit Tests for IntegrationErrorBoundary
 * 
 * Tests the error boundary component's core functionality:
 * - Error catching behavior
 * - Fallback rendering
 * - onError callback invocation
 * 
 * _Requirements: 4.5_
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { IntegrationErrorBoundary } from './IntegrationErrorBoundary';

// Mock console.error to prevent noise in test output
const originalConsoleError = console.error;

beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

describe('IntegrationErrorBoundary', () => {
  describe('getDerivedStateFromError', () => {
    it('should return hasError: true when an error occurs', () => {
      const testError = new Error('Test error');
      
      // Access the static method directly
      const result = IntegrationErrorBoundary.getDerivedStateFromError(testError);
      
      expect(result.hasError).toBe(true);
      expect(result.error).toBe(testError);
    });

    it('should capture the error object in state', () => {
      const testError = new Error('Specific error message');
      testError.name = 'CustomError';
      
      const result = IntegrationErrorBoundary.getDerivedStateFromError(testError);
      
      expect(result.error).toBe(testError);
      expect(result.error?.message).toBe('Specific error message');
      expect(result.error?.name).toBe('CustomError');
    });
  });

  describe('component behavior', () => {
    it('should have correct default props behavior', () => {
      // Test that the component can be instantiated with minimal props
      const props = {
        children: React.createElement('div', null, 'Test child'),
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      
      // Initial state should have no error
      expect(boundary.state.hasError).toBe(false);
      expect(boundary.state.error).toBe(null);
    });

    it('should render children when no error occurs', () => {
      const childElement = React.createElement('div', null, 'Test child');
      const props = {
        children: childElement,
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      
      // When no error, render should return children
      const result = boundary.render();
      expect(result).toBe(childElement);
    });

    it('should render null fallback by default when error occurs', () => {
      const props = {
        children: React.createElement('div', null, 'Test child'),
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      
      // Simulate error state
      boundary.state = {
        hasError: true,
        error: new Error('Test error'),
      };
      
      const result = boundary.render();
      expect(result).toBe(null);
    });

    it('should render custom fallback when provided and error occurs', () => {
      const fallbackElement = React.createElement('span', null, 'Error fallback');
      const props = {
        children: React.createElement('div', null, 'Test child'),
        fallback: fallbackElement,
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      
      // Simulate error state
      boundary.state = {
        hasError: true,
        error: new Error('Test error'),
      };
      
      const result = boundary.render();
      expect(result).toBe(fallbackElement);
    });
  });

  describe('componentDidCatch', () => {
    it('should call onError callback when provided', () => {
      const onErrorMock = vi.fn();
      const testError = new Error('Test error');
      const errorInfo: React.ErrorInfo = {
        componentStack: 'Test component stack',
        digest: undefined,
      };
      
      const props = {
        children: React.createElement('div', null, 'Test child'),
        onError: onErrorMock,
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      boundary.componentDidCatch(testError, errorInfo);
      
      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(testError, errorInfo);
    });

    it('should not throw when onError is not provided', () => {
      const testError = new Error('Test error');
      const errorInfo: React.ErrorInfo = {
        componentStack: 'Test component stack',
        digest: undefined,
      };
      
      const props = {
        children: React.createElement('div', null, 'Test child'),
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      
      // Should not throw
      expect(() => {
        boundary.componentDidCatch(testError, errorInfo);
      }).not.toThrow();
    });

    it('should log error in development mode', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testError = new Error('Test error');
      const errorInfo: React.ErrorInfo = {
        componentStack: 'Test component stack',
        digest: undefined,
      };
      
      const props = {
        children: React.createElement('div', null, 'Test child'),
        integrationName: 'test-integration',
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      boundary.componentDidCatch(testError, errorInfo);
      
      expect(console.error).toHaveBeenCalled();
      
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should include integration name in log when provided', () => {
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      const testError = new Error('Test error');
      const errorInfo: React.ErrorInfo = {
        componentStack: 'Test component stack',
        digest: undefined,
      };
      
      const props = {
        children: React.createElement('div', null, 'Test child'),
        integrationName: 'suggestion',
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      boundary.componentDidCatch(testError, errorInfo);
      
      // Check that console.error was called with integration name
      const errorCall = (console.error as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(errorCall[0]).toContain('suggestion');
      
      process.env.NODE_ENV = originalNodeEnv;
    });
  });

  describe('error state transitions', () => {
    it('should transition from no error to error state correctly', () => {
      const props = {
        children: React.createElement('div', null, 'Test child'),
      };
      
      const boundary = new IntegrationErrorBoundary(props);
      
      // Initial state
      expect(boundary.state.hasError).toBe(false);
      
      // After error
      const newState = IntegrationErrorBoundary.getDerivedStateFromError(
        new Error('Test')
      );
      boundary.state = newState;
      
      expect(boundary.state.hasError).toBe(true);
    });
  });
});
