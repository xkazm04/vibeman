/**
 * Unified Tech Debt Feature
 * Combines TechDebtRadar and DebtPrediction functionality
 *
 * Provides:
 * - Radar visualization with stats panel
 * - Health score gauge with trends
 * - Prediction and prevention system
 * - Opportunity cards for quick actions
 * - Plugin system for extensible scanning
 */

// Main Layout
export { default as TechDebtLayout } from './TechDebtLayout';

// Dashboard Components
export { default as TechDebtDashboard } from './components/TechDebtDashboard';

// Radar Components (from TechDebtRadar)
export { default as TechDebtCard } from './components/TechDebtCard';
export { default as TechDebtDetailModal } from './components/TechDebtDetailModal';
export { default as TechDebtStatsPanel } from './components/TechDebtStatsPanel';
export { default as PluginManager } from './components/PluginManager';

// Prediction Components (from DebtPrediction)
export { default as HealthScoreGauge } from './components/HealthScoreGauge';
export { default as OpportunityCard } from './components/OpportunityCard';
export { default as PredictionList } from './components/PredictionList';

// Note: Server-only functions (scanProjectForTechDebt, predictionEngine, etc.)
// are NOT exported here to avoid client-side bundling of database modules.
// Import directly from './lib/techDebtScanner', './lib/predictionEngine', etc. in API routes only.
//
// Safe to import in client code:
// - ./lib/riskScoring (only imports types)
// - ./lib/remediationPlanner (only imports types)
