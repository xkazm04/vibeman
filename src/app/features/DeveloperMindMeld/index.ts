/**
 * Developer Mind-Meld Feature
 * Personalized AI learning system that learns developer preferences
 */

// Components (client-side)
export { default as MindMeldToggle } from './components/MindMeldToggle';
export { default as LearningProgressCard } from './components/LearningProgressCard';
export { default as InsightsPanel } from './components/InsightsPanel';
export { default as PredictionBadge } from './components/PredictionBadge';

// NOTE: Library functions (mindMeldAnalyzer, consistencyChecker) are server-side only
// Import them directly in API routes and server components:
// import { recordDecision } from '@/app/features/DeveloperMindMeld/lib/mindMeldAnalyzer';
