/**
 * Debt Prediction & Prevention Feature
 * Exports all components and utilities for the predictive refactoring system
 */

// Main Layout
export { default as DebtPredictionLayout } from './DebtPredictionLayout';

// Components
export { default as DebtPredictionDashboard } from './components/DebtPredictionDashboard';
export { default as HealthScoreGauge } from './components/HealthScoreGauge';
export { default as OpportunityCard } from './components/OpportunityCard';
export { default as PredictionList } from './components/PredictionList';

// Engine & Utilities
export * from './lib/predictionEngine';
