/**
 * Vitest Global Setup
 * Runs before all tests to initialize the test database
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { setupTestDatabase, cleanupTestDatabase, closeTestDatabase, deleteTestDatabase } from './test-database';

// Global setup - runs once before all test files
beforeAll(() => {
  // Delete any existing test database to start fresh
  try {
    deleteTestDatabase();
  } catch {
    // Ignore errors if database doesn't exist
  }

  // Initialize the test database schema
  setupTestDatabase();

  console.log('Test database initialized');
});

// Global teardown - runs once after all test files
afterAll(() => {
  // Clean up any remaining test data
  try {
    cleanupTestDatabase();
  } catch {
    // Ignore cleanup errors
  }

  // Close the database connection
  closeTestDatabase();

  console.log('Test database cleaned up');
});
